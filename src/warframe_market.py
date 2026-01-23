from dataclasses import dataclass
import json
import re
import itertools
from lxml import etree
import requests
from joblib import Parallel, delayed
import time
import random
import datetime
import math
import itertools
import statistics
from collections import defaultdict
from typing import *

from .data.syndicate_data import additional_syndicates

from . import util
from tqdm import tqdm

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
RETRY_MAX_TIME = 3
def retry_request(*args, **kwargs):
    """
        automatically retry request until the request is done.
        this is to retry whenever too many requests happens
    """
    while True:
        r = requests.get(*args, **kwargs)

        if r.status_code == 200:
            break

        # wait a random time because there may be multiple requests
        # at the exact same time as this
        time.sleep(random.uniform(0, RETRY_MAX_TIME))
    return r

class Orders:
    """
        existing orders on warframe market
        note that this is a list for SAME ITEM ID orders
    """

    @dataclass
    class Order():
        item_id: str
        order_type: str
        visible: bool
        platinum: int
        quantity: int
        user_reputation: int
        user_status: str
        user_in_game_name: str
        user_slug: str
        user_id: str
        mod_rank: int

        @property
        def is_sell(self):
            return self.order_type == 'sell'
        
        @property
        def is_buy(self):
            return self.order_type == 'buy'
        
        @property
        def is_ingame(self):
            return self.user_status == 'ingame'

    def __init__(self, order_json, version: Literal['v1', 'v2'] = 'v2'):
        """
            order_json: is a list of dict that has keys like [visible, user, quantity, ...] 
        """

        self.orders: list[self.Order] = []
        if version == 'v1':
            for order in order_json:
                cur_order = self.Order(**{
                    'item_id': None,    # not supported
                    'order_type': order['order_type'],
                    'visible': order['visible'],
                    'platinum': order['platinum'],
                    'quantity': order['quantity'],
                    'user_reputation': order['user']['reputation'],
                    'user_status': order['user']['status'], # can be ['offline', 'online', 'ingame']
                    'user_in_game_name': order['user']['ingame_name'],
                    'user_slug': order['user']['slug'],
                    'user_id': order['user']['id'],
                    'mod_rank': order.get('mod_rank', 0)
                })
                self.orders.append(cur_order)
        elif version == 'v2':
            for order in order_json:
                cur_order = self.Order(**{
                    'item_id': order['itemId'],
                    'order_type': order['type'],
                    'visible': order['visible'],
                    'platinum': order['platinum'],
                    'quantity': order['quantity'],
                    'user_reputation': order['user']['reputation'],
                    'user_status': order['user']['status'], # can be ['offline', 'online', 'ingame']
                    'user_in_game_name': order['user']['ingameName'],
                    'user_slug': order['user']['slug'],
                    'user_id': order['user']['id'],
                    'mod_rank': order.get('mod_rank', 0)
                })
                self.orders.append(cur_order)
        else:
            raise ValueError("version must be either 'v1' or 'v2'")
            
    def get_ingame_lowest_sell_price(self, mod_rank_range: list | range = [0]):
        return min([
            order.platinum for order in self.orders
            if order.is_sell and order.visible and order.is_ingame and order.mod_rank in mod_rank_range 
        ] + [1000000])
    def get_ingame_highest_buy_price(self, mod_rank_range: list | range = [0]):
        return max([
            order.platinum for order in self.orders
            if order.is_buy and order.visible and order.is_ingame and order.mod_rank in mod_rank_range 
        ] + [-1])
    def get_ingame_bottomK_sell_price(self, k: int, mod_rank_range: list | range = [0]):
        sell_list = sorted([
            (order.platinum, order.quantity) for order in self.orders
            if order.is_sell and order.visible and order.is_ingame and order.mod_rank in mod_rank_range 
        ])
        return sell_list[:k]
    def get_ingame_topK_buy_price(self, k: int, mod_rank_range: list | range = [0]):
        buy_list = sorted([
            (order.platinum, order.quantity) for order in self.orders
            if order.is_buy and order.visible and order.is_ingame and order.mod_rank in mod_rank_range 
        ], reverse=True)
        return buy_list[:k]

