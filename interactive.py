from typing import *
import warframe_market as wfm
import util
import prompt_toolkit
from prompt_toolkit import prompt, print_formatted_text
from prompt_toolkit.completion import WordCompleter, CompleteEvent
from prompt_toolkit.styles import Style
from prompt_toolkit.document import Document
from joblib import Parallel, delayed
from tabulate import tabulate
from tqdm import tqdm
import json
import sys
from pathlib import Path
import operator

from data.syndicate_data import additional_syndicates

market_items = wfm.get_market_item_list()
market_map = wfm.get_market_items_name_map(market_items)
market_id_map = wfm.get_market_items_id_map(market_items)

# we had problem with item "Silve & Aegis" due to "&" character in HTML, so we escape "&" to "&amp;" here
HTML = lambda text: prompt_toolkit.HTML(text.replace('&', '&amp;'))

# oracle price function: given oracle and any other argument, return price
OraclePriceFunction = Callable[[wfm.PriceOracle, Any], float]
default_oracle_price_fn: OraclePriceFunction = lambda price_oracle, *args, **kwargs: price_oracle.get_oracle_price_48hrs(*args, **kwargs)

def resolve_item_type(market_item: wfm.MarketItem, default: str = ''):
    """
    Given a type map from tags to type name, return this item's type information as a string
    e.g., resolve_item_type(MarketItem('Molt Augmented')) == 'Arcane'
    """
    type_map = {
        'arcane_enhancement': 'Arcane',
        'mod': 'Mod',
        'scene': 'Scene',
        'weapon': 'Weapon'
    }
    for tag in market_item.tags:
        if tag in type_map:
            return type_map[tag]
    return default

def get_item_info(market_item_ls: list[wfm.MarketItem], do_prepare: bool = True, oracle_price_fn: OraclePriceFunction = default_oracle_price_fn):
    if do_prepare:
        wfm.prepare_market_items(market_item_ls)

    name_ls = []
    type_ls = []
    plat_ls = []
    vol_ls = []
    plat_times21_ls = []       # plat * 21, for arcane price comparison
    rmax_plat_div21_ls = []    # rmax_plat / 21, for arcane price comparison
    url_ls = []
    rmax_plat_ls = []

    for item in market_item_ls:
        name_ls.append(item.item_name)
        type_ls.append(resolve_item_type(item))
        plat_ls.append(oracle_price_fn(item.price))
        vol_ls.append(item.statistic.get_volume_for_last_hours(48))
        url_ls.append(item.get_wfm_url())

        if 'arcane_enhancement' in item.tags:
            rmax_plat_ls.append(oracle_price_fn(item.price, mod_rank_range=[item.mod_max_rank]))
            plat_times21_ls.append(plat_ls[-1] * 21)
            rmax_plat_div21_ls.append(rmax_plat_ls[-1] / 21)
        else:
            rmax_plat_ls.append(None)
            plat_times21_ls.append(None)
            rmax_plat_div21_ls.append(None)
    
    return {
        'name': name_ls,
        'type': type_ls,
        'plat': plat_ls,
        'rmax_plat_div21': rmax_plat_div21_ls,
        'rmax_plat': rmax_plat_ls,
        'plat_times21': plat_times21_ls,
        'vol': vol_ls,
        'url': url_ls,
    }

def print_item_info(market_item_ls: list[wfm.MarketItem], do_prepare=True, oracle_price_fn=default_oracle_price_fn):
    # do transpose
    item_info = get_item_info(market_item_ls, do_prepare=do_prepare, oracle_price_fn=default_oracle_price_fn)
    name_ls, type_ls, plat_ls, rmax_plat_div21_ls, rmax_plat_ls, plat_times21_ls, vol_ls, url_ls = operator.itemgetter(
        'name', 'type', 'plat', 'rmax_plat_div21', 'rmax_plat', 'plat_times21', 'vol', 'url'
    )(item_info)

    if not all([i is None for i in rmax_plat_div21_ls]):
        headers = ['Name', 'Type', 'Plat\n(48hr)', 'RMP/21\n(Arcane)', 'R.Max Plat\n(48hr)', 'P*21\n(Arcane)', 'Volume\n(48hr)', 'WFM URL']
        table_ls = list(zip(name_ls, type_ls, plat_ls, rmax_plat_div21_ls, rmax_plat_ls, plat_times21_ls, vol_ls, url_ls))
    else:
        headers = ['Name', 'Type', 'Plat\n(48hr)', 'R.Max Plat\n(48hr)', 'Volume\n(48hr)', 'WFM URL']
        table_ls = list(zip(name_ls, type_ls, plat_ls, rmax_plat_ls, vol_ls, url_ls))

    print(tabulate(table_ls, headers=headers, floatfmt=".2f", missingval=' '))

