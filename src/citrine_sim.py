"""
simulates citrine farm
"""

from datetime import timedelta
from warframe_market import retry_request, get_market_items_name_map, prepare_market_items
from util import tqdm_joblib, str_type
from tqdm import tqdm
import json
from collections import defaultdict
import numpy as np

from joblib import Parallel, delayed
"""
Prepare some data
"""
def get_citrine_reward_pool() -> dict[list[str]]:
    mission_reward = retry_request('https://drops.warframestat.us/data/missionRewards.json')
    mission_reward = json.loads(mission_reward.content)['missionRewards']['Mars']['Tyana Pass']
    return mission_reward

class ItemPool:
    def __init__(self, ls: list[dict]):
        """
            ls: e.g., 
            [
                {'_id': '1178cea0b019b90a65310da2f026cc35', 'itemName': 'Neo W2 Relic', 'rarity': 'Rare', 'chance': 6.25},
                ...
            ]
        """
        self.item_names = [item['itemName'] for item in ls]
        self.item_chances = [item['chance'] / 100 for item in ls]

    def get_reward(self) -> str:
        return self.item_names[
            np.random.choice(len(self.item_names), p=self.item_chances)
        ]

citrine_reward_pool = get_citrine_reward_pool()
A_reward_pool = ItemPool(citrine_reward_pool['rewards']['A'])    
B_reward_pool = ItemPool(citrine_reward_pool['rewards']['B'])
C_reward_pool = ItemPool(citrine_reward_pool['rewards']['C'])

time_const = {
    'full round': timedelta(minutes=24),    # (2.5 + 0.5) * 2 min per round
}

class Inventory:
    """
        basically representing a set of items

        supports:
            inv1 + inv2
            inv1 += inv2
            inv1 * n
            inv1 *= n
            inv1[item] = count
            inv1[item] += count
    """
    def __init__(self, items: dict[str, int] | None = None):
        self.items = defaultdict(int)
        if items is not None:
            for item, count in items.items():
                self.items[item] = count

    def add_item(self, item: str, count: int):
        self.items[item] += count
    
    def has_enough_items(self, inventory: 'Inventory') -> bool:
        for item, count in inventory.items.items():
            if self.items[item] < count:
                return False
        return True
    
    def lack_items(self, inventory: 'Inventory') -> 'Inventory':
        """
            return what items are `self` lacking compared to `inventory`
            i.e., (self + self.lack_items(inventory)).has_enough_items(inventory) == True
        """
        new_inventory = Inventory()
        for item, count in inventory.items.items():
            if self.items[item] < count:
                new_inventory.add_item(item, count - self.items[item])
        return new_inventory

    def __add__(self, other):
        new_inventory = Inventory()
        new_inventory.items = self.items.copy()
        for item, count in other.items.items():
            new_inventory.add_item(item, count)
        return new_inventory

    def __iadd__(self, other):
        for item, count in other.items.items():
            self.add_item(item, count)
        return self

    def __mul__(self, other: int):
        new_inventory = Inventory()
        for item, count in self.items.items():
            new_inventory.add_item(item, count * other)
        return new_inventory

    def __imul__(self, other: int):
        for item, count in self.items.items():
            self.items[item] *= other
        return self

    def __getitem__(self, item: str) -> int:
        return self.items[item]

    def __setitem__(self, item: str, count: int):
        self.items[item] = count

    def __iter__(self):
        return iter(self.items.items())

    def __str__(self):
        return str(self.items)
    
    def __repr__(self):
        return str(self.items)

# with these you literally never have to do the farm again
required_items = Inventory({
    'Corufell Blueprint': 1,
    'Corufell Barrel': 1,
    'Corufell Handle': 1,
    'Corufell Receiver': 1,
    'Steflos Blueprint': 1,
    'Steflos Barrel': 1,
    'Steflos Receiver': 1,
    'Steflos Stock': 1,
    'Citrine Blueprint': 2,
    'Citrine Chassis Blueprint': 2,
    'Citrine Neuroptics Blueprint': 2,
    'Citrine Systems Blueprint': 2,
    'Primary Plated Round': 21,
    'Secondary Kinship': 21,
    'Secondary Encumber': 21,
    'Arcane Double Back': 21,
    'Arcane Steadfast': 21,
})