class Statistic:
    """
        statistics for the past 48hr / 90days on warframe market
    """
    def __init__(self, statistic_json: dict, basis_time: datetime.datetime | None = None):
        """
            statistic_json: 
                a dict that has keys [statistics_closed, statistics_opened]
                meaning the deals closed / opened at that timeslot

                they both has heys [48hours, 90days], with each item as a timeslot
                of an hour and a day.

                for statistics_closed (i.e., the price chart on warframe.market),
                it has something like this:
                {
                    "datetime": "2024-07-29T07:00:00.000+00:00",    # that timepoint
                    "volume": 1, # the volume at the bottom of the chart
                    "min_price": 15,  # for candle chart
                    "max_price": 15,
                    "open_price": 15,
                    "closed_price": 15,
                    "avg_price": 15.0,  # for average chart
                    "wa_price": 15.0,  # (idk, is this even on the chart)
                    "median": 15,   # median / blue line
                    "moving_avg": 12.8,  # SMA / black line
                    "donch_top": 15,  # the grey area in the chart
                    "donch_bot": 10,
                    "id": "66a74c44bba77400155161b8",
                    "mod_rank": a number
                },
                note that the json MIGHT sort timeslot in ascending order so...take note of that
                the 90days timeslot will only record up until the last time 00:00 UTC happens
                so might not be the exact newest data (with data age at most 24 hours)
        """

        # TODO: deal with statistics
        self.statistics = statistic_json.copy()
        self.basis_time = basis_time

        # change datetime into actual datetime object
        for stat_type in self.statistics:
            for timeframe_type in self.statistics[stat_type]:
                for stat in self.statistics[stat_type][timeframe_type]:
                    stat['datetime'] = datetime.datetime.fromisoformat(stat['datetime'])
                    stat['mod_rank'] = stat.get('mod_rank', 0)

    """
        Statistic filtering, should be given **stat_filter:
            - basis_time: we filter the timestamp by going back N hours / days from the basis time. 
                          we define the basis time (that we calculate the "last N hours" for) as:
                            - basis_time, if it is not None.
                            - self.basis_time, if it is not None.
                            - datatime.datetime.now()
            - mod_rank_range: the mod rank range we wanna filter the statistic for
                              if it is not a mod then its rank is 0 (which is the default option,
                              you don't need to give this filter in that case).
                              theoretically should only have 2 options: 0 and max rank, but due to
                              future proof and the fact that i don't know what an item's max rank is,
                              you can set this as [0] or range(1, 100) to filter these 2 cases for now 
                              (or range(100) if you specifically want all the mod ranks)
    """

    def get_stat_for_last_hours(self, hours: int, 
                                basis_time: datetime.datetime | None = None,
                                mod_rank_range: list | range = [0]):
        """
            get the closed trade stat for the last {hours} hours
            hours in range [1, 48], might not be up to 48 because it depends on
            how many timeslots the API sends back for 48hours.
            
            there must be some error because the records is made on the hour

            may return empty list
        """
        if basis_time is None:
            if self.basis_time is None:
                basis_time = datetime.datetime.now(datetime.timezone.utc)
            else:
                basis_time = self.basis_time

        valid_stat = [
            stat for stat in self.statistics['statistics_closed']['48hours']
            if stat['datetime'] > basis_time - datetime.timedelta(hours=hours)
            and stat['mod_rank'] in mod_rank_range
        ]

        return valid_stat

    def get_stat_for_last_days(self, days: int, 
                               basis_time: datetime.datetime | None = None,
                               mod_rank_range: list | range = [0]):
        """
            get the closed trade stat for the last {days} days
            days in range [1, 90], might not be up to 90 because it depends on
            how many timeslots the API sends back for 90days.

            the records are made on the day in UTC

            some details refer to get_volume_for_last_hours
            may return empty list
        """
        if basis_time is None:
            if self.basis_time is None:
                basis_time = datetime.datetime.now(datetime.timezone.utc)
            else:
                basis_time = self.basis_time

        valid_stats = [
            stat for stat in self.statistics['statistics_closed']['90days']
            if stat['datetime'] > basis_time - datetime.timedelta(days=days)
            and stat['mod_rank'] in mod_rank_range
        ]

        return valid_stats
    
    def get_stat_before_last_days(self, days: int, 
                               basis_time: datetime.datetime | None = None,
                               mod_rank_range: list | range = [0]):
        """
            get the closed trade stat before {days} days
            days in range [1, 90], might not be up to 90 because it depends on
            how many timeslots the API sends back for 90days.

            the records are made on the day in UTC

            some details refer to get_volume_for_last_hours
            may return empty list
        """
        if basis_time is None:
            if self.basis_time is None:
                basis_time = datetime.datetime.now(datetime.timezone.utc)
            else:
                basis_time = self.basis_time

        valid_stats = [
            stat for stat in self.statistics['statistics_closed']['90days']
            if stat['datetime'] < basis_time - datetime.timedelta(days=days)
            and stat['mod_rank'] in mod_rank_range
        ]

        return valid_stats

    """
        The actual statistic calculation part.
        Can give kwarg **stat_filter to use the above stat, or if there isn't any,
        it should do the filtering itself.
        Must handle the case where get_stat_for_last_*() returns an empty list
    """

    def get_volume_for_last_hours(self, hours: int, **stat_filter):
        """
            get the closed trade volume for the last {hours} hours
            hours in range [1, 48], might not be up to 48 because it depends on
            how many timeslots the API sends back for 48hours.
            
            there must be some error because the records is made on the hour
        """
        stats = self.get_stat_for_last_hours(hours, **stat_filter)
        return sum([stat['volume'] for stat in stats])
    
    def get_volume_for_last_days(self, days: int, **stat_filter):
        """
            get the closed trade volume for the last {days} days
            days in range [1, 90], might not be up to 90 because it depends on
            how many timeslots the API sends back for 90days.

            the records are made on the day in UTC

            some details refer to get_volume_for_last_hours
        """
        stats = self.get_stat_for_last_days(days, **stat_filter)
        return sum([stat['volume'] for stat in stats])

