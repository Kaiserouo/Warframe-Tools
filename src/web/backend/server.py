import operator
import threading
import uuid
from flask import Flask, render_template, request, Response
import datetime
import dataclasses
from pathlib import Path
import os
import time
import uuid
import concurrent

from ... import warframe_market as wfm
from ... import interactive as wfi
from ... import util as util

app = Flask(__name__)

BUILD_DIR = Path('./web/frontend/build/')
HOST, PORT = 'localhost', 5000

# wfm.RETRY_MAX_TIME = 3    # reduce retry time for better responsiveness
#                           # (note that we effective use single thread here, because of Cyphon GIL and lack of `multiprocessing`)

market_lock = threading.Lock()   # ok ngl i don't really know why i added this but better safe than sorry
market_items = None
market_map = None
market_id_map = None
market_data_update_date = None
cache = {}

# args, kwargs is passed to price oracle functions
# for now, kwargs = stat_filter
oracle_prince_fn_map = {
    'default_oracle_price_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_oracle_price_48hrs(*args, **kwargs),
    'top_30%_avg_in_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_top_k_avg_price_for_last_hours(48, 0.3, *args, **kwargs),
    'bottom_30%_avg_in_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_bottom_k_avg_price_for_last_hours(48, 0.3, *args, **kwargs),
    'cur_lowest_price': lambda price_oracle, *args, **kwargs: price_oracle.get_cur_lowest_price(*args, **kwargs),
}

def refresh():
    global market_items, market_map, market_id_map, market_data_update_date, cache
    market_items = wfm.get_market_item_list()
    market_map = wfm.get_market_items_name_map(market_items)
    market_id_map = wfm.get_market_items_id_map(market_items)
    market_data_update_date = datetime.datetime.now()
    cache = {}

def use(name, callback):
    """
    react style use
    """
    if name not in cache:
        cache[name] = callback()
    return cache[name]


"""
Task management
"""

executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
task_pool = {}
stop_obj_pool = {}

def register_task(task_callback):
    """
    Registers a task for execution and returns its ID.
    The task callback should be:
        def task(task_id, task_status, stop_obj):
            ...
    where task_id is a string of the current task, and task_status is a dict that can be updated to reflect progress,
    and stop_obj is a dict of {'stop': bool} that indicates whether the task should stop.
    note that you should modify task_status in-place
    the given status would look like:
    {
        'status': 'in_progress' | 'done' | 'error',   // current task status
        'total': int,       // progress bar total steps
        'current': int,     // progress bar current steps
        'data': any | None  // only useful when status is 'done')
        'error': any | None // only useful when status is 'error'
    }
    you should guarentee that:
    - when status is 'done', data should be set
    - when status is 'error', error should be set
    - when status is 'in_progress', total and current should be set properly

    if, during the task, you find that stop_obj['stop'] is True, you should terminate the task ASAP and call task_stop(task_id)
    """
    task_id = str(uuid.uuid4())
    task_status = {
        'status': 'in_progress',
        'total': 0,
        'current': 0,
        'data': None,
        'error': None
    }
    stop_obj = {'stop': False}
    task_pool[task_id] = task_status
    stop_obj_pool[task_id] = stop_obj
    def task_wrapper():
        try:
            task_callback(task_id, task_status, stop_obj)
        except Exception as e:
            task_status['error'] = str(e)
            task_status['status'] = 'error'
    executor.submit(task_wrapper)
    return task_id

@app.route("/api/progress/<task_id>")
def progress(task_id):
    status = task_pool.get(task_id)
    if status is None:
        return {"error": "invalid task id"}, 404
    if status['status'] == 'done' or status['status'] == 'error':
        # remove from pool
        task_pool.pop(task_id)
    return status

@app.route("/api/progress_stop/<task_id>")
def progress_stop(task_id):
    status = task_pool.get(task_id)
    if status is None:
        return {"error": "invalid task id"}, 404
    stop_obj = stop_obj_pool.get(task_id)
    if stop_obj is not None:
        stop_obj['stop'] = True
    return {}

def task_stop(task_id):
    task_pool.pop(task_id, None)
    stop_obj_pool.pop(task_id, None)

def task_prepare_market_items(task_status, stop_obj, market_item_names):
    """
    prepares the given market items, will update task_status in-place
    can only be called in a task
    will only set and update total and current! other fields are not modified

    Args:
        task_status: dict to update progress status
        market_item_names: list of item names to prepare
    Return:
        None
    """
    print(f'{util.CYAN}Preparing market items: {util.GREEN}{market_item_names}{util.RESET}')
    total = len(market_item_names)
    task_status['total'] = total
    task_status['current'] = 0
    for item_name in market_item_names:
        print(f'{util.CYAN}{task_status["current"]}/{total} getting lock {util.RESET}')
        with market_lock:
            print(f'{util.CYAN}{task_status["current"]}/{total} got lock, preparing {util.RESET}')
            item = market_map.get(item_name)
            if item is not None and item.price is None:
                item.prepare()
        print(f'{util.CYAN}{task_status["current"]}/{total}{util.RESET}')
        if stop_obj['stop']:
            break
        task_status['current'] += 1
    return 


