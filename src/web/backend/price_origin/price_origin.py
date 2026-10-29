"""
defines different types of price oracle
"""

import threading

class PriceOrigin:
    """
        defines a price origin, which is the source of the price data
        you should implement some sort of caching mechanism to avoid fetching the same price multiple times
    """

    def __init__(self, market_lock: threading.Lock, market_items: list):
        """
        Args:
            market_lock, market_items: the global variables for your convenience.
            note that if you wanna modify the item (e.g., market_items[0].prepare()), you need to acquire the lock first
        """
        self.market_lock = market_lock
        self.market_items = market_items
    
    def fetch_price(self, url_name: str) -> dict[str, float]:
        """
        fetch prices for an item
        this also caches the info for the item

        Args:
            url_name: the name of item, MarketItem.url_name
        
        Returns:
            {
                "price": float,  # the price of the item
                "priceMax": float,  # the price of the item in max level (if not applicable, return the same as price)
            }
        """
        pass

    def fetch_prices(self, url_names: list[str]) -> dict[str, dict[str, float]]:
        """
        fetch prices for a list of item names from the price origin, ref. fetch_price()

        this function should only be used when fetch_price() is not parallelizable,
        but there are still other ways to fetch multiple prices quickly

        if your fetch_prices() is much faster than calling fetch_prices() multiple times,
        let support_faster_fetch_prices() returns True
        (faster := the client doesn't need the progress bar at all, ref. support_faster_fetch_prices())

        Args:
            url_names: a list of item names, MarketItem.url_name

        Returns:
            {
                url_name: {
                    "price": float,  # the price of the item
                    "priceMax": float,  # the price of the item in max level (if not applicable, return the same as price)
                }
            }
        """
        # default implementation, sequential
        return {
            url_name: self.fetch_price(url_name) for url_name in url_names
        }

    def support_faster_fetch_prices(self) -> bool:
        """
        whether your fetch_prices() is faster than calling fetch_price() multiple times

        if it is, we will prefer using fetch_prices() over fetch_price()
        the client won't be able to have a progress bar, and instead will wait for you to
        complete the entire fetch_prices() call

        if it isn't (e.g., fetch_prices() is using sequential calls to fetch_price()), 
        we will just call fetch_price() multiple times instead,
        this enables us to provide a progress bar to the client
        """
        return False
    
    def support_parallel_fetch(self) -> bool:
        """
        whether your fetch_price() function supports parallel fetching
        this is only used when support_faster_fetch_prices() returns False
        
        if it does, we will use your code like this (pseudocode btw):
            results = Parallel(n_jobs=5, require='sharedmem')(delayed(fetch_price)(url_name) for url_name in market_url_names)
        this will have the added benefit of supporting progress bar on the client side.

        if it doesn't, we will call fetch_price() sequentially.
        """
        return False

    def is_item_cached(self, url_names: list[str]) -> dict[str, bool]:
        """
        check whether the price of item is cached.
        if it is cached, we will not fetch the price for the item again
        if it isn't cached, we will later fetch the price for the item
        """
        return {url_name: True for url_name in url_names}

    def clear_cache(self, url_names: list[str] | None = None) -> None:
        """
        clear the cache for the given items
        if url_names is None, clear the entire cache
        """
        pass

    def get_item_info(self, url_names: list[str]) -> dict[str, any]:
        """
        get the item info, this will be used in the table and dictionary
        this assumes that all prices have already been cached, and you can just get the price from the cache
        you should check whether the item is cached first by is_item_cached, if it isn't, 
        call fetch_price() or fetch_prices() first

        you are free to provide anything you want to show in the table in Item Info page and
        the item infoboxes across the webpage
        
        this will be used in get_itemtable() in this class, and you need to figure out how to
        parse the info into item infobox form in the frontend

        note that you won't need to supply the following info, as they will be added later automatically
        when passes to frontend
        {
            'item_name': str, Market.item_name, the name of the item, e.g., "Volt Prime Set"
            'url_name': str, Market.url_name, the url name of the item, e.g., "volt_prime_set"
            'thumb_url': str, the thumbnail url of the item
            'icon_url': str, the icon url of the item
            'type': str, the type of item
            'market_link': str, the link to the item in the market
        }

        you MUST provide the following info:
        {
            'price': float, the price of the item
            'priceMax': float, the price of the item in max level (if not applicable, return the same as price)
            'last_update': the last update time of the price, if applicable, else None
                please use datetime.isoformat() to convert the datetime object to string
            'price_origin': str, the price origin name, basically just to let the frontend know how to render your stuff
                you can just use some sort of names specific to your class, e.g., "warframe_market" for WarframeMarketPriceOrigin
        }

        you are SUGGESTED to provide the following info, as you might want to show them in tables or item infoboxes:
        (i.e., those are optional and you can actually return none of this or more than this if you want)
        {
            'cur_lowest_sell_price': None,
            '24h_volume' / '48h_volume' / '90d_volume': trading volume for a given time frame,
            'wiki_link': the wiki link of the item, if applicable
        }

        Args:
            url_names: a list of item names, MarketItem.url_name
        
        Returns:
            {
                url_name: {
                    'price': float, the price of the item
                    'priceMax': float, the price of the item in max level (if not applicable, return the same as price)
                    ... // anything you want
                }
            }
        """
        pass

    def get_item_table(self, url_names: list[str]) -> dict[str, dict[str, any]]:
        """
        used for the item table in the Item Info page,
        this will render 

        Args:
            url_names: a list of item names, MarketItem.url_name
        
        Returns:
            ItemTable format
            {
                "headers": [
                    {"id": str, "name": str, "type": str},  // id is for indexing item's field
                    ...                                     // headers are shown in order
                ],
                "items": [
                    {header_id: attr}                       // id should be one of the header id, attr is the value to display in the table
                    ...                                     // items are shown in order
                ]
            }
        """
        pass

class OraclePriceOrigin(PriceOrigin):
    """
        Price origins that supports price oracle calculations,
        i.e., the price of an item can be calculated from its statistics

        this is only really applicable when you have the trading statistics of the item
    """
    def get_oracle_list(self) -> list[str]:
        """
        get the list of available oracle options that can be used to calculate the price of other items
        """
        pass

    def get_oracle(self) -> str:
        """
        get the current oracle being used for price calculation
        """
        pass

    def set_oracle(self, oracle: str) -> None:
        """
        set the oracle to be used for price calculation
        """
        pass