class PriceOracle:
    """
        calculate the price for the given item
    """
    def __init__(self, item, orders: Orders, statistic: Statistic):
        self.item = item
        self.orders = orders
        self.statistic = statistic
    
    def get_avg_median_price_for_last_hours(self, hours: int, ratio: float = 1, **stat_filter):
        """
            don't take the volume into account, everything is based on medians in a timeframe
            ratio: pick the top `ratio` median prices to calculate average, 
        """
        stats = self.statistic.get_stat_for_last_hours(hours, **stat_filter)
        if len(stats) == 0:
            return 0
        medians = [stat['median'] for stat in stats]
        top_medians = sorted(medians, reverse=True)[:int(len(medians) * ratio)]
        if len(medians) == 0:
            return sum(medians) / len(medians)
        return sum(top_medians) / len(top_medians)
    
    def get_avg_median_price_for_last_days(self, days: int, **stat_filter):
        stats = self.statistic.get_stat_for_last_days(days, **stat_filter)
        if len(stats) == 0:
            return 0
        return sum([stat['median'] for stat in stats]) / len(stats)
    
    def get_top_k_median_price_for_last_hours(self, hours: int, ratio: float = 1, **stat_filter):
        """
            actually take the volume into account
            ratio: pick the top `ratio` prices to calculate average
        """
        stats = self.statistic.get_stat_for_last_hours(hours, **stat_filter)
        if len(stats) == 0:
            return 0
        
        prices = [[stat['median']] * stat['volume'] for stat in stats]
        prices = list(itertools.chain.from_iterable(prices))
        prices = sorted(prices, reverse=True)

        top_K = prices[:int(len(prices) * ratio)]
        if len(top_K) == 0:
            return statistics.median(prices)
        return statistics.median(top_K)
    
    def get_top_k_avg_price_for_last_hours(self, hours: int, ratio: float = 1, **stat_filter):
        """
            actually take the volume into account
            ratio: pick the top `ratio` prices to calculate average
        """
        stats = self.statistic.get_stat_for_last_hours(hours, **stat_filter)
        if len(stats) == 0:
            return 0
        
        prices = [[stat['median']] * stat['volume'] for stat in stats]
        prices = list(itertools.chain.from_iterable(prices))
        prices = sorted(prices, reverse=True)

        top_K = prices[:int(len(prices) * ratio)]
        if len(top_K) == 0:
            return statistics.mean(prices)
        return statistics.mean(top_K)
    
    def get_bottom_k_avg_price_for_last_hours(self, hours: int, ratio: float = 1, **stat_filter):
        """
            actually take the volume into account
            ratio: pick the top `ratio` prices to calculate average
        """
        stats = self.statistic.get_stat_for_last_hours(hours, **stat_filter)
        if len(stats) == 0:
            return 0
        
        prices = [[stat['median']] * stat['volume'] for stat in stats]
        prices = list(itertools.chain.from_iterable(prices))
        prices = sorted(prices, reverse=False)

        top_K = prices[:int(len(prices) * ratio)]
        if len(top_K) == 0:
            return statistics.mean(prices)
        return statistics.mean(top_K)
    
    def get_top_k_median_price_before_last_days(self, days: int, ratio: float = 1, **stat_filter):
        """
            actually take the volume into account
            ratio: pick the top `ratio` prices to calculate average
        """
        stats = self.statistic.get_stat_before_last_days(days, **stat_filter)
        if len(stats) == 0:
            return 0
        
        prices = [[stat['median']] * stat['volume'] for stat in stats]
        prices = list(itertools.chain.from_iterable(prices))
        prices = sorted(prices, reverse=True)

        top_K = prices[:int(len(prices) * ratio)]
        if len(top_K) == 0:
            return statistics.median(prices)
        return statistics.median(top_K)
    
    def get_cur_lowest_price(self, **stat_filter):
        """
            For the best price that probably applies to everything
            must be prepare()-ed first
        """
        return self.orders.get_ingame_lowest_sell_price(mod_rank_range=stat_filter.get('mod_rank_range', [0]))

    def get_oracle_price_48hrs(self, **stat_filter):
        """
            For the best price that probably applies to everything
            must be prepare()-ed first
        """
        # return self.get_avg_median_price_for_last_hours(48, 0.5, **stat_filter)
        return self.get_top_k_avg_price_for_last_hours(48, 0.3, **stat_filter)
        # return self.get_top_k_avg_price_for_last_hours(48, 1, **stat_filter)
        # return self.get_top_k_median_price_before_last_days(25, 0.3, **stat_filter)
        # price = self.get_top_k_avg_price_for_last_hours(8, 1, **stat_filter)
        # if price > 0: return price

        # price = self.get_top_k_avg_price_for_last_hours(48, 0.3, **stat_filter)
        # if price > 0: return price

        # return self.orders.get_ingame_topK_buy_price(5, mod_rank_range=stat_filter.get('mod_rank_range', [0]))