price = {
    'Corufell Blueprint': Inventory({'blue': 300, 'red': 500}),
    'Corufell Barrel': Inventory({'blue': 150, 'red': 250}),
    'Corufell Handle': Inventory({'blue': 150, 'red': 250}),
    'Corufell Receiver': Inventory({'blue': 150, 'red': 250}),
    'Steflos Blueprint': Inventory({'blue': 500, 'red': 300}),
    'Steflos Barrel': Inventory({'blue': 250, 'red': 150}),
    'Steflos Receiver': Inventory({'blue': 250, 'red': 150}),
    'Steflos Stock': Inventory({'blue': 250, 'red': 150}),
    'Citrine Blueprint': Inventory({'blue': 500, 'red': 500}),
    'Citrine Chassis Blueprint': Inventory({'blue': 350, 'red': 350}),
    'Citrine Neuroptics Blueprint': Inventory({'blue': 350, 'red': 350}),
    'Citrine Systems Blueprint': Inventory({'blue': 350, 'red': 350}),
    'Primary Plated Round': Inventory({'blue': 60, 'red': 60}),
    'Secondary Kinship': Inventory({'blue': 60, 'red': 60}),
    'Secondary Encumber': Inventory({'blue': 60, 'red': 60}),
    'Arcane Double Back': Inventory({'blue': 60, 'red': 60}),
    'Arcane Steadfast': Inventory({'blue': 60, 'red': 60}),
}

def simulate_citrine_farm_time() -> timedelta:
    """
    Simulates the Citrine farm.
    Returns the time taken to farm all things in required_items.
    """
    inventory = Inventory({})
    time = timedelta(seconds=0)

    while True:
        # do a full round
        time += time_const['full round']

        # get rewards
        inventory.add_item(A_reward_pool.get_reward(), 1)
        inventory.add_item(A_reward_pool.get_reward(), 1)
        inventory.add_item(B_reward_pool.get_reward(), 1)
        inventory.add_item(C_reward_pool.get_reward(), 1)
        inventory.add_item('blue', 110)
        inventory.add_item('red', 110)

        # check if we have enough items
        if inventory.has_enough_items(required_items):
            break

        # see how much blue / red do we still need
        need_inventory = inventory.lack_items(required_items)
        shard_inventory = Inventory()
        for item_name, item_count in need_inventory:
            shard_inventory += price[item_name] * item_count
        
        # see if we have enough shards
        if inventory.has_enough_items(shard_inventory):
            break
    
    return time

if __name__ == '__main__':
    print(f'We aim to farm: {json.dumps(required_items.items, indent=4)}')

    n_simulation = 10000

    with tqdm_joblib(tqdm(desc='Simulating citrine farm...', total=n_simulation)) as pbar:
        # simulate citrine farm time
        citrine_farm_time = sum(
            Parallel(n_jobs=4)(delayed(simulate_citrine_farm_time)() for _ in range(n_simulation)), timedelta()
        ) / n_simulation

    print(f'Simulated {n_simulation} times Citrine farm. The average time of farming all required items is {citrine_farm_time}')

    # find the price of items
    print(f'We need 740p for the Citrine set and 325 for one Citrine.')
    plat = 740 + 325   # for the weapon and 2 citrines
    arcanes = [
        'Primary Plated Round',
        'Secondary Kinship',
        'Secondary Encumber',
        'Arcane Double Back',
        'Arcane Steadfast'
    ]

    print(f'fetching arcane price...')
    market_item_map = get_market_items_name_map()
    prepare_market_items([market_item_map[arcane] for arcane in arcanes])

    print(f'The average arcane price for the past 90 days is:')
    for arcane in arcanes:
        arcane_price = market_item_map[arcane].price.get_avg_median_price_for_last_days(90)
        print(f'- {arcane}: {arcane_price:.3f}p / arcane')
        plat += arcane_price * 21

    plat = int(plat)
    print(f'The total price of the weapons, warframes, and 21 arcanes each is: {int(plat)}p')
    print(f'The average plat per minute if you do the farm would be {plat / citrine_farm_time.total_seconds() * 60}p')
    print(f'which is absolute shit imo.')