def print_syndicate_info(syndicate_name: str):
    market_items = wfm.get_syndicate_items(syndicate_name)
    wfm.prepare_market_items(market_items)
    
    print_formatted_text(HTML(f"Sorted by price:"))
    items = [(market_item, market_item.price.get_oracle_price_48hrs()) for market_item in market_items]
    items = sorted(items, key=lambda a:a[1], reverse=True)[:15]
    items = [item[0] for item in items]
    print_item_info(items, do_prepare=False)

    print_formatted_text(HTML(f""))
    print_formatted_text(HTML(f"Sorted by volume:"))
    items = [(market_item, market_item.statistic.get_volume_for_last_hours(48)) for market_item in market_items]
    items = sorted(items, key=lambda a:a[1], reverse=True)[:15]
    items = [item[0] for item in items]
    print_item_info(items, do_prepare=False)

def print_relic_info(relic_data=None, level='Radiant', show_only_total=False):
    """
        relic data: dict{name: dict{rarity: list of valuables}}
        rarity in ['Common', 'Uncommon', 'Rare'], all valuables should have an entry in market
        do NOT include forma blueprint in your relic data

        e.g., {
            'Meso S14': {
                'Common': ['Ankyros Prime Gauntlet', 'Burston Prime Stock'],
                'Uncommon': ['Ember Prime Neuroptics Blueprint', 'Rhino Prime Neuroptics Blueprint'],
                'Rare': ['Sicarus Prime Receiver']
            }, 
            ...
        }
    """

    def check_name_integrity(market_map, relics):
        invalid_name = []
        for name in relics:
            for rarity in relics[name]:
                for item_name in relics[name][rarity]:
                    if item_name not in market_map:
                        invalid_name.append(f'{name} {rarity} {item_name}')
        if invalid_name: print(invalid_name)
        return invalid_name
    
    market_map = wfm.get_market_items_name_map()
    assert len(check_name_integrity(market_map, relic_data)) == 0

    def get_all_items(market_map, relics):
        return [
            market_map[item_name]
            for name in relics for rarity in relics[name] for item_name in relics[name][rarity]
        ]
    
    wfm.prepare_market_items(get_all_items(market_map, relic_data))

    def get_relic_expected_price(relic_name, relic, level = 'Radiant'):
        def get_expected_price(market_item: wfm.MarketItem):
            return market_item.price.get_oracle_price_48hrs()
        
        prob_map = {
            'Intact': {'Common': 0.253, 'Uncommon': 0.11, 'Rare': 0.02},
            'Exceptional': {'Common': 0.233, 'Uncommon': 0.13, 'Rare': 0.04},
            'Flawless': {'Common': 0.20, 'Uncommon': 0.17, 'Rare': 0.06},
            'Radiant': {'Common': 0.167, 'Uncommon': 0.20, 'Rare': 0.10}
        }[level]

        
        # get all info
        expected_plat = 0

        rarity_ls = []
        name_ls = []
        plat_ls = []
        for rarity in prob_map:
            for name in relic[rarity]:
                rarity_ls.append(f'{rarity} ({prob_map[rarity] * 100}%)')
                price = get_expected_price(market_map[name])
                name_ls.append(name)
                plat_ls.append(f'{price:.2f}')
                expected_plat += prob_map[rarity] * price
        
        rarity_ls.append('Total')
        name_ls.append('')
        plat_ls.append(f'{expected_plat:.2f}')

        # make it actually tabulate-able, i.e. all list should be one string
        for i in range(len(rarity_ls)-1, 0, -1):
            if rarity_ls[i] == rarity_ls[i-1]:
                rarity_ls[i] = ''
        return [relic_name, '\n'.join(rarity_ls), '\n'.join(name_ls), '\n'.join(plat_ls)], expected_plat
    
    relic_price = {relic_name: get_relic_expected_price(relic_name, relic_data[relic_name], level) for relic_name in relic_data}
    if not show_only_total:
        print(tabulate(
            [table_ls for relic_name, (table_ls, expected_plat) in relic_price.items()],
            headers=['Relic', 'Rarity', 'Name', 'Plat'], tablefmt="grid", colalign=("left",) * 3 + ("right",) 
        ))
    print(tabulate(
        [[relic_name, expected_plat] for relic_name, (table_ls, expected_plat) in relic_price.items()],
        headers=['Relic', 'Plat'], tablefmt="grid", colalign=("left", "right")
    ))

    # testing
    print([
        {
            'relic_name': relic_name,
            'level': level,
            'rewards': {
                rarity: [
                    {
                        'item_name': item_name,
                        'price': market_map[item_name].price.get_oracle_price_48hrs() if item_name in market_map else 0,
                    } for item_name in relic_data[relic_name][rarity]
                ] for rarity in relic_data[relic_name].keys()
            }
        } for relic_name in relic_data.keys()
    ])
  