@dataclass
class MarketItem:
    """
    Defines an item in the market

    Attributes:
        id (str): The id in game (or on warframe.market?), a hex string
        url_name (str): The name of this item appeared in the URL, also called slug
        thumb (Optional[str]): The thumbnail URL of this item
        item_name (str): The proper item name you can see and search on warframe.market
        tags (list[str]): The tags from warframe.market to identify some of the traits of this item, ref. note below
        game_ref (str): The reference string for the item in-game
        orders (Optional[Order]): The order object for this item. Need to be prepare() first
        statistic (Optional[Statistic]): The statistic object for this item. Need to be prepare() first
        price (Optional[PriceOracle]): The price oracle object for this item. Need to be prepare() first
        is_mod_info_available (bool): Whether the mod related information is available. If it is not, do not access
                                      the below 2 attributes
        is_mod (bool): Whether this item is a mod or not. Only accessible if `is_mod_info_available`.
                       Note that some other things (e.g., arcane) also count as mods. Basically anything that has
                       a "Rank (All / Maxed)" option will have this boolean as True
        mod_max_rank (int): The max rank of this item. Only accessible if `is_mod_info_available and is_mod`

    Note:
        - The tags are basically defined by warframe.market. They might have in-game counterparts, but the name is mostly
          by warframe.market
          The possible tags are:
            - General types (a rough list),
                e.g., 'gem', 'fish', 'arcane_enhancement', 'mod', 'misc', 'key' (alad v assassination), 
                'syndicate' (no augment mods), 'veiled_riven', 'damaged' (necramech parts), 'locator' (grendel stuff), 
                'triangulator' (weird), 'weapon' (mostly for prime parts), 'warframe' (for prime parts and mods),
                'consumable' (mostly antitoxin), 'scene', 'emote', 'ayatan_star', 'imprint', 'focus', 'lens' (these 2 often appear together)
            - Weapon types (typically for mods), e.g., 'assult_rifle', 'primary'
            - Rarity, e.g., 'common', 'uncommon', 'rare', 'legendary'
            - Relic types, e.g., 'axi'
            - Mods (sometimes arcanes) marked that can only be equipped for something, 
                e.g., 'pistol_(no_aoe)', 'warframe', 'excalibur', 'dread', 'operator'
            - Special markers for stuff, e.g., 'blueprint', 'component'
          If you need a list of all the tags:
            >>> set(itertools.chain(*[i.tags for i in market_items]))
          Since we can't really afford sorting all of these manually, if you wanna check something (e.g., whether a thing is arcane),
          we don't have special functions for that, please just do `'arcane_enhancement' in item.tags`
    """
    
    id: Any
    url_name: Any
    thumb: Any
    item_name: Any
    orders: Any
    statistic: Any
    price: Any
    is_mod_info_available: Any
    is_mod: Any
    mod_max_rank: Any
    
    def __init__(self, market_json: dict, api_version: str = 'v2'):
        """
            market_json: differs according to API version 
                'v1': has keys like ['id', 'url_name', 'thumb', 'item_name']
                'v2': {Dict[len=7](
                    "id": "62a2baebfbd62c00450b71d9",
                    "slug": "molt_augmented",
                    "gameRef": "/Lotus/Upgrades/CosmeticEnhancers/Offensive/PowerStrengthOnKill",
                    "tags": List[len=2](
                        "rare",
                        "arcane_enhancement"
                    ),
                    "bulkTradable": True,
                    "maxRank": 5,
                    "i18n": Dict[len=1](
                        "en": Dict[len=3](
                            "name": "Molt Augmented",
                            "icon": "items/images/en/molt_augmented.9def654a0d24b7f085940dfc8ef843b5.png",
                            "thumb": "items/images/en/thumbs/molt_augmented.9def654a0d24b7f085940dfc8ef843b5.128x128.png"
                        )
                    )
                )
        """
        if api_version == 'v1':
            # mostly deprecated, don't maintain this
            self.id = market_json['id']
            self.url_name = market_json['url_name']
            self.thumb = market_json['']
            self.item_name = market_json['item_name']
            self.orders: Orders | None = None
            self.statistic: Statistic | None = None
            self.price: PriceOracle | None = None
            self.is_mod_info_available = False
            self.is_mod = None
            self.mod_max_rank = None
        
        elif api_version == 'v2':
            self.id = market_json['id']
            self.url_name = market_json['slug']
            self.thumb = market_json['i18n']['en'].get('thumb', None)
            self.icon = market_json['i18n']['en'].get('icon', None)
            self.item_name = market_json['i18n']['en']['name']
            self.tags = market_json['tags']
            self.game_ref = market_json['gameRef']
            self.is_mod_info_available = True
            self.is_mod = ('maxRank' in market_json)
            self.mod_max_rank = market_json.get('maxRank', 0)

            # the below needs to be prepare()-ed first
            self.prepare_datetime = None
            self.wiki_link = None
            self.description = None
            self.orders = None
            self.statistic = None
            self.price = None

    def _get_orders(self):
        # r = retry_request(f'https://api.warframe.market/v1/items/{self.url_name}/orders', headers={
        #     'accept': 'application/json',
        #     'Platform': 'pc',
        #     'User-agent': USER_AGENT
        # })

        # return Orders(json.loads(r.content)['payload']['orders'], version='v1')
        r = retry_request(f'https://api.warframe.market/v2/orders/item/{self.url_name}', headers={
            'accept': 'application/json',
            'Platform': 'pc',
            'User-agent': USER_AGENT
        })

        return Orders(json.loads(r.content)['data'], version='v2')

    def _get_statistic(self):
        r = retry_request(f'https://api.warframe.market/v1/items/{self.url_name}/statistics', headers={
            'accept': 'application/json',
            'Platform': 'pc',
            'User-agent': USER_AGENT
        })

        return Statistic(json.loads(r.content)['payload'])
    
    def _get_other_item_info(self):
        # get wiki link from drops.warframestat.us
        r = retry_request(f'https://api.warframe.market/v2/item/{self.url_name}')
        items_data = json.loads(r.content)['data']
        self.wiki_link = items_data['i18n']['en'].get('wikiLink', None)
        self.description = items_data['i18n']['en'].get('description', None)

    def prepare(self):
        """
            fetch anything it can first and store inside itself
            please don't get_order or get_statistics yourself
        """
        self.orders = self._get_orders()
        self.statistic = self._get_statistic()
        self.price = PriceOracle(self, self.orders, self.statistic)
        self._get_other_item_info()
        self.prepare_datetime = datetime.datetime.now()

        return self.orders, self.statistic, self.price

    def get_wfm_url(self):
        """
            make warframe market URL
        """
        return f"https://warframe.market/items/{self.url_name}"
    
    def get_thumbnail_url(self):
        """
            get thumbnail URL
        """
        return f"https://warframe.market/static/assets/{self.thumb}"
    
    def get_icon_url(self):
        """
            get icon URL
        """
        return f"https://warframe.market/static/assets/{self.icon}"
    
    def __str__(self):
        return f'<MarketItem "{self.item_name}">'
    def __repr__(self):
        return f'<MarketItem "{self.item_name}">'

