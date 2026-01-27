from copy import deepcopy
import operator
import pickle
import threading
from typing import *
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

BUILD_DIR = Path('./src/web/frontend/build/')

try:
    from .config import HOST, PORT
except ImportError:
    HOST, PORT = 'localhost', 5000

wfm.RETRY_MAX_TIME = 1    # reduce retry time for better responsiveness
                          # (note that we effective use single thread here, because of Cyphon GIL and lack of `multiprocessing`)

market_lock = threading.Lock()   # ok ngl i don't really know why i added this but better safe than sorry
market_items: list[wfm.MarketItem] = None
market_map: dict[str, wfm.MarketItem] = None
market_id_map: dict[str, wfm.MarketItem] = None
market_data_update_date: datetime.datetime = None
ducat_data = None
cache = {}

# args, kwargs is passed to price oracle functions
# for now, kwargs = stat_filter
oracle_price_fn_map = {
    'default_oracle_price_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_oracle_price_48hrs(*args, **kwargs),
    'top_30%_avg_in_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_top_k_avg_price_for_last_hours(48, 0.3, *args, **kwargs),
    'bottom_30%_avg_in_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_bottom_k_avg_price_for_last_hours(48, 0.3, *args, **kwargs),
    'cur_lowest_price': lambda price_oracle, *args, **kwargs: price_oracle.get_cur_lowest_price(*args, **kwargs),
}

def refresh():
    global market_items, market_map, market_id_map, market_data_update_date, ducat_data, cache
    print(f'{util.GREEN}[*] get market item...{util.RESET}')
    market_items = wfm.get_market_item_list()
    market_map = wfm.get_market_items_name_map(market_items)
    market_id_map = wfm.get_market_items_id_map(market_items)
    print(f'{util.GREEN}[*] get ducat data...{util.RESET}')
    ducat_data = wfm.get_ducat_data(market_items)
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

def _get_price_oracle(item_names, oracle_type, ducantor_price_override):
    """
    return item_name -> oracle price
    assume all items has been prepared (or ducantor price override can deal with it)
    
    this function will request for market_lock! do NOT require it again in the caller
    """
    ducat_data_map = {} if ducantor_price_override == 'none' else ducat_data[f'previous_{ducantor_price_override}']
    with market_lock:
        return {
            item_name: \
                ducat_data_map[item_name]['wa_price'] if item_name in ducat_data_map
                else oracle_price_fn_map[oracle_type](market_map[item_name].price) if item_name in market_map 
                else None
            for item_name in item_names
        }


