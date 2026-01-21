# Warframe CLI Tool

> For Web GUI, refer to [Web GUI Readme](./web/README.md).

![](./asset/screenshot.png)

I need some functionality that I want full control of, so, um, this.

This acts as some sort of warframe market bulk search / analysis tool, which I have control over e.g., how to calculate a reasonable price for an item (i.e., price oracle). The functionality includes:

The supported functionalities are: *(note that Web GUI implement them a bit different, please refer to the description on web GUI readme / homepage)*

- Item Info: Show market information about items. It can search in bulk by searching information for all items with a substring.
  - e.g., to search all component blueprint price of Volt Prime, type `Volt Prime` and it will show all component and set price at once.
- Relic Plat: Gives expected plat reward for specific relic (set), similar to how Alecaframe implements them (but I can control the price used in the calculation)
- Relic Item: Get all relics containing item and give expected plat for each relic.
- Relic Plat Multiple: Can input multiple items.
  - e.g., type "Lith B9 + Lith C5 + Lith D6" to search their expected plat at once.
  - Useful for determining which relic to buy from Varzia. You can use [this page](https://wiki.warframe.com/w/Varzia) to get a list of relics
- Syndicate: Show item market price sold by syndicate. 
  - Useful for determining what thing to buy to sell on the market
- Transient Reward: Get available transient mission rewards and show market price.
- Find Best Trade: For a list of items, find the best users to trade with to minimize total price deviation from oracle price.

## Install

```bash
# we use conda here, ref. https://www.anaconda.com/docs/getting-started/miniconda/install
conda create --name warframe python=3.12
conda activate warframe

# install packages
pip install -r requirement.txt
```

## Run

```bash
cd Warframe-Tool/   # at the repo directory
python -m src.main
```

## Functions
Those are what I currently have, as an example of how to use `warframe_market.py`.

```
Function:
- Item Info: Show item info
- Relic Plat: Gives expected plat for specific relic (set)
- Relic Item: Get all relics containing item and give expected plat
- Syndicate: Show syndicate item market price

Note:
- Press TAB to use autocomplete menu, or just type away.
- Use arrow key and press ENTER to choose an item in the menu.
- If not specified, please choose a specific choice (case-sensitive).
- Some functions explicitly shows that it matches ALL items shown in the menu.
  In that case you don't need to choose a specific item. Most of these are case-insensitive, too.
```

## Warning
- Spaghetti code. You can argue I don't have any idea how to structure my code properly. I tried to make it easier to maintain in `warframe_market.py` but i literally just gave up in `interactive.py`.
- **The price oracle (`PriceOracle`) should be changed to fit your needs!** This is the sole reason why I made this whole thing because sometimes alecaframe doesn't show reasonable price and, according to what items I wanna deal with, the price oracle should change accordingly, too. **Don't just use this without knowing what you're doing. At least check if the price oracle fits your needs.**
  - e.g., if an item is common and the price is relatively stable (e.g., equilibrium), I might want to use the median price for the last 48 hours or so.
  - e.g., when a prime is just out (e.g., sevagoth prime as of now), I might only wanna look at the price of the last 3 hours because of how fast the price drops and if i use the price several hours or days ago I am never gonna sell anything.
  - i haven't written the code to choose the price oracle in the CLI for now. please change the code directly. at least im doing it this way for now.
- Mostly useful when you wanna query a lot of items all at once, instead of looking at warframe market page one item at a time.
- A little bit faster than to type the thing on google or warframe market imo, because of the substring matching and stuff.
- Syndicate function can deal with your syndicate standing spending needs if you don't wanna just put all that into relic packs (or, in some syndicate, you can't even buy relic packs so you gotta find something else to sell)
- Relic expected plat calculation is another reason why I made this, because aya relics are not in the database for some reason and alecaframe can't calculate the expected value per relic. I don't have much aya so I'm just gonna calculate that expected price on my own.
- Can also do some weird things that I parsed all warframe market data. Not implemented btw.
  - e.g., auto notify when an item with your expected sell price appears, because I seriously think no one uses the buy function on the market.


## Trivia

### Browser CLI

I tried to use some python REPL on browser stuff to make this thing run directly on browser (because i just don't wanna properly port a CLI program onto browser myself). It turns out to be almost impossible, at least without some heavy code changing:
- All `requests` cannot be done if not using javascript's fetch (probably because of some CORS stuff). This is a relatively small problem as long as I can know if the code is currently running in browser.
- `prompt_toolkit` is doomed. Pyodite claimed that the module `termios` (which is required by `wcwidth`, further which is required by `prompt_toolkit`) is not possible on pyodute due to "browser limits"

## TODO
- warframe data/ scripts that fetches data from warframe wiki: use new wiki instead
- when you wanna buy multiple stuff, find the best trade strategy (or simply just, who do you wanna trade with in order to minimize trade times)
  - 1. get a list of items you wanna buy (maybe make a function in the main program to record this in a prettier format, with intellisence)
  - 2. for each item, get all players online and put them in a set
  - 3. in the player set, query all player's orders and see:
    - 1. what items do they have?
    - 2. for their price, how much do they deviate from the oracle price we have?
    - 3. in total, how much IN TOTAL do they deviate from the price? (sum 2. together)
  - 4. sort the players by (1) the items they have (2) the price they DONT deviate from the oracle price (minimize additional cost)
  - 5. list everything 