"""
defines different types of price oracle
"""

import threading
from .price_origin import PriceOrigin, OraclePriceOrigin
from .warframe_market import WarframeMarketPriceOrigin
from .... import warframe_market as wfm 
from .... import interactive as wfi

class WarframeMarketDucantorPriceOrigin(WarframeMarketPriceOrigin):
    """
        the price origin for warframe.market's ducantor page
        will use the ducantor for fetching the price of prime items,
        if not available, will fallback to the normal warframe.market page
    """

    ducantor_oracle_list = [
        *["HOUR/" + oracle for oracle in WarframeMarketPriceOrigin.oracle_list],
        *["DAY/" + oracle for oracle in WarframeMarketPriceOrigin.oracle_list],
    ]

    def __init__(self, market_lock: threading.Lock, market_items: list, 
                 ducat_data = None,
                 oracle: str = 'HOUR/default_oracle_price_48h'):
        super().__init__(market_lock, market_items)
        oracle, ducantor_type = self._split_ducantor_oracle(oracle)
        self.oracle = oracle
        self.ducantor_type = ducantor_type
        self.ducat_data = ducat_data if ducat_data is not None else wfm.get_ducat_data()
        self.url_name_map = {item.url_name: item for item in market_items}

    def _get_ducat_data_idx(self, ducantor_type: str) -> int:
        if ducantor_type == "HOUR":
            return 'previous_hour'
        elif ducantor_type == "DAY":
            return 'previous_day'
        else:
            raise ValueError(f"Invalid ducantor type: {ducantor_type}. Valid options are: ['HOUR', 'DAY']")

    def _split_ducantor_oracle(self, oracle: str) -> tuple[str, str]:
        if oracle.startswith("HOUR/"):
            return "HOUR", oracle[5:]
        elif oracle.startswith("DAY/"):
            return "DAY", oracle[4:]
        else:
            raise ValueError(f"Invalid ducantor oracle: {oracle}. Valid options are: {self.ducantor_oracle_list}")

    def get_oracle_list(self) -> list[str]:
        return self.ducantor_oracle_list

    def get_oracle(self) -> str:
        return f'{self.ducantor_type}/{self.oracle}'

    def set_oracle(self, oracle: str) -> None:
        if oracle not in self.oracle_list:
            raise ValueError(f"Invalid oracle: {oracle}. Valid options are: {self.oracle_list}")
        oracle, ducantor_type = self._split_ducantor_oracle(oracle)
        self.oracle = oracle
        self.ducantor_type = ducantor_type
        
    def fetch_price(self, url_name: str) -> dict[str, float]:
        item = self.url_name_map.get(url_name)
        idx = self._get_ducat_data_idx(self.ducantor_type)
        if (self.ducat_data.get(item.item_name)):
            return {
                "price": self.ducat_data[idx][item.item_name]['wa_price'],
                "priceMax": self.ducat_data[idx][item.item_name]['wa_price'],
            }
        else:
            return super().fetch_price(url_name)

    def fetch_prices(self, url_names: list[str]) -> dict[str, dict[str, float]]:
        idx = self._get_ducat_data_idx(self.ducantor_type)
        result = {}
        for url_name in url_names:
            item = self.url_name_map.get(url_name)
            if (self.ducat_data.get(item.item_name)):
                result[url_name] = {
                    "price": self.ducat_data[idx][item.item_name]['wa_price'],
                    "priceMax": self.ducat_data[idx][item.item_name]['wa_price'],
                }
            else:
                result[url_name] = super().fetch_price(url_name)
        return result

    def support_faster_fetch_prices(self) -> bool:
        return False
    
    def support_parallel_fetch(self) -> bool:
        return True

    def is_item_cached(self, url_names: list[str]) -> dict[str, bool]:
        cached_state = super().is_item_cached(url_names)
        idx = self._get_ducat_data_idx(self.ducantor_type)
        for url_name in url_names:
            item = self.url_name_map.get(url_name)
            if (self.ducat_data.get(item.item_name)):
                cached_state[url_name] = True
        return cached_state

    def clear_cache(self, url_names: list[str] | None = None) -> None:
        super().clear_cache(url_names)

        # we can't exactly clear ONE ducat data cache, because we might as well clear ALL
        need_clear_cache = False
        for url_name in url_names or []:
            item = self.url_name_map.get(url_name)
            if (self.ducat_data.get(item.item_name)):
                need_clear_cache = True
                break
        if need_clear_cache:
            self.ducat_data = wfm.get_ducat_data()

    def get_item_info(self, url_names: list[str]) -> dict[str, any]:
        ret = {}
        idx = self._get_ducat_data_idx(self.ducantor_type)

        non_ducat_url_names = []

        for url_name in url_names:
            item = self.url_name_map.get(url_name)
            if item.item_name not in self.ducat_data[idx]:
                non_ducat_url_names.append(url_name)
                continue

            cur_data = self.ducat_data[idx][item.item_name]
            ret[url_name] = {
                "price": ['wa_price'],
                "priceMax": cur_data['wa_price'],
                "last_update": cur_data['datetime'],
                "price_origin": 'warframe_market_ducantor',
            }
            if self.ducantor_type == "HOUR":
                ret[url_name]['24h_volume'] = cur_data['volume']
            else:
                ret[url_name]['90d_volume'] = cur_data['volume']

        ret.update(super().get_item_info(non_ducat_url_names))
        return ret

    def get_item_table(self, url_names: list[str]) -> dict[str, dict[str, any]]:
        item_format_ls = []
        non_ducat_url_names = []
        idx = self._get_ducat_data_idx(self.ducantor_type)
        for url_name in url_names:
            item = self.url_name_map[url_name]
            if item.item_name not in self.ducat_data:
                non_ducat_url_names.append(url_name)
                continue

            item = self.url_name_map[url_name]

            item_format = {
                'name': item.item_name,
                'type': wfi.resolve_item_type(item),
                'plat': self.ducat_data[idx][item.item_name]['wa_price'],
                'rmax_plat_div21': None,
                'rmax_plat': None,
                'plat_times21': None,
                'vol': self.ducat_data[idx][item.item_name]['volume'],
            }
            item_format_ls.append(item_format)

        non_ducat_item_table = super().get_item_table(non_ducat_url_names)

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
            "items": item_format_ls + non_ducat_item_table['items']
        }