def print_transient_reward_info(reward_data):
    """
        reward_data: dict{rotation: list of dict{item_name, rarity, chance}}
    """
    # prepare as a batch
    rewards = []
    for rotation, rotation_rewards in reward_data.items():
        rewards.extend([market_map[r['item_name']] for r in rotation_rewards if r['item_name'] in market_map])
    wfm.prepare_market_items(rewards)
    
    for rotation, rotation_rewards in reward_data.items():
        print(f'\nRotation {rotation}:')
        print_item_info([market_map[r['item_name']] for r in rotation_rewards if r['item_name'] in market_map], do_prepare=False)

def item_function():
    item_selecter = WordCompleter(list(market_map.keys()) + ['Quit', 'quit'], 
                                  ignore_case=True, sentence=True, match_middle=True)
    
    while True:
        text = prompt('Enter item name (will match ALL items shown below. type "Quit" to quit): ', completer=item_selecter)
        if text in ['Quit', 'quit']:
            break

        completion_ls = list(item_selecter.get_completions(
            Document(text), CompleteEvent(completion_requested=True)
        ))
        item_name_set = set(map(lambda c: c.text, completion_ls)) - {'Quit', 'quit'}
        if len(item_name_set) == 0:
            print_formatted_text(HTML('Item not found.'))
            continue

        print_item_info([
            market_map[item_name]
            for item_name in item_name_set
        ])

def syndicate_function():
    syndicate_ls = [
            "Arbiters of Hexis", "Steel Meridian", "The Quills", "NecraLoid", "Vox Solaris", "Ventkids", 
            "Cephalon Simaris", "New Loka", "Cephalon Suda", "Red Veil", "The Perrin Sequence", 
            "Solaris United", "Entrati", "Ostron", "The Holdfasts", "Kahl's Garrison", "Operational Supply", 
            "Conclave",
        ] + list(additional_syndicates.keys())
    syndicate_selecter = WordCompleter(syndicate_ls + ['Quit', 'quit'], ignore_case=True, sentence=True, match_middle=True)
    while True:
        text = prompt('Enter syndicate (or type "Quit" to quit): ', completer=syndicate_selecter)
        if text in ['Quit', 'quit']:
            break
        elif text not in syndicate_ls:
            print_formatted_text(HTML('Syndicate not found.'))
        else:
            print_syndicate_info(text)

def relic_plat_function():
    from data.relic_data import relic_data_map, relic_set_map

    all_relic_data_map = relic_data_map | wfm.get_relic_data(discard_forma=True)

    relic_choice = relic_set_map | {
        relic_name: [relic_name]
        for relic_name in all_relic_data_map
    }
    syndicate_selecter = WordCompleter(list(relic_choice.keys()) + ['Quit', 'quit'],
                                       ignore_case=True, sentence=True, match_middle=True)
    while True:
        text = prompt('Enter relic name (or type "Quit" to quit): ', completer=syndicate_selecter)
        if text in ['Quit', 'quit']:
            break
        elif text not in relic_choice:
            print_formatted_text(HTML('Relic not found.'))
        else:
            relic_name_ls = relic_choice[text]
            print_relic_info({
                relic_name: all_relic_data_map[relic_name]
                for relic_name in relic_name_ls
            })

