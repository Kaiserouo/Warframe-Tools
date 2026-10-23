# To-do

- overhaul price calculation functions
  - overhauls price related stuff in server.py s.t. it supports different kinds of price origins
    - price origin class: can modify the underlying MarketItem price and the way item infobox etc. returns
    - should be able to support fetching one item (for parallel) or multiple items (sequential, if does not support then don't implement this)
  - rename the ducantor price override to price origin
    - warframe market (takes a lot of time, newest and most detailed)
      - also should support price oracle calculations
    - warframe market ducantor 24h / 90d (fast but only supports prime parts, rest use warframe market)
    - alecaframe prices (fast, support all items, kinda shady)
- React Router (i.e., different page urls)
  - should support caching, etc the ?q= part of browse.wf
- add a version text on the local storage data, if the version is older than current, discard local storage data
  - the version text should be a text: "1" etc, and use the version parsing thing people use to determine the version
  - the version should be updated manually, and only when we can no longer support past versions
- Relic
  - Add filter for frames and weapons
  - Add price calculation for the whole set and the items (only available when price origin is ducantor or alecaframe)