class User:
    """
    a user on the market
    """
    def __init__(self, user_slug: str = None, user_id: str = None):
        self.user_slug = user_slug
        self.user_id = user_id
        self.user_ingame_name = None
        self.orders = None
    
    def fetch_data(self):
        # TODO: maybe should've used Order...? maybe not tbh
        if self.user_id is not None:
            order_r = retry_request(f'https://api.warframe.market/v2/orders/userId/{self.user_id}', headers={
                'accept': 'application/json',
                'Platform': 'pc',
                'User-agent': USER_AGENT
            })  
            user_r = retry_request(f'https://api.warframe.market/v2/userId/{self.user_id}', headers={
                'accept': 'application/json',
                'Platform': 'pc',
                'User-agent': USER_AGENT
            })  
            
        elif self.user_slug is not None:
            order_r = retry_request(f'https://api.warframe.market/v2/orders/user/{self.user_slug}', headers={
                'accept': 'application/json',
                'Platform': 'pc',
                'User-agent': USER_AGENT
            })
            user_r = retry_request(f'https://api.warframe.market/v2/user/{self.user_slug}', headers={
                'accept': 'application/json',
                'Platform': 'pc',
                'User-agent': USER_AGENT
            })
        else:
            raise ValueError("Either user_slug or user_id must be provided")

        self.user_id = json.loads(user_r.content)['data']['id']
        self.user_slug = json.loads(user_r.content)['data']['slug']
        self.user_ingame_name = json.loads(user_r.content)['data']['ingameName']
        self.orders = [
            {
                'item_id': order['itemId'],
                'order_type': order['type'],
                'visible': order['visible'],
                'platinum': order['platinum'],
                'quantity': order['quantity'],
            }
            for order in json.loads(order_r.content)['data']
        ]

