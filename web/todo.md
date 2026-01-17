# To-do

- Loading progress implementation
- Server side caching & refreshing each item's information

# Component

- **UserBestTradeTable**
```
User: Donquixote_Doflamingo (2 items, deviation +35.05 plat) (https://warframe.market/profile/donquixote-doflamingo)
    - Tenacious Bond: 35 plat (15.54+19.46)
    - Momentous Bond: 35 plat (19.42+15.58)
User: wssyydsCN47 (3 items, deviation +40.26 plat) (https://warframe.market/profile/wssyydscn47)
    - Contagious Bond: 30 plat (14.79+15.21)
    - Tenacious Bond: 30 plat (15.54+14.46)
    - Momentous Bond: 30 plat (19.42+10.58)
User: gg08115771 (3 items, deviation +42.26 plat) (https://warframe.market/profile/gg08115771)
    - Contagious Bond: 34 plat (14.79+19.21)
    - Tenacious Bond: 29 plat (15.54+13.46)
    - Momentous Bond: 29 plat (19.42+9.58)
```
  - title looks like Relics, but showing:
    - user name, number of items, deviation
      - should be able to click on the user name to go to their page
  - expandable, the inside has:
    - name, plat, expect+deviation prices, number of items available, choose item count (default to 1), and a up and down button
      - the copy message should deal with 0 item case
    - copy message button acting like warframe market, and a close button, everytime it opens it actually looks for the count in the 
  - user_best_trade table data structure is: (btw the data only depend on the type of items you need, not the count)
```
[
  {
    "user_name": str,
    "url": str,
    "items": [
      {"item_name": str, "price": int, "count": int}
      ...
    ]
  }
  ...
]
```