# --------------------

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def get_resource(path):  # pragma: no cover
    mimetypes = {
        ".css": "text/css",
        ".html": "text/html",
        ".js": "application/javascript",
    }
    complete_path = BUILD_DIR / path
    resolved_path = complete_path.resolve()
    
    # Ensure the resolved path is within BUILD_DIR
    try:
        resolved_path.relative_to(BUILD_DIR.resolve())
    except ValueError:
        return Response("Not Found", status=404)
    
    if resolved_path.is_dir():
        complete_path = resolved_path / 'index.html'
    else:
        complete_path = resolved_path
    
    ext = Path(path).suffix
    mimetype = mimetypes.get(ext, "text/html")
    content = complete_path.read_bytes() if complete_path.exists() else (BUILD_DIR / 'index.html').read_bytes()
    return Response(content, mimetype=mimetype)

@app.route('/api/get_market_data')
def get_market_data():
    """
    Returns market data without orders and statistics.
    nonblocking

    returns:
    {
        'market_data': {
            item_name: {
                'item_id': str,
                'item_name': str,
                'item_type': str,
                ...
            },
            ...
        },
        'last_update': str (ISO format) or None
    }
    """
    with market_lock:
        return {
            'market_data': {
                item_name: {k: v for k, v in dataclasses.asdict(item).items() if k not in ['orders', 'statistic', 'price']}
                for item_name, item in market_map.items()
            },
            'last_update': market_data_update_date.isoformat() if market_data_update_date else None
        }

@app.route('/api/refresh_all_data')
def refresh_all_data():
    """
    Refreshes all market data.
    """
    with market_lock:
        refresh()
    return {}

@app.route('/api/price_oracle', methods=['POST'])
def price_oracle():
    """
    Given a list of item names, returns their price oracle values.
    Task API: nonblocking but should poll from /api/progress/${task_id} to get the result

    request json:
    {
        "oracle_type": str,
        "item_names": [str, ...],
    }
    
    returns:
    {
        item_name: oracle_value or None,
        ...
    }
    """

    data = request.json
    item_names = data.get('item_names')

    prepare_item_names = [item_name for item_name in item_names if item_name in market_map and market_map[item_name].price is None]

    def task(task_id, task_status, stop_obj):
        task_prepare_market_items(task_status, stop_obj, prepare_item_names)
        if stop_obj['stop']:
            task_stop(task_id)
            return
        with market_lock:
            task_status['data'] = {
                item_name: oracle_prince_fn_map[data['oracle_type']](market_map[item_name].price) if item_name in market_map else None
                for item_name in item_names
            }
        task_status['status'] = 'done'

    task_id = register_task(task)
    return {'task_id': task_id}

@app.route('/api/item_infobox', methods=['POST'])
def item_infobox():
    """
    Given an item name, returns its data that should be shown in an infobox.
    Blocking API

    request json:
    {
        "oracle_type": str,
        "item_name": str
    }
    
    returns:
    {
        item_name: oracle_value or None,
        ...
    }

    if item name not found, returns error message
    """

    data = request.json
    item_name = data.get('item_name')

    # do prepare
    if item_name not in market_map:
        return {}
    
    with market_lock:
        item = market_map[item_name]
        if item.price is None:
            wfm.prepare_market_items([item])

    return {
        'item_name': item_name,
        'thumb_url': item.get_thumbnail_url(),
        'icon_url': item.get_icon_url(),
        'type': wfi.resolve_item_type(item, default=None),

        'oracle_price': oracle_prince_fn_map[data['oracle_type']](item.price),
        'cur_lowest_sell_price': item.orders.get_ingame_lowest_sell_price(),

        '48h_volume': item.statistic.get_volume_for_last_hours(48),
        '90d_volume': item.statistic.get_volume_for_last_days(90),

        'wiki_link': item.wiki_link,
        'market_link': item.get_wfm_url(),

        'last_update': item.prepare_datetime.isoformat() if item.prepare_datetime else None,
    }

@app.route('/api/relic_data')
def relic_data():
    """
    Gets all relic data available

    returns:
    {
        "relics": {
            relic_name: {   # e.g., 'Lith A1'
                'Common': list[item_name: str],
                'Uncommon': [...],
                'Rare': [...]
            },
            ...
        },
        "varzia_relics": list[relic_name: str]
    }
    """
    def _get_relic_data():
        return {
            "relics": wfm.get_relic_data(discard_forma=False),
            "varzia_relics": wfm.get_varzia_relics()
        }
    return use('relic_data', _get_relic_data)