def get_market_item_list() -> list[MarketItem]:
    r = retry_request('https://api.warframe.market/v2/items', headers={
        'accept': 'application/json',
        'Language': 'en',
        'User-agent': USER_AGENT
    })
    # items = json.loads(r.content)['payload']['items']   # for v1
    items = json.loads(r.content)['data']
    return [MarketItem(i, api_version='v2') for i in items]

def prepare_market_items(market_items: list[MarketItem]):
    "does parallel"
    def task(item: MarketItem):
        item.prepare()
        return item
    
    with util.tqdm_joblib(tqdm(range(len(market_items)), 'Fetching items...', leave=False)) as tqdm_progress:
        results = Parallel(n_jobs=5, require='sharedmem')(delayed(task)(item) for item in market_items)

    for i in range(len(market_items)):
        market_items[i] = results[i]

def fetch_users_data(user_ls: list[User]):
    "does parallel"
    def task(user: User):
        user.fetch_data()
        return user
    
    with util.tqdm_joblib(tqdm(range(len(user_ls)), 'Fetching users...')) as tqdm_progress:
        results = Parallel(n_jobs=5, require='sharedmem')(delayed(task)(user) for user in user_ls)

    for i in range(len(user_ls)):
        user_ls[i] = results[i]

def get_syndicate_names() -> list[str]:
    """
    get supported syndicate names

    e.g., [
        "Arbiters of Hexis", "Steel Meridian", "The Quills", "NecraLoid", "Vox Solaris", "Ventkids", 
        "Cephalon Simaris", "New Loka", "Cephalon Suda", "Red Veil", "The Perrin Sequence", 
        "Solaris United", "Entrati", "Ostron", "The Holdfasts", "Kahl's Garrison", "Operational Supply", 
        "Conclave",
    ] + ['Cavia']
    """

    r = requests.get('https://drops.warframestat.us/data/syndicates.json')
    syndicate_names = json.loads(r.content)['syndicates'].keys()

    return syndicate_names + additional_syndicates.keys()

