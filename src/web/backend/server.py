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

from ... import warframe_market as wfm
from ... import interactive as wfi

app = Flask(__name__)

BUILD_DIR = Path('./web/frontend/build/')
HOST, PORT = 'localhost', 5000

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

# --------------------

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
    refresh()
    return {}

@app.route('/api/price_oracle', methods=['POST'])
def price_oracle():
    """
    Given a list of item names, returns their price oracle values.

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

    # TODO: cache oracle price?
    """

    data = request.json
    item_names = data.get('item_names')

    wfm.PriceOracle.get_oracle_price_48hrs

    # do prepare
    prepare_items = [market_map[item_name] for item_name in item_names if item_name in market_map and market_map[item_name].price is None]
    wfm.prepare_market_items(prepare_items)

    return {
        item_name: oracle_prince_fn_map[data['oracle_type']](market_map[item_name].price) if item_name in market_map else None
        for item_name in item_names
    }

@app.route('/api/item_infobox', methods=['POST'])
def item_infobox():
    """
    Given an item name, returns its data that should be shown in an infobox.

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
        for transient_name, transient_rotations in transient_items.items():
            rewards = []
            for rotation, rotation_rewards in transient_rotations.items():
                rewards.extend([r['item_name'] for r in rotation_rewards if r['item_name'] in market_map])
            transient_rewards[transient_name] = rewards
        return transient_rewards
    print(use('transient_data', _get_transient_data))
    return use('transient_data', _get_transient_data)

def get_function_item_format(market_item_ls, oracle_type):
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

    # prepare only the necessary ones
    if len(market_item_ls) > 200:
        print("Warning: function_item returning more than 200 items:", len(market_item_ls))
        print("data:", data)
    if len(market_item_ls) > 1000:
        print("Warning: function_item returning more than 1000 items, abort:", len(market_item_ls))
        print("data:", data)
        return {"error": "Too many items matched. Please narrow down your search."}, 400
    wfm.prepare_market_items([item for item in market_item_ls if item.price is None])
    return get_function_item_format(market_item_ls, data['oracle_type'])

@app.route('/api/varzia_relics')
def varzia_relics():
    """
    Gets all varzia relic data

    returns:
    {
        transient_name: list[item names]
    }
    """
    def _get_varzia_relics():
        return wfm.get_varzia_relics()
    print(use('varzia_relics', _get_varzia_relics))
    return use('varzia_relics', _get_varzia_relics)

# ---

"""
i need a functionality

i have a data at "/api/data", it will get some data based on some input, it will return a task ID
"/api/progress/${id}" can fetch the progress of the data preparation: {'status': 'preparing', 'total': 100, 'current': 30}, or when its done, {'status': 'done', 'data': data}, where data is just some plain string

Make an input as a textbox, and when submit, there's a Loading component that show the progress, and when it's done, show the data content on the screen
"""

TASK_STATUS = {}

def run_tasks(task_id, data):
    TASK_STATUS[task_id] = {
        "current": 0,
        "total": 10,
        "status": "in_progress",
        "data": None,
        "error": None
    }
    try:
        for i in range(10):
            time.sleep(1)  # simulate work
            TASK_STATUS[task_id]["current"] += 1
            print(f"Task {task_id} current: {TASK_STATUS[task_id]['current']}/{TASK_STATUS[task_id]['total']}")

        TASK_STATUS[task_id]["data"] = data
        TASK_STATUS[task_id]["status"] = "done"
    except Exception as e:
        TASK_STATUS[task_id]["error"] = str(e)
        TASK_STATUS[task_id]["status"] = "error"

@app.route("/api/data", methods=["POST"])
def start():
    data = request.json
    task_id = str(uuid.uuid4())
    thread = threading.Thread(target=run_tasks, args=(task_id, data))
    thread.start()

    return {"task_id": task_id}


@app.route("/api/progress/<task_id>")
def progress(task_id):
    status = TASK_STATUS.get(task_id)
    if status is None:
        return {"error": "invalid task id"}, 404
    return status
    


if __name__ == '__main__':
    refresh()
    app.run(debug=True, host=HOST, port=PORT)