@app.route('/api/price_oracle', methods=['POST'])
def get_price_oracle():
    """
    Given a list of item names, returns their price oracle values.
    Task API: nonblocking but should poll from /api/progress/${task_id} to get the result

    request json:
    {
        // price oracle calculation, ref. oracle_price_fn_map
        "oracle_type": str,

        // if prime item, whether to override oracle with ducantor price to speed up the process
        // "none": no override, "day / hour": use ducantor price for day / hour
        "ducantor_price_override": "none" | "day" | "hour",  

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
    ducantor_price_override = data.get('ducantor_price_override')
    if ducantor_price_override not in ['none', 'day', 'hour']:
        return {"error": "invalid ducantor_price_override"}, 400
    
    ducat_data_map = {} if ducantor_price_override == 'none' else ducat_data[f'previous_{ducantor_price_override}']
    prepare_item_names = [item_name for item_name in item_names if item_name in market_map and market_map[item_name].price is None]
    prepare_item_names = [item_name for item_name in prepare_item_names if item_name not in ducat_data_map]

    def task(task_id, task_status, stop_obj):
        task_prepare_market_items(task_status, stop_obj, prepare_item_names)
        if stop_obj['stop']:
            task_stop(task_id)
            return
        task_status['data'] = _get_price_oracle(item_names, data['oracle_type'], ducantor_price_override)
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
        // price oracle calculation, ref. oracle_prince_fn_map
        "oracle_type": str,

        // if prime item, whether to override oracle with ducantor price to speed up the process
        // "none": no override, "day / hour": use ducantor price for day / hour
        "ducantor_price_override": "none" | "day" | "hour",  

        "item_name": str
    }
    
    returns:
    {
        item_name: oracle_value or None,
        ...
    }

    if item name not found, returns error message

    if use ducantor price: 
    - will set 'cur_lowest_sell_price', 'wiki_link', '48h_volume' and '90d_volume' to None
    - 
    - 'last_update' would be the ducantor data update time
    """

    data = request.json
    item_name = data.get('item_name')

    # do prepare
    if item_name not in market_map:
        return {}
    
    ducat_price_override = data.get('ducantor_price_override')
    if ducat_price_override == 'none':
        ducat_price_map = {}
    elif ducat_price_override == 'day':
        ducat_price_map = ducat_data[f'previous_day']
    elif ducat_price_override == 'hour':
        ducat_price_map = ducat_data[f'previous_hour']
    else:
        print("invalid ducantor_price_override:", ducat_price_override)
        return {"error": "invalid ducantor_price_override"}, 400
    
    if item_name not in ducat_price_map:
        # default
        with market_lock:
            item = market_map[item_name]
            if item.price is None:
                wfm.prepare_market_items([item])

        return {
            'item_name': item_name,
            'thumb_url': item.get_thumbnail_url(),
            'icon_url': item.get_icon_url(),
            'type': wfi.resolve_item_type(item, default=None),

            'oracle_price': oracle_price_fn_map[data['oracle_type']](item.price),
            'cur_lowest_sell_price': item.orders.get_ingame_lowest_sell_price(),

            '48h_volume': item.statistic.get_volume_for_last_hours(48),
            '90d_volume': item.statistic.get_volume_for_last_days(90),

            'wiki_link': item.wiki_link,
            'market_link': item.get_wfm_url(),

            'last_update': item.prepare_datetime.isoformat() if item.prepare_datetime else None,
        }
    else:
        item = market_map[item_name]
        item_ducat_data = ducat_price_map[item_name]
        return {
            'item_name': item_name,
            'thumb_url': item.get_thumbnail_url(),
            'icon_url': item.get_icon_url(),
            'type': wfi.resolve_item_type(item, default=None),

            'oracle_price': item_ducat_data['wa_price'],
            'cur_lowest_sell_price': None,

            '48h_volume': None,
            '90d_volume': None,

            'wiki_link': None,
            'market_link': item.get_wfm_url(),

            'last_update': item_ducat_data['datetime'] if item_ducat_data['datetime'] else None,    # should already be ISO

            'ducantor_price_override': ducat_price_override,
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

def get_function_item_format(market_item_ls, oracle_type, ducantor_price_override='none'):
    """
    if ducantor_price_override == 'none', you need to prepare all items beforehand
    if ducantor_price_override != 'none', will use ducantor price for prime items, but we still
    assume that all other items are prepared

    returns: ItemTable format
    """
    if ducantor_price_override not in ['none', 'day', 'hour']:
        raise ValueError("invalid ducantor_price_override")
    
    ducat_price_map = {} if ducantor_price_override == 'none' else ducat_data[f'previous_{ducantor_price_override}']
    hour_ducat_price_map = ducat_data['previous_hour']

    def get_plat(item):
        if ducantor_price_override == 'none' or item.item_name not in ducat_price_map:
            return oracle_price_fn_map[oracle_type](item.price)
        return ducat_price_map[item.item_name]['wa_price']
    def get_rmax_plat(item):
        if ducantor_price_override == 'none' or item.item_name not in ducat_price_map:
            return oracle_price_fn_map[oracle_type](item.price, mod_rank_range=[item.mod_max_rank])
        return None
    def get_vol(item):  # 48h
        if ducantor_price_override == 'none' or item.item_name not in ducat_price_map:
            return item.statistic.get_volume_for_last_hours(48)
        return None
    
    item_format_ls = []
    with market_lock:
        for item in market_item_ls:
            item_format = {
                'name': item.item_name,
                'type': wfi.resolve_item_type(item),
                'plat': get_plat(item),
                'rmax_plat_div21': None,
                'rmax_plat': None,
                'plat_times21': None,
                'vol': get_vol(item),
                'url': item.get_wfm_url(),
                'wiki': item.wiki_link, # may be None
            }

            if 'arcane_enhancement' in item.tags:
                rmax_plat = get_rmax_plat(item)
                if rmax_plat is not None:
                    item_format = {
                        **item_format,
                        'rmax_plat_div21': rmax_plat / 21,
                        'rmax_plat': rmax_plat,
                        'plat_times21': item_format['plat'] * 21,
                    }
            item_format_ls.append(item_format)

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
                item['name'],
                item['type'],
                item['plat'],
                item['rmax_plat_div21'],
                item['rmax_plat'],
                item['plat_times21'],
                item['vol'],
                item['url'],
                item['wiki']
            ]
            for item in item_format_ls
        ]
    }