def get_syndicate_items(syndicate_name: str, market_map: None | list[MarketItem] = None) -> list[MarketItem]:
    """
    get syndicate items from drops.warframestat.us
    ref. https://github.com/WFCD/warframe-drop-data

    return list of MarketItem
    """

    if market_map is None:
        market_map = get_market_items_name_map()

    syndicate_item_names: list[str] = None
    if syndicate_name in additional_syndicates:
        syndicate_item_names = additional_syndicates[syndicate_name]['names']
    else:
        r = requests.get('https://drops.warframestat.us/data/syndicates.json')
        syndicate_item_names = json.loads(r.content)['syndicates'][syndicate_name]
        syndicate_item_names = [i['item'] for i in syndicate_item_names]
    
    # deal with warframe mods that has trailing names and parenthesis in them
    parenthesis_item_names = [
        name[:name.index('(') - 1]
        for name in syndicate_item_names if '(' in name
    ]
    syndicate_item_names = set(syndicate_item_names) | set(parenthesis_item_names)

    syndicate_item_names = syndicate_item_names & set(market_map.keys())

    return [market_map[name] for name in syndicate_item_names]

def get_all_syndicate_items(market_map: None | list[MarketItem] = None) -> dict[str, list[MarketItem]]:
    """
    return item list for all syndicate

    return {syndicate name -> list of MarketItem}
    """

    if market_map is None:
        market_map = get_market_items_name_map()

    syndicate_map = {}

    r = requests.get('https://drops.warframestat.us/data/syndicates.json')
    syndicates = json.loads(r.content)['syndicates']

    for syndicate_name in list(syndicates.keys()) + list(additional_syndicates.keys()):
        syndicate_item_names: list[str] = None
        if syndicate_name in additional_syndicates:
            syndicate_item_names = additional_syndicates[syndicate_name]['names']
        else:
            syndicate_item_names = syndicates[syndicate_name]
            syndicate_item_names = [i['item'] for i in syndicate_item_names]
        
        # deal with warframe mods that has trailing names and parenthesis in them
        parenthesis_item_names = [
            name[:name.index('(') - 1]
            for name in syndicate_item_names if '(' in name
        ]
        syndicate_item_names = set(syndicate_item_names) | set(parenthesis_item_names)

        syndicate_item_names = syndicate_item_names & set(market_map.keys())

        syndicate_map[syndicate_name] = [market_map[name] for name in syndicate_item_names]

    return syndicate_map

def get_market_items_name_map(market_items: None | list[MarketItem] = None) -> dict[str, MarketItem]:
    if market_items is None:
        market_items = get_market_item_list()
    return {i.item_name: i for i in market_items}

def get_market_items_id_map(market_items: None | list[MarketItem] = None) -> dict[str, MarketItem]:
    if market_items is None:
        market_items = get_market_item_list()
    return {i.id: i for i in market_items}

def get_relic_data(discard_forma: bool = False) -> dict[str, dict[str, list[str]]]:
    """
        only fetch from drops.warframestat.us
        if you have any other manually recorded data then do it on your own

        discard_forma: doesn't contain forma information if true

        return {relic name -> {rarity: list of items}}
    """
    r = retry_request('https://drops.warframestat.us/data/relics.json')
    relic_data_ls = json.loads(r.content)['relics']
    relic_map = {}
    for relic_data in relic_data_ls:
        if relic_data['state'] != 'Intact':
            continue    # we only want the list of items

        relic = {"Common": [], "Uncommon": [], "Rare": []}
        for reward in relic_data['rewards']:
            if discard_forma and 'Forma Blueprint' in reward['itemName']:
                continue
            
            # filter by chance: [25.33, 11, 2], use 20, 5 as a bound
            if reward['chance'] > 20:
                relic['Common'].append(reward['itemName'])
            elif reward['chance'] > 5:
                relic['Uncommon'].append(reward['itemName'])
            else:
                relic['Rare'].append(reward['itemName'])
        try:
            relic_map[f"{relic_data['tier']} {relic_data['relicName']}"] = relic
        except:
            print("Failed to add relic:", relic_data)

    return relic_map