def relic_item_function():
    from data.relic_data import relic_data_map

    def name_in_relic(relic_data: dict[str, list[str]], substr: str):
        for rarity in relic_data:
            for item_name in relic_data[rarity]:
                if substr.lower() in item_name.lower():
                    return True
        return False
    
    all_relic_data_map = relic_data_map | wfm.get_relic_data(discard_forma=True)

    item_selecter = WordCompleter(list(market_map.keys()) + ['Quit', 'quit'], 
                                  ignore_case=True, sentence=True, match_middle=True)

    while True:
        text = prompt('Enter item name (will match ALL item below. type "Quit" to quit): ', completer=item_selecter)
        if text in ['Quit', 'quit']:
            break
        else:
            print_relic_info({
                relic_name: relic_data
                for relic_name, relic_data in all_relic_data_map.items()
                if name_in_relic(relic_data, text)
            })

def relic_plat_multiple_function():
    from data.relic_data import relic_data_map, relic_set_map

    all_relic_data_map = relic_data_map | wfm.get_relic_data(discard_forma=True)

    relic_choice = relic_set_map | {
        relic_name: [relic_name]
        for relic_name in all_relic_data_map
    }
    relic_selecter = WordCompleter(list(relic_choice.keys()) + ['Quit', 'quit'],
                                       ignore_case=True, sentence=True, match_middle=True)
    while True:
        text = prompt('Enter relic name (use "+" to separate, or type "Quit" to quit): ', completer=relic_selecter)
        if text in ['Quit', 'quit']:
            break

        
        relic_texts = [text_part.strip() for text_part in text.split('+')]
        relic_ls = []
        for index, relic_text in enumerate(relic_texts):
            print_formatted_text(HTML(f'({index+1}/{len(relic_texts)}) <b>{relic_text}</b>'))
            completion_ls = list(relic_selecter.get_completions(
                Document(relic_text), CompleteEvent(completion_requested=True)
            ))

            relic_name_set = set(map(lambda c: c.text, completion_ls)) - {'Quit', 'quit'}
            if len(relic_name_set) == 0:
                print_formatted_text(HTML('Item not found.'))
                continue
            if len(relic_name_set) > 1:
                if relic_text in relic_choice:
                    # exact match
                    relic_name_set = {relic_text}
                else:
                    print_formatted_text(HTML(f'Multiple items matched for "{relic_text}". Please be more specific.'))
                    continue
            
            relic_name = list(relic_name_set)[0]
            relic_ls.append(relic_name)
        print_relic_info({
            relic_name: all_relic_data_map[relic_name]
            for relic_name in relic_ls
        })
            
def transient_mission_reward_function():
    transient_mission_reward = wfm.get_transient_mission_rewards()
    syndicate_selecter = WordCompleter(list(transient_mission_reward.keys()) + ['Quit', 'quit'], 
                                       ignore_case=True, sentence=True, match_middle=True)
    while True:
        text = prompt('Enter syndicate (or type "Quit" to quit): ', completer=syndicate_selecter)
        if text in ['Quit', 'quit']:
            break
        elif text not in transient_mission_reward:
            print_formatted_text(HTML('Reward not found.'))
        else:
            print_transient_reward_info(transient_mission_reward[text])