@app.route('/api/function_item', methods=['POST'])
def function_item():
    """
    Given a list of item names, returns their price oracle values.
    Task API: nonblocking but should poll from /api/progress/${task_id} to get the result

    request json:
    {
        // price oracle calculation, ref. oracle_price_fn_map
        "oracle_type": str,

        // if prime item, whether to override oracle with ducantor price to speed up the process
        // "none": no override, "day / hour": use ducantor price for day / hour
        "ducantor_price_override": "none" | "day" | "hour",  
        
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
    ducantor_price_override = data.get('ducantor_price_override')

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
    
    prepare_item_names = [item.item_name for item in market_item_ls if item.price is None]
    if ducantor_price_override in ['day', 'hour']:
        # only prepare things that are not in ducantor price map
        ducat_map = ducat_data[f'previous_{ducantor_price_override}']
        prepare_item_names = [
            item_name for item_name in prepare_item_names
            if item_name not in ducat_map
        ]
    
    def task(task_id, task_status, stop_obj):
        task_prepare_market_items(task_status, stop_obj, prepare_item_names)    
        if stop_obj['stop']:
            task_stop(task_id)
            return
        task_status['data'] = get_function_item_format(market_item_ls, data['oracle_type'], data['ducantor_price_override'])
        task_status['status'] = 'done'

    task_id = register_task(task)
    return {'task_id': task_id}

@app.route('/api/item_orders', methods=['POST'])
def item_orders():
    """
    get item orders
    Task API: nonblocking but should poll from /api/progress/${task_id} to get the result

    request json:
    {
        "item_list": [str, ...] | None,
    }
    
    resturns:
    {
        item_name: {
            'buy_orders': [...],
            'sell_orders': [...],
        },
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
                item_name: \
                    [dataclasses.asdict(order) for order in market_map[item_name].orders.orders] if item_name in market_map 
                    else None
                for item_name in item_names
            }
        task_status['status'] = 'done'

    task_id = register_task(task)
    return {'task_id': task_id}

def _function_best_trade(spec: dict[str, int], price_oracle: dict[str, int]):
    """
    find best trade for the given items

    Args:
        spec: item name -> desired quantity

    Returns:
        {
            "user_map": {
                user_id: {
                    "user_in_game_name": str,
                    "user_reputation": int,
                    "user_slug": str,
                    "user_status": "online" | "offline" | "in_game",
                    "url": str
                }
            }
            "price_oracle": {
                item_name: float or None,
                ...
            }
            "trade_options": [
                {
                    "user_id": str,
                    "items": {
                        item_name: {
                            "price": int,
                            "quantity": int
                            "rank": int | None
                        },
                        ...
                    },
                    "total_price": int,
                    "total_variation": float,
                }
            ]
        }

        NOTE:
            this function can't really deal with stuff that has rank
            if you give an item that has rank, we assume rank 0 and the "rank" field would be set
            to 0 if the item has rank, else None
    """
    with market_lock:
        # remove all invalid items
        spec = {item_name: qty for item_name, qty in spec.items() if item_name in market_map and qty > 0}

        # first we find all users and the items they have for sale that are in spec
        users: dict[str, dict] = {}     # the same as above
        user_offers: dict[str, dict] = {} # user_id -> {"item_name", "price", "quantity"}

        for item_name in spec:
            item = market_map[item_name]
            for order in item.orders.orders:
                if not order.is_sell or not order.is_ingame:
                    continue
                # attempt to add user
                if order.user_id not in users:
                    users[order.user_id] = {
                        "user_in_game_name": order.user_in_game_name,
                        "user_reputation": order.user_reputation,
                        "user_slug": order.user_slug,
                        "user_status": order.user_status,
                        "url": f'https://warframe.market/profile/{order.user_slug}' if order.user_slug else None
                    }
                    user_offers[order.user_id] = {}

                # if already have an offer for this item, take the cheaper one
                if item_name in user_offers[order.user_id]:
                    existing_offer = user_offers[order.user_id][item_name]
                    if (order.platinum, order.quantity) > (existing_offer['price'], existing_offer['quantity']):
                        continue

                user_offers[order.user_id][item_name] = {
                    "price": order.platinum,
                    "quantity": order.quantity,
                    "rank": order.mod_rank if order.mod_rank is not None else None,
                }
    
    # now we have all users and their offers, we can find the best trade options
    trade_options = []

    def submit_trade_option(user_id: str, taken_item: dict[str, dict[str, Any]], variation: dict[str, float]):
        if len(taken_item) == 0:
            return
        total_price = sum([item['price'] * item['quantity'] for item in taken_item.values()])
        total_variation = sum([variation[item_name] * item['quantity'] for item_name, item in taken_item.items()])
        trade_options.append({
            "user_id": user_id,
            "items": deepcopy(taken_item),  # note that taken_item would be modified later
            "total_price": total_price,
            "total_variation": total_variation,
        })
    
    for user_id, offers in user_offers.items():
        # calculate variation: offer price - price oracle, the lower the better
        variation = {
            item_name: (offers[item_name]['price'] - price_oracle[item_name])
            for item_name in offers
        }
        print(user_id, variation)
        print(f'    {offers}')
        neg_variation = {item_name: var for item_name, var in variation.items() if var <= 0}
        pos_variation = {item_name: var for item_name, var in variation.items() if var > 0}
        
        taken_item = {}
        # we first take all negative variation items
        for item_name in neg_variation:
            take_qty = min([spec[item_name], offers[item_name]['quantity']])
            taken_item[item_name] = {
                "price": offers[item_name]['price'],
                "quantity": take_qty,
                "rank": offers[item_name]['rank'],
            }
        submit_trade_option(user_id, taken_item, variation)

        # and then we try to take positive variation items one by one, from lowest to highest
        for item_name, _ in sorted(pos_variation.items(), key=operator.itemgetter(1)):
            max_take_qty = min([spec[item_name], offers[item_name]['quantity']])
            for take_qty in range(1, max_take_qty + 1):
                taken_item[item_name] = {
                    "price": offers[item_name]['price'],
                    "quantity": take_qty,
                    "rank": offers[item_name]['rank'],
                }
                submit_trade_option(user_id, taken_item, variation)
    
    return {
        "user_map": users,
        "price_oracle": price_oracle,
        "trade_options": trade_options
    }