def get_transient_mission_rewards() -> dict[str, list[str]]:
    """
        only fetch from drops.warframestat.us
        if you have any other manually recorded data then do it on your own

        return {node name -> {rotation -> list of {item_name, rarity, chance}}}
    """
    mission_reward = retry_request('https://drops.warframestat.us/data/transientRewards.json')
    mission_reward = json.loads(mission_reward.content)['transientRewards']
    ret_reward = {}
    for mission in mission_reward:
        rewards = defaultdict(list)
        for reward in mission['rewards']:
            if 'rotation' not in reward:
                rewards['no_rotation'].append({
                    'item_name': reward['itemName'],
                    'rarity': reward['rarity'],
                    'chance': reward['chance'] / 100
                })
            else:
                rewards[reward['rotation']].append({
                    'item_name': reward['itemName'],
                    'rarity': reward['rarity'],
                    'chance': reward['chance'] / 100
                })
        ret_reward[mission['objectiveName']] = dict(rewards)
    return ret_reward

def get_varzia_relics() -> list[str]:
    """
    get the list of relics that varzia sells for now
    note that this data comes from https://wiki.warframe.com/w/Varzia, which means:
    (1) it might not be up-to-date
    (2) if the webpage is changed then this function might break
    """
    try:
        r = requests.get("https://wiki.warframe.com/w/Varzia")
        html = etree.HTML(r.content)
        a = html.xpath("//*[@id='mw-customcollapsible-vrelics']//td//text()")   # ['\xa0', 'Lith\xa0A1', '\n', '☒', '\n', '\xa0', 'Lith\xa0A2', '\n', '☒', '\n'], ...
        a = [i.replace('\xa0', ' ') for i in a if i not in ['\n', '\xa0']]  # ['Lith A1', '☒', 'Lith A2', '☒', ...
        a = [i for i, j in itertools.batched(a, 2) if j == '☑']
        return a
    except:
        return []

def get_ducat_data(market_items: None | list[MarketItem] = None) -> list[dict[str, Any]]:
    """
    for items on the ducat page (should be all prime items), return their ducat data
    
    Args:
        market_items: list of MarketItem, if None then fetch from API

    Returns:
        {
            'previous_hour': {item_name: ducat_data_dict},
            'previous_day': {item_name: ducat_data_dict}
        }
    where {item_name: ducat_data_dict} is like:
        {
            'Kestrel Prime Blade': {
                'datetime': '2026-01-23T05:00:00.000+00:00', // should be the same for every item in the list
                'position_change_month': 86, 
                'position_change_week': 5, 
                'position_change_day': 1, 
                'plat_worth': 517.968, 
                'volume': 72,                           // not sure, 
                                                        // it's NOT trade volume (from statistics) in 48 hours / 90 days
                                                        // it MIGHT be the current online-in-game volume that's available to be traded?
                'ducats_per_platinum': 2.14, 
                'ducats_per_platinum_wa': 2.09, 
                'ducats': 15, 
                'item': '6939aaca5d9ebda239125d34',     // == MarketItem.id
                'median': 7.0, 
                'wa_price': 7.19,                       // the WA price (shown in Ducanator page)
                'id': '69730f92f6ca230012cda916'
            }, ...
        }
    """

    if market_items is None:
        market_items = get_market_item_list()
    r = retry_request("https://api.warframe.market/v1/tools/ducats")
    data = json.loads(r.content)['payload']
    previous_hour = data['previous_hour']
    previous_day = data['previous_day']
    market_id_map = {i.id: i for i in market_items}
    
    hour_ducat_map = {market_id_map[i['item']].item_name: i for i in previous_hour}
    day_ducat_map = {market_id_map[i['item']].item_name: i for i in previous_day}
    
    return {
        'previous_hour': hour_ducat_map,
        'previous_day': day_ducat_map
    }



if __name__ == '__main__':
    market_items = get_market_item_list()
    # print(util.str_type(market_items[0], print_unknown_obj_vars=True))
    print(get_ducat_data())
    # rewards = get_transient_mission_rewards()
    # print(rewards.keys())
    # p = Player(user_slug='kaiserouo')
    # p.fetch_data()