def find_best_trade_function():
    """
    TODO:
    - you might wanna buy the multiple identical items (e.g., akjagara prime barrel * 2)
        - support input "item * n", delete item count from n, and the logic behind this
    - if a user have 5 items, maybe there are 3 items that are very good deals, and 2 items are bad deals, we might wanna only trade the 3 items
        - support users with subset of items only
    """

    TRADE_MESSAGE_COMMAND = '/Trade Message'
    MAKE_ITEM_LIST_COMMAND = '/Make Item List'
    DELETE_ITEM_COMMAND = '/Delete Item'
    PRINT_CURRENT_ITEM_LIST_COMMAND = '/Print Current Item List'
    PRINT_BEST_TRADES_COMMAND = '/Print Best Trades'
    SAVE_ALL_BEST_TRADES_COMMAND = '/Save All Best Trades'
    REFRESH_ORDERS_COMMAND = '/Refresh Orders'
    CLEAR_COMMAND = '/Clear'
    command_list = [TRADE_MESSAGE_COMMAND, MAKE_ITEM_LIST_COMMAND, DELETE_ITEM_COMMAND, PRINT_CURRENT_ITEM_LIST_COMMAND, PRINT_BEST_TRADES_COMMAND, SAVE_ALL_BEST_TRADES_COMMAND, REFRESH_ORDERS_COMMAND, CLEAR_COMMAND]

    item_selecter = WordCompleter(list(market_map.keys()) + ['Quit', 'quit', *command_list], 
                                  ignore_case=True, sentence=True, match_middle=True)
    
    users: dict[str, wfm.User] = {} # user_id -> User, note that User may not be prepared
    item_names: list[str] = [] # item name
    current_user_orders: dict[str, list[wfm.Orders.Order]] = {} # user id -> list of orders, you should maintain this and use this as your main source of order
    item_oracle_price: dict[str, float] = {}

    def add_items(item_texts: list[str]):
        """ add a list of items to the current query, recalculate best trades and print"""
        nonlocal item_names, item_oracle_price, users, current_user_orders, item_selecter

        for index, item_text in enumerate(item_texts):
            print_formatted_text(HTML(f'({index+1}/{len(item_texts)}) <b>{item_text}</b>'))
            completion_ls = list(item_selecter.get_completions(
                Document(item_text), CompleteEvent(completion_requested=True)
            ))

            item_name_set = set(map(lambda c: c.text, completion_ls)) - {'Quit', 'quit'}
            if len(item_name_set) == 0:
                print_formatted_text(HTML('Item not found.'))
                continue
            if len(item_name_set) > 1:
                print_formatted_text(HTML(f'Multiple items matched for "{item_text}". Please be more specific.'))
                continue
            
            item_name = list(item_name_set)[0]
            if item_name in item_names:
                print_formatted_text(HTML(f'Item "{item_name}" already added.'))
                continue
            if item_name not in market_map:
                print_formatted_text(HTML('Item not found.'))
                continue
            
            market_item = market_map[item_name]
            market_item.prepare()

            item_names.append(item_name)
            item_oracle_price[item_name] = market_item.price.get_oracle_price_48hrs()

            # find all sellers for this item
            in_game_orders = [order for order in market_item.orders.orders if order.is_sell and order.visible and order.is_ingame]
            new_users = []
            for order in in_game_orders:
                if order.user_id not in users:
                    user = wfm.User(user_id=order.user_id)
                    new_users.append(user)
                    current_user_orders[order.user_id] = [order]
                else:
                    current_user_orders[order.user_id].append(order)

            # wfm.fetch_users_data(new_users)
            for user in new_users:
                users[user.user_id] = user

    def delete_item(item_text: str):
        """ delete an item from the current query, recalculate best trades and print"""
        nonlocal item_names, item_oracle_price, users, current_user_orders, item_selecter

        if item_text not in item_names:
            print_formatted_text(HTML(f'Item "{item_text}" not in current query.'))
            return
        
        item_names.remove(item_text)
        del item_oracle_price[item_text]

        # recalculate user orders
        for user_id in list(current_user_orders.keys()):
            user_orders = current_user_orders[user_id]
            user_orders = [order for order in user_orders if market_id_map[order.item_id].item_name != item_text]
            if len(user_orders) == 0:
                del current_user_orders[user_id]
                del users[user_id]
            else:
                current_user_orders[user_id] = user_orders

    def calculate_best_trades(best_n: int | None = 10, output_file: Path = None, ignore_single_trade_user: bool = False):
        """ calculate and print best trades for current items """
        # calculates best trade
        user_sort = []
        for user_id in current_user_orders:
            user_orders = current_user_orders[user_id]
            if len(user_orders) <= 1 and ignore_single_trade_user:
                continue
            total_deviate_price = 0
            for order in user_orders:
                item_name = market_id_map[order.item_id].item_name
                oracle_price = item_oracle_price[item_name]
                total_deviate_price += (order.platinum - oracle_price)
            user_sort.append((len(user_orders), total_deviate_price, user_id))
        
        # print the best 10
        user_sort = sorted(user_sort, key=lambda x: (-x[1]), reverse=True)
        if best_n is not None:
            user_sort = user_sort[:best_n]
        print_users = [
            {
                'item_count': i[0],
                'total_deviate_price': i[1],
                'user_id': i[2],
            }
            for i in user_sort
        ]

        cur_users = [users[pu['user_id']] for pu in print_users if users[pu['user_id']].user_ingame_name is None]
        wfm.fetch_users_data(cur_users)
        for user in cur_users:
            users[user.user_id] = user

        def pd(deviation_value: float, is_background = False) -> str:
            """ print deviation: price - oracle price """
            def get_tags(color, is_background):
                if is_background:
                    return f'<style bg="ansi{color}">', '</style>'
                else:
                    return f'<ansi{color}>', f'</ansi{color}>'
            
            if deviation_value > 0:
                start_tag, end_tag = get_tags('red', is_background)
            else:
                start_tag, end_tag = get_tags('green', is_background)

            return f'{start_tag}{deviation_value:+.2f}{end_tag}'
        
        file = sys.stdout
        if output_file is not None:
            file = open(output_file, 'w', encoding='utf-8')
            print_formatted_text(HTML(f'Saving best trades to file: <b><ansigreen>{str(output_file)}</ansigreen></b>'), file=sys.stdout)

        for print_user in print_users:
            user = users[print_user['user_id']]
            
            print_formatted_text(HTML(f'User: <b><ansiyellow>{user.user_ingame_name}</ansiyellow></b> ({len(current_user_orders[user.user_id])} items, deviation {pd(print_user["total_deviate_price"], True)} plat) <ansigray>(https://warframe.market/profile/{user.user_slug})</ansigray>'), file=file)
            for order in current_user_orders[user.user_id]:
                item_name = market_id_map[order.item_id].item_name
                oracle_price = item_oracle_price[item_name]
                print_formatted_text(HTML(f'    - {item_name}: {order.platinum} plat ({oracle_price:.2f}{pd(order.platinum - oracle_price)})'), file=file)
        
        if output_file is not None:
            print_formatted_text(HTML(f'Current query: "<b><ansicyan>{" + ".join(item_names)}</ansicyan></b>"'), file=file)
            print_formatted_text(HTML(f'Best trades saved to file: <b><ansigreen>{str(output_file)}</ansigreen></b>'))
        print_formatted_text(HTML(f'Current query: "<b><ansicyan>{" + ".join(item_names)}</ansicyan></b>"'))
        
    def construct_user_trade_message(user_in_game_name: str):
        # find the user with that in game name
        target_user = None
        for user in users.values():
            if user.user_ingame_name == user_in_game_name:
                target_user = user
                break
        if target_user is None:
            print_formatted_text(HTML('User not found.'))
            return
        cur_orders = current_user_orders[target_user.user_id]

        # print price for this user again
        def pd(deviation_value: float, is_background = False) -> str:
            """ print deviation: price - oracle price """
            def get_tags(color, is_background):
                if is_background:
                    return f'<style bg="ansi{color}">', '</style>'
                else:
                    return f'<ansi{color}>', f'</ansi{color}>'
            
            if deviation_value > 0:
                start_tag, end_tag = get_tags('red', is_background)
            else:
                start_tag, end_tag = get_tags('green', is_background)

            return f'{start_tag}{deviation_value:+.2f}{end_tag}'

        user = users[target_user.user_id]
        deviation = 0
        for order in current_user_orders[user.user_id]:
            item_name = market_id_map[order.item_id].item_name
            oracle_price = item_oracle_price[item_name]
            deviation += order.platinum - oracle_price
        print_formatted_text(HTML(f'User: <b><ansiyellow>{user.user_ingame_name}</ansiyellow></b> ({len(current_user_orders[user.user_id])} items, deviation {pd(deviation, True)} plat) <ansigray>(https://warframe.market/profile/{user.user_slug})</ansigray>'))
        for order in current_user_orders[user.user_id]:
            item_name = market_id_map[order.item_id].item_name
            oracle_price = item_oracle_price[item_name]
            print_formatted_text(HTML(f'    - {item_name}: {order.platinum} plat ({oracle_price:.2f}{pd(order.platinum - oracle_price)})'))
    

        # /w DouaOuaTari Hi! I want to buy: "Synoid Gammacor" for 29 platinum. (warframe.market)
        
        message = f'/w {target_user.user_ingame_name} Hi! I want to buy: '
        item_message_ls = [
            f'"{market_id_map[order.item_id].item_name}" for {order.platinum} platinum'
            for order in cur_orders
        ]
        message += ', '.join(item_message_ls)
        message += ', with a total of '
        total_plat = sum([order.platinum for order in cur_orders])
        equation = '+'.join([str(order.platinum) for order in cur_orders])
        message += f'{equation} = {total_plat} platinum. (warframe.market)'
        print_formatted_text(HTML(f'The profile page is: <b><ansicyan>https://warframe.market/profile/{target_user.user_slug}</ansicyan></b>'))
        print_formatted_text(HTML(f'The message is: <b><ansiyellow>{message}</ansiyellow></b>'))
    
    def refresh_orders():
        nonlocal item_names, item_oracle_price, users, current_user_orders, item_selecter
        old_item_names = item_names.copy()
        item_names = []
        users = {}
        current_user_orders = {}
        item_oracle_price = {}
        add_items(old_item_names)
        
    def make_item_list():
        item_name_ls = []
        selecter = WordCompleter(list(market_map.keys()) + ['Quit', 'quit'], 
                                ignore_case=True, sentence=True, match_middle=True)
        while True:
            text = prompt(f'Enter item name or "Quit": ', completer=selecter)
            if text in ['Quit', 'quit']:
                break
            if text not in market_map:
                print_formatted_text(HTML('Item not found.'))
                continue
            item_name_ls.append(text)
            print_formatted_text(HTML(f'Item List for Query: "<b><ansicyan>{" + ".join(item_name_ls)}</ansicyan></b>"'))
    
    print_formatted_text(HTML('You can:'))
    print_formatted_text(HTML('    <b>(1)</b> Enter <ansiyellow>item names</ansiyellow> to add items to the current query. You can enter multiple items at once by separating them with a <ansiyellow>"+"</ansiyellow> sign.'))
    print_formatted_text(HTML('    <b>(2)</b> Type <ansiyellow>"/Trade Message"</ansiyellow> to construct a trade message for a user with multiple items.'))
    print_formatted_text(HTML('    <b>(3)</b> Type <ansiyellow>"/Make Item List"</ansiyellow> to construct a list of items for future use.'))
    print_formatted_text(HTML('    <b>(4)</b> Type <ansiyellow>"/Delete Item"</ansiyellow> to delete an item from the current query.'))
    print_formatted_text(HTML('    <b>(5)</b> Type <ansiyellow>"/Print Current Item List"</ansiyellow> to print the current item list.'))
    print_formatted_text(HTML('    <b>(6)</b> Type <ansiyellow>"/Print Best Trades"</ansiyellow> to print best trades.'))
    print_formatted_text(HTML('    <b>(7)</b> Type <ansiyellow>"/Save All Best Trades"</ansiyellow> to save best trades for all users.'))
    print_formatted_text(HTML('    <b>(8)</b> Type <ansiyellow>"/Refresh Orders"</ansiyellow> to refresh orders for all items.'))
    print_formatted_text(HTML('    <b>(9)</b> Type <ansiyellow>"/Clear"</ansiyellow> to clear all items.'))
    while True:
        # (can enter multiple with "+" delimiter, type "Quit" to quit, type "Trade Message" to construct trade message with multiple items): 

        text = prompt(f'Enter item name or command ({", ".join(command_list)}): ', completer=item_selecter)
        if text in ['Quit', 'quit']:
            break
        
        if text == TRADE_MESSAGE_COMMAND:
            user_names = [u.user_ingame_name for u in users.values() if u.user_ingame_name is not None]
            if len(user_names) == 0:
                print_formatted_text(HTML('No users available. Please add some items first to fetch users.'))
                continue
            user_selecter = WordCompleter(user_names + ['Quit', 'quit'], 
                                ignore_case=True, sentence=True, match_middle=True)

            while True:
                text = prompt('Enter the user\'s in-game name that you want to trade with: ', completer=user_selecter)
                if text in ['Quit', 'quit']:
                    break
                if text not in user_names:
                    print_formatted_text(HTML('User not found.'))
                    continue
                construct_user_trade_message(text)
                break

            continue
        
        if text == MAKE_ITEM_LIST_COMMAND:
            make_item_list()
            continue

        if text == DELETE_ITEM_COMMAND:
            item_to_delete = prompt('Enter the item name to delete: ', completer=WordCompleter(item_names, ignore_case=True))
            delete_item(item_to_delete)
            continue
            
        if text == PRINT_CURRENT_ITEM_LIST_COMMAND:
            print_formatted_text(HTML(f'Current query: "<b><ansicyan>{" + ".join(item_names)}</ansicyan></b>"'))
            continue

        if text == PRINT_BEST_TRADES_COMMAND:
            print_formatted_text(HTML('<b><ansired>=== Best trades (ignore single user): ===</ansired></b>'))
            calculate_best_trades(best_n=10, output_file=None, ignore_single_trade_user=True)
            print_formatted_text(HTML('<b><ansired>=== Best trades (all users): ===</ansired></b>'))
            calculate_best_trades(best_n=10, output_file=None, ignore_single_trade_user=False)
            continue

        if text == SAVE_ALL_BEST_TRADES_COMMAND:
            calculate_best_trades(best_n=None, output_file=Path('./best_trades.ansi'), ignore_single_trade_user=False)
            calculate_best_trades(best_n=None, output_file=Path('./best_trades_ignore_single_user.ansi'), ignore_single_trade_user=True)
            continue

        if text == SAVE_ALL_BEST_TRADES_COMMAND:
            calculate_best_trades(best_n=None, output_file=Path('./best_trades.ansi'), ignore_single_trade_user=False)
            calculate_best_trades(best_n=None, output_file=Path('./best_trades_ignore_single_user.ansi'), ignore_single_trade_user=True)
            continue

        if text == REFRESH_ORDERS_COMMAND:
            refresh_orders()
            calculate_best_trades(best_n=10, output_file=None, ignore_single_trade_user=True)
            continue

        if text == CLEAR_COMMAND:            
            item_names = []
            users = {}
            current_user_orders = {}
            item_oracle_price = {}
            continue

        # we try to match as much things as possible
        item_texts = [t.strip() for t in text.split('+')]
        print(item_texts)
        add_items(item_texts)

        
        print_formatted_text(HTML('<b><ansired>=== Best trades (ignore single user): ===</ansired></b>'))
        calculate_best_trades(best_n=10, output_file=None, ignore_single_trade_user=True)
        print_formatted_text(HTML('<b><ansired>=== Best trades (all users): ===</ansired></b>'))
        calculate_best_trades(best_n=10, output_file=None, ignore_single_trade_user=False)

