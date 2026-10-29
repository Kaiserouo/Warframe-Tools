"""
defines different types of price oracle
"""

import threading
from .price_origin import PriceOrigin
from ....data.inventory.parse_inventory import Alecaframe
from .... import interactive as wfi
import datetime

class AlecaframePriceOrigin(PriceOrigin):
    """
        the price origin for alecaframe
    """

    def __init__(self, market_lock: threading.Lock, market_items: list, prefetch_all: bool = False):
        super().__init__(market_lock, market_items)
        self.cache = {}
        self.alecaframe = Alecaframe()
        self.url_name_map = {item.url_name: item for item in market_items}

        if prefetch_all:
            self.fetch_prices([item.url_name for item in market_items])
    
    def fetch_price(self, url_name: str) -> dict[str, float]:
        if url_name in self.cache:
            return {
                'price': self.cache[url_name]['post'],
                'priceMax': self.cache[url_name]['postMax']
            }

        prices = self.alecaframe.get_prices([url_name])
        last_update = datetime.datetime.now().isoformat()
        for url_name in prices:
            prices[url_name]['last_update'] = last_update
        self.cache.update(prices)
        
        return {
            'price': self.cache[url_name]['post'],
            'priceMax': self.cache[url_name]['postMax']
        }

    def fetch_prices(self, url_names: list[str]) -> dict[str, dict[str, float]]:
        uncached_url_names = [url_name for url_name in url_names if url_name not in self.cache]
        if not uncached_url_names:
            return {
                url_name: {
                    'price': self.cache[url_name]['post'],
                    'priceMax': self.cache[url_name]['postMax']
                } for url_name in url_names
            }

        prices = self.alecaframe.get_prices(uncached_url_names)
        last_update = datetime.datetime.now().isoformat()
        for url_name in prices:
            prices[url_name]['last_update'] = last_update
        self.cache.update(prices)

        return {
            url_name: {
                'price': self.cache[url_name]['post'],
                'priceMax': self.cache[url_name]['postMax']
            } for url_name in url_names
        }

    def support_faster_fetch_prices(self) -> bool:
        return True
    
    def support_parallel_fetch(self) -> bool:
        return False    # i mean technically true but i don't wanna smash alecaframe server...

    def is_item_cached(self, url_names: list[str]) -> dict[str, bool]:
        return {url_name: url_name in self.cache for url_name in url_names}

    def clear_cache(self, url_names: list[str] | None = None) -> None:
        if url_names is None:
            self.cache.clear()
        else:
            for url_name in url_names:
                self.cache.pop(url_name, None)

    def get_item_info(self, url_names: list[str]) -> dict[str, any]:
        ret = {}

        for url_name in url_names:
            price = self.cache.get(url_name)
            if price is None:
                ret[url_name] = None
            else:
                ret[url_name] = {
                    'price': price['post'],
                    'priceMax': price['postMax'],
                    'last_update': price['last_update'],
                    'price_origin': 'alecaframe',
                    '24h_volume': price['volume'],
                }

        return ret

    def get_item_table(self, url_names: list[str]) -> dict[str, dict[str, any]]:
        item_format_ls = []
        for url_name in url_names:
            item = self.url_name_map[url_name]
            price = self.cache[url_name]

            item_format = {
                'name': item.item_name,
                'type': wfi.resolve_item_type(item),
                'plat': price['post'],
                'rmax_plat_div21': None,
                'rmax_plat': None,
                'plat_times21': None,
                'vol': price['volume'],
            }

            if 'arcane_enhancement' in item.tags:
                rmax_plat = price['postMax']
                if rmax_plat is not None:
                    item_format = {
                        **item_format,
                        'rmax_plat_div21': rmax_plat / 21,
                        'rmax_plat': rmax_plat,
                        'plat_times21': item_format['plat'] * 21,
                    }

            if 'mod' in item.tags:
                rmax_plat = price['postMax']
                if rmax_plat is not None:
                    item_format = {
                        **item_format,
                        'rmax_plat': rmax_plat,
                    }
            item_format_ls.append(item_format)

        return {
            "headers": [
                {"id": "name", "name": 'Name', "type": "item_name"},
                {"id": "type", "name": 'Type', "type": "string"},
                {"id": "plat", "name": 'Plat\n(24hr)', "type": "float"},
                {"id": "rmax_plat_div21", "name": 'RMP/21\n(Arcane)', "type": "float"},
                {"id": "rmax_plat", "name": 'R.Max Plat\n(24hr)', "type": "float"},
                {"id": "plat_times21", "name": 'P*21\n(Arcane)', "type": "float"},
                {"id": "vol", "name": 'Volume\n(24hr)', "type": "integer"},
            ],
            "items": item_format_ls
        }
