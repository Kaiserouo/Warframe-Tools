"""
defines different types of price oracle
"""

import threading
from turtle import st
from .price_origin import PriceOrigin, OraclePriceOrigin
from .... import interactive as wfi

class WarframeMarketPriceOrigin(OraclePriceOrigin):
    """
        the price origin for warframe.market
        will try to fetch and parse their orders and statistics for the item

        the cache is just the orders / statistics / price in MarketItem
    """

    oracle_price_fn_map = {
        'default_oracle_price_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_oracle_price_48hrs(*args, **kwargs),
        'top_30%_avg_in_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_top_k_avg_price_for_last_hours(48, 0.3, *args, **kwargs),
        'bottom_30%_avg_in_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_bottom_k_avg_price_for_last_hours(48, 0.3, *args, **kwargs),
        'all_avg_in_48h': lambda price_oracle, *args, **kwargs: price_oracle.get_top_k_avg_price_for_last_hours(48, 1, *args, **kwargs),
        'top_30%_avg_in_90d': lambda price_oracle, *args, **kwargs: price_oracle.get_top_k_avg_price_for_last_days(90, 0.3, *args, **kwargs),
        'bottom_30%_avg_in_90d': lambda price_oracle, *args, **kwargs: price_oracle.get_bottom_k_avg_price_for_last_days(90, 0.3, *args, **kwargs),
        'all_avg_in_90d': lambda price_oracle, *args, **kwargs: price_oracle.get_top_k_avg_price_for_last_days(90, 1, *args, **kwargs),
        'cur_lowest_price': lambda price_oracle, *args, **kwargs: price_oracle.get_cur_lowest_price(*args, **kwargs),
    }

    oracle_list = list(oracle_price_fn_map.keys())

    def __init__(self, market_lock: threading.Lock, market_items: list, 
                 oracle: str = 'default_oracle_price_48h'):
        super().__init__(market_lock, market_items)
        self.oracle = oracle
        self.url_name_map = {item.url_name: item for item in market_items}
    
    def get_oracle_list(self) -> list[str]:
        return self.oracle_list

    def get_oracle(self) -> str:
        return self.oracle

    def set_oracle(self, oracle: str) -> None:
        if oracle not in self.oracle_list:
            raise ValueError(f"Invalid oracle: {oracle}. Valid options are: {self.oracle_list}")
        self.oracle = oracle

    def fetch_price(self, url_name: str) -> dict[str, float]:
        with self.market_lock:
            item = self.url_name_map.get(url_name)

        if item is not None and item.price is None:
            data = item.fetch_prepare_data()
        
            with self.market_lock:
                item = self.url_name_map.get(url_name)
                if item is not None and item.price is None:
                    item.prepare(data)

        return {
            'price': self.oracle_price_fn_map[self.oracle](item.price),
            'priceMax': self.oracle_price_fn_map[self.oracle](item.price, mod_rank_range=[item.mod_max_rank])
        }

    def fetch_prices(self, url_names: list[str]) -> dict[str, dict[str, float]]:
        return super().fetch_prices(url_names)

    def support_faster_fetch_prices(self) -> bool:
        return False
    
    def support_parallel_fetch(self) -> bool:
        return True

    def is_item_cached(self, url_names: list[str]) -> dict[str, bool]:
        return {url_name: self.url_name_map[url_name].price is not None for url_name in url_names}

    def clear_cache(self, url_names: list[str] | None = None) -> None:
        items = [self.url_name_map.get(url_name) for url_name in url_names] if url_names is not None else self.market_items
        with self.market_lock:
            for item in items:
                if item is not None:
                    item.price = None
                    item.orders = None
                    item.statistic = None

    def get_item_info(self, url_names: list[str]) -> dict[str, any]:
        ret = {}

        for url_name in url_names:
            item = self.url_name_map.get(url_name)
            if item is None:
                ret[url_name] = None
            else:
                ret[url_name] = {
                    'price': self.oracle_price_fn_map[self.oracle](item.price),
                    'priceMax': self.oracle_price_fn_map[self.oracle](item.price, mod_rank_range=[item.mod_max_rank]),
                    'last_update': item.prepare_datetime.isoformat() if item.prepare_datetime else None,
                    'price_origin': 'warframe_market',

                    'cur_lowest_sell_price': item.orders.get_ingame_lowest_sell_price(),

                    '48h_volume': item.statistic.get_volume_for_last_hours(48),
                    '90d_volume': item.statistic.get_volume_for_last_days(90),

                    'wiki_link': item.wiki_link,
                }

        return ret

    def get_item_table(self, url_names: list[str]) -> dict[str, dict[str, any]]:
        item_format_ls = []
        item_info_ls = self.get_item_info(url_names)

        with self.market_lock:
            for url_name in url_names:
                item = self.url_name_map.get(url_name)
                item_info = item_info_ls.get(url_name)

                item_format = {
                    'name': item.item_name,
                    'type': wfi.resolve_item_type(item),
                    'plat': item_info['price'],
                    'rmax_plat_div21': None,
                    'rmax_plat': None,
                    'plat_times21': None,
                    'vol': item_info['48h_volume'],
                }

                if 'arcane_enhancement' in item.tags:
                    rmax_plat = item_info['priceMax']
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
                {"id": "plat", "name": 'Plat\n(48hr)', "type": "float"},
                {"id": "rmax_plat_div21", "name": 'RMP/21\n(Arcane)', "type": "float"},
                {"id": "rmax_plat", "name": 'R.Max Plat\n(48hr)', "type": "float"},
                {"id": "plat_times21", "name": 'P*21\n(Arcane)', "type": "float"},
                {"id": "vol", "name": 'Volume\n(48hr)', "type": "integer"},
            ],
            "items": item_format_ls
        }
