import warframe_market as wfm
import util
from prompt_toolkit import prompt, print_formatted_text, HTML
from prompt_toolkit.completion import WordCompleter, CompleteEvent
from prompt_toolkit.styles import Style
from prompt_toolkit.document import Document
from joblib import Parallel, delayed
from tabulate import tabulate
from tqdm import tqdm
import json

market_items = wfm.get_market_item_list()
market_map = wfm.get_market_items_name_map(market_items)

def print_item_info(market_item_ls: list[wfm.MarketItem], do_prepare=True):
    if do_prepare:
        wfm.prepare_market_items(market_item_ls)

    name_ls = []
    plat_48hr_ls = []
    vol_48hr_ls = []
    plat_times21_48hr_ls = []       # plat * 21, for arcane price comparison
    rmax_plat_div21_48hr_ls = []    # rmax_plat / 21, for arcane price comparison
    url_ls = []
    rmax_plat_48hr_ls = []

    show_arcane_plat_comparison = False

    for item in market_item_ls:
        name_ls.append(item.item_name)
        plat_48hr_ls.append(item.price.get_oracle_price_48hrs())
        vol_48hr_ls.append(item.statistic.get_volume_for_last_hours(48))
        url_ls.append(item.get_wfm_url())
        
        if item.is_mod_info_available and item.is_mod:
            rmax_plat_48hr_ls.append(item.price.get_oracle_price_48hrs(mod_rank_range=[item.mod_max_rank]))
            plat_times21_48hr_ls.append(plat_48hr_ls[-1] * 21)
            rmax_plat_div21_48hr_ls.append(rmax_plat_48hr_ls[-1] / 21)
            show_arcane_plat_comparison = True
        else:
            rmax_plat_48hr_ls.append(None)
            plat_times21_48hr_ls.append(None)
            rmax_plat_div21_48hr_ls.append(None)

    # do transpose
    if show_arcane_plat_comparison:
        headers = ['Name', 'Plat\n(48hr)', 'RMP/21\n(Arcane)', 'R.Max Plat\n(48hr)', 'P*21\n(Arcane)', 'Volume\n(48hr)', 'WFM URL']
        table_ls = list(zip(name_ls, plat_48hr_ls, rmax_plat_div21_48hr_ls, rmax_plat_48hr_ls, plat_times21_48hr_ls, vol_48hr_ls, url_ls))
    else:
        headers = ['Name', 'Plat\n(48hr)', 'R.Max Plat\n(48hr)', 'Volume\n(48hr)', 'WFM URL']
        table_ls = list(zip(name_ls, plat_48hr_ls, rmax_plat_48hr_ls, vol_48hr_ls, url_ls))

    print(tabulate(table_ls, headers=headers, floatfmt=".2f", missingval=' '))

def _deprecated_print_syndicate_info(syndicate_name: str):
    market_items = wfm.get_syndicate_items(syndicate_name)

    def task(item: wfm.MarketItem):
        item.prepare()
        price = item.price.get_oracle_price_48hrs()
        volume = item.statistic.get_volume_for_last_hours(48)
        url = item.get_wfm_url()
        return (item, price, volume, url)
        
    with util.tqdm_joblib(tqdm(range(len(market_items)), 'Fetching items...')) as tqdm_progress:
        result = Parallel(n_jobs=5)(delayed(task)(item) for item in market_items)

    def print_all_item(item_ls: list[tuple[wfm.MarketItem, int, int, str]], prefix: str):
        item_ls = [(i[0].item_name, i[1], i[2], i[3]) for i in item_ls]
        print(tabulate(item_ls, headers=('Name', 'Plat', 'Volume', 'URL'), tablefmt="rounded_outline"))
    
    print_formatted_text(HTML(f"Sorted by price:"))
    print_all_item(sorted(result, key=lambda a:a[1], reverse=True)[:15], "    ")
    print_formatted_text(HTML(f""))
    print_formatted_text(HTML(f"Sorted by volume:"))
    print_all_item(sorted(result, key=lambda a:a[2], reverse=True)[:15], "    ")

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

def print_relic_info(relic_data=None, level='Radiant'):
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
    print(tabulate(
        [table_ls for relic_name, (table_ls, expected_plat) in relic_price.items()],
        headers=['Relic', 'Rarity', 'Name', 'Plat'], tablefmt="grid", colalign=("left",) * 3 + ("right",) 
    ))
    print(tabulate(
        [[relic_name, expected_plat] for relic_name, (table_ls, expected_plat) in relic_price.items()],
        headers=['Relic', 'Plat'], tablefmt="grid", colalign=("left", "right")
    ))
  
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
        ] + ['Cavia', 'The Hex']
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
    P('<bp>-</bp> <item>Item Info</item>: Show item info')
    P('<bp>-</bp> <item>Relic Plat</item>: Gives expected plat for specific relic (set)')
    P('<bp>-</bp> <item>Relic Item</item>: Get all relics containing item and give expected plat')
    P('<bp>-</bp> <item>Syndicate</item>: Show syndicate item market price')
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
        'Syndicate': syndicate_function,
        'Transient Reward': transient_mission_reward_function,
        'Quit': quit_function,
        'quit': quit_function
    }
    print_welcome_message()
    function_selecter = WordCompleter(list(function.keys()), ignore_case=True, sentence=True, match_middle=True)
    while True:
        text = prompt('Enter function: ', completer=function_selecter)
        if text in ['Quit', 'quit']:
            break
        elif text not in function:
            print_formatted_text(HTML('Function not found.'))
        else:
            function[text]()