def quit_function():
    exit()

def print_welcome_message():
    style = Style.from_dict({
        'title': 'cyan bold',
        'subtitle': 'bold',
        'bp': 'grey',
        'item': 'yellow',
        'code': 'blue bold italic'
    })

    def P(text):
        print_formatted_text(HTML(text), style=style)    

    P('<title>[ WARFRAME TOOL ]</title>')
    P('')
    P('<subtitle>Function:</subtitle>')
    P('<bp>-</bp> <item>Item Info</item>: Show item info on warframe.market (e.g., Oracle prices and recent trade.)')
    P('<bp>-</bp> <item>Relic Plat</item>: Gives expected plat reward for specific relic (set).')
    P('<bp>-</bp> <item>Relic Item</item>: Get all relics containing item and give expected plat for each relic.')
    P('<bp>-</bp> <item>Relic Plat Multiple</item>: Can input multiple items.')
    P('<bp>-</bp> <item>Syndicate</item>: Show item market price sold by syndicate.')
    P('<bp>-</bp> <item>Transient Reward</item>: Get available transient mission rewards and show market price.')
    P('<bp>-</bp> <item>Find Best Trade</item>: For a list of items, find the best users to trade with to minimize total price deviation from oracle price.')
    P('                   (also serves as mass query for multiple items\' current market prices & best to buy item currently)')
    P('')
    P('<subtitle>Note:</subtitle>')
    P('<bp>-</bp> Press <code>TAB</code> to use autocomplete menu, or just type away.')
    P('<bp>-</bp> Use <code>arrow key</code> and press <code>ENTER</code> to choose an item in the menu.')
    P('<bp>-</bp> If not specified, please choose a specific choice (case-sensitive).')
    P('<bp>-</bp> Some functions explicitly shows that it matches ALL items shown in the menu. ')
    P('  In that case you don\'t need to choose a specific item. Most of these are case-insensitive, too.')
    P('')

def main_interactive():
    function = {
        'Item Info': item_function,
        'Relic Plat': relic_plat_function,
        'Relic Item': relic_item_function,
        'Relic Plat Multiple': relic_plat_multiple_function,
        'Syndicate': syndicate_function,
        'Transient Reward': transient_mission_reward_function,
        'Find Best Trade': find_best_trade_function,
        'Quit': quit_function,
        'quit': quit_function
    }
    function_selecter = WordCompleter(list(function.keys()), ignore_case=True, sentence=True, match_middle=True)
    while True:
        print_welcome_message()
        text = prompt('Enter function: ', completer=function_selecter)
        if text in ['Quit', 'quit']:
            break
        elif text not in function:
            print_formatted_text(HTML('Function not found.'))
        else:
            function[text]()