@app.route('/api/syndicate_data')
def syndicate_data():
    """
    Gets all syndicate data available

    returns:
    {
        syndicate_name: list[item names]
    }
    """
    def _get_syndicate_data():
        with market_lock:
            syndicate_items = wfm.get_all_syndicate_items(market_map=market_map)
            return {
                syndicate_name: [item.item_name for item in items]
                for syndicate_name, items in syndicate_items.items()
            }
    return use('syndicate_data', _get_syndicate_data)

@app.route('/api/transient_data')
def transient_reward_data():
    """
    Gets all transient reward data available

    returns:
    {
        transient_name: list[item names]
    }
    """
    def _get_transient_data():
        transient_items = wfm.get_transient_mission_rewards()
        transient_rewards = {}
        with market_lock:
            for transient_name, transient_rotations in transient_items.items():
                rewards = []
                for rotation, rotation_rewards in transient_rotations.items():
                    rewards.extend([r['item_name'] for r in rotation_rewards if r['item_name'] in market_map])
                transient_rewards[transient_name] = rewards
        return transient_rewards
    print(use('transient_data', _get_transient_data))
    return use('transient_data', _get_transient_data)

def get_function_item_format(market_item_ls, oracle_type):
    with market_lock:
        item_info = wfi.get_item_info(market_item_ls, do_prepare=False, oracle_price_fn=oracle_prince_fn_map[oracle_type])
    name_ls, type_ls, plat_ls, rmax_plat_div21_ls, rmax_plat_ls, plat_times21_ls, vol_ls, url_ls = operator.itemgetter(
        'name', 'type', 'plat', 'rmax_plat_div21', 'rmax_plat', 'plat_times21', 'vol', 'url'
    )(item_info)

    return {
        "headers": [
            {"name": 'Name', "type": "item_name"},
            {"name": 'Type', "type": "string"},
            {"name": 'Plat\n(48hr)', "type": "float"},
            {"name": 'RMP/21\n(Arcane)', "type": "float"},
            {"name": 'R.Max Plat\n(48hr)', "type": "float"},
            {"name": 'P*21\n(Arcane)', "type": "float"},
            {"name": 'Volume\n(48hr)', "type": "integer"},
            {"name": 'WFM URL', "type": "url"},
            {"name": 'Wiki', "type": "url"},
        ],
        "items": [
            [
                name_ls[i],
                type_ls[i],
                plat_ls[i],
                rmax_plat_div21_ls[i],
                rmax_plat_ls[i],
                plat_times21_ls[i],
                vol_ls[i],
                url_ls[i],
                market_item_ls[i].wiki_link
            ]
            for i in range(len(name_ls))
        ]
    }

@app.route('/api/function_item', methods=['POST'])
def function_item():
    """
    Given a list of item names, returns their price oracle values.
    Task API: nonblocking but should poll from /api/progress/${task_id} to get the result

    request json:
    {
        "oracle_type": str,
        
        "search_text": str | None,
        "item_list": [str, ...] | None,
    }

    only one of search_text and item_list is required
    
    returns: ItemTable format

    # TODO: cache oracle price?
    """

    data = request.json
    search_text = data.get('search_text')
    item_list = data.get('item_list')

    if search_text is not None and item_list is not None:
        return f"Only one of search_text and item_list should be provided. Provided {data}", 400

    if item_list is not None:
        market_item_ls = [
            market_map[item_name]
            for item_name in item_list
            if item_name in market_map
        ]
    elif search_text is not None:
        market_item_ls = [
            market_map[item_name]
            for item_name in market_map
            if search_text.lower().strip() in item_name.lower()
        ]
    else:
        market_item_ls = []
    print(market_item_ls)

    # prepare only the necessary ones
    if len(market_item_ls) > 200:
        print("Warning: function_item returning more than 200 items:", len(market_item_ls))
        print("data:", data)
    if len(market_item_ls) > 1000:
        print("Warning: function_item returning more than 1000 items, abort:", len(market_item_ls))
        print("data:", data)
        return {"error": "Too many items matched. Please narrow down your search."}, 400
    
    def task(task_id, task_status, stop_obj):
        task_prepare_market_items(task_status, stop_obj, [item.item_name for item in market_item_ls if item.price is None])    
        if stop_obj['stop']:
            task_stop(task_id)
            return
        task_status['data'] = get_function_item_format(market_item_ls, data['oracle_type'])
        task_status['status'] = 'done'

    task_id = register_task(task)
    return {'task_id': task_id}

if __name__ == '__main__':
    refresh()
    app.run(debug=True, host=HOST, port=PORT)