@app.route('/api/function_best_trade', methods=['POST'])
def function_best_trade():
    """
    find best trade for the given items
    Task API: nonblocking but should poll from /api/progress/${task_id} to get the result

    request json:
    {
        // price oracle calculation, ref. oracle_price_fn_map
        "oracle_type": str,
        
        "spec": {item_name: quantity, ...}
    }

    task response:
    ref. _function_best_trade return value

    """

    data = request.json
    print(f'{util.BLUE}function_best_trade called with data: {data}{util.RESET}')

    # will actually have to prepare each and everyone of them
    spec = data.get('spec', {})
    prepare_item_names = [item_name for item_name in spec if item_name in market_map and market_map[item_name].orders is None]
    item_names = list(spec.keys())

    def task(task_id, task_status, stop_obj):
        task_prepare_market_items(task_status, stop_obj, prepare_item_names)
        if stop_obj['stop']:
            task_stop(task_id)
            return
        task_status['data'] = _function_best_trade(spec, _get_price_oracle(item_names, data['oracle_type'], 'none'))
        task_status['status'] = 'done'

    task_id = register_task(task)
    return {'task_id': task_id}

def _test_best_trade():
    USE_CACHE = True
    CACHE_FILE = Path('server_market_cache.pkl')

    spec = {
        'Momentous Bond': 1,
        'Manifold Bond': 2,
        'Loyal Companion': 10,
        'Forma Blueprint': 5,   # doesn't exist
    }

    # load data
    if USE_CACHE:
        if CACHE_FILE.exists():
            print(f'{util.CYAN} loading cache from {CACHE_FILE} {util.RESET}')
            with open(CACHE_FILE, 'rb') as f:
                market_items, market_map, market_id_map, market_data_update_date, ducat_data, cache = pickle.load(f)
        else:
            print(f'{util.CYAN} cache file {CACHE_FILE} not found{util.RESET}')
            exit()
    else:
        refresh()
        for item_name in spec:
            with market_lock:
                print(f'{util.CYAN} preparing {item_name} {util.RESET}')
                item = market_map.get(item_name)
                if item is not None and item.price is None:
                    item.prepare()
        with open(CACHE_FILE, 'wb') as f:
                pickle.dump((market_items, market_map, market_id_map, market_data_update_date, ducat_data, cache), f)
    

    price_oracle = {
        item_name: \
            oracle_price_fn_map['default_oracle_price_48h'](market_map[item_name].price) if item_name in market_map 
            else None
        for item_name in spec
    }
    result = _function_best_trade(spec, price_oracle)
    for i in result['trade_options']:
        print(i)
    

if __name__ == '__main__':
    refresh()
    app.run(debug=True, host=HOST, port=PORT)