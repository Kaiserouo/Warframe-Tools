# Overframe

## Data

They have a data structure in JSON in javascripts, loaded by webpack etc.
e.g., `https://static.overframe.gg/_next/static/chunks/db/abilities.a658d8c8a74f481a.js`

There are the following files that may prove interesting:
- `variants`, `items`, `abilitystats`, `patchlogs`, `sources`, `moddescriptions`, `modularparts`, `abilities`, `relicrewards`, `rivens`, `modsets`, `mods`

more specifically, in the weapon build page, it will fetch:
- `abilities`, `modularparts`, `items`, `rivens`, `mods`, `moddescriptions`, `modsets`, `patchlogs`

### Data Parsing

If we have the URL of the javascript and successfully fetched it, we need to extract JSON hiding inside obfuscated javascript. Fortunately the javascript all looks like roughly the following:

```javascript
"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[3615],{20193:function(i){i.exports=JSON.parse('<ACTUAL_JSON_CONTENT>')}}]);
```

Note that it wouldn't look exactly the same (e.g., the numbers and symbols may differ) but it's roughly in this shape. We can use this to extract the json itself:
```python
r = requests.get('https://static.overframe.gg/_next/static/chunks/db/abilities.a658d8c8a74f481a.js')
t = r.text
json_text = t[t.find("JSON.parse('")+12:t.rfind("'")].replace("\\'", "'")
data = json.loads(json_text)
```

### Data Fetching

There is a nonce in the javascipt filename (e.g., `abilities.a658d8c8a74f481a.js`). This can be found in `https://static.overframe.gg/_next/static/chunks/webpack-ec99a060e0e617b6.js`, whose nonce can be found in basically any page on overframe in forms of a script tag:

```html
<script src="https://static.overframe.gg/_next/static/chunks/webpack-ec99a060e0e617b6.js" defer=""></script>
```

#### Webpack Fetching

All overframe pages are protected by Cloudflare challenge. Replaying the packet with curl or request does not work. You have to use browser automation tool with non-headless option. Anything else (most notably setting the browser as headless) would probably all fail.

Install xvfb (X Virtual Framebuffer) s.t. github action VM instance (which is usually headless) can use non-headless browser:
```bash
sudo apt-get install -y xvfb
```

And run the script in that context:

```python
# xvfb-run -a python fetch.py

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
options = Options()
driver = webdriver.Chrome(options=options)
try:
    driver.get("https://overframe.gg/build/new/13/atlas/")
    print(driver.page_source)
finally:
    driver.quit()
```

#### Data Nonce

In webpack.js, there is a section which contains the data and nonce:

```javascript
    p.u = function(e) {
        return "static/chunks/" + (({
            3615: "db/abilities",
            3733: "db/relicrewards",
            ... // skip
        })[e] || e) + "." + ({
            3615: "a658d8c8a74f481a",
            3733: "688ce85bf5465c73",
            ... // skip
        })[e] + ".js"
    }
```

We should be able to extract everything in there by searching `return "static/chunks/" + `, which only appears once.

```python
r = requests.get('https://static.overframe.gg/_next/static/chunks/webpack-ec99a060e0e617b6.js')
t = r.text
t = t[t.find('"static/chunks/"'):]
name_map, nonce_map = tuple([
    json.loads(re.sub(r'(\d+):', r'"\1":', bracket_text.group(0))) 
    for bracket_text, _ in zip(re.finditer(r'\{([^}]+)\}', t), range(2))
])

file_map = {
    name_map[i]: f"https://static.overframe.gg/_next/static/{name_map[i]}.{nonce_map[i]}.js"
    for i in name_map
}
print(file_map) # e.g., {'db/variants': 'https://static.overframe.gg/_next/static/db/variants.3a89436831e541ca.js', ...}
```


## Loadout Data

For the loadout, the page would look like the following:

```
https://overframe.gg/build/new/2717/acceltra/?bs=WzEsMjcxNywzMCwwLFtbMCwwLDNdLFswLDAsMF0sWzAsMCwwXSxbMCwwLDBdLFswLDAsMF0sWzAsMCwwXSxbMCwwLDBdLFswLDAsMF0sWzAsMCwxXSxbMCwwLDBdXV0=
```

(note that the name can be omitted in the url)

This is base64 encoding. Looks roughly like the following:

```
[1,2717,30,0,[[0,0,3],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,9],[0,0,0],[586,5,1],[8005,5,0]]]
```

Where each represents:
```
[
    1 (unknown, stays 1 for some reason, set to 0 kinda breaks things),
    weapon_id,
    item_rank (0~30),
    have_orokin_reactor (0 or 1),
    [   
        // mod list
        [mod_id, mod_level, polarity],
        ...
    ],
    [0-indexing skill index, helminth skill id]    // completely optional, can also not exist
]
```

for the mod list:
- The sequence goes as follows: mod slot (8~1 BACKWARDS!), aura slot (1), exilus slot, arcane slot (forward!), aura slot (2)
  - if a category doesn't have it (e.g., weapons don't have aura mods) then simply skip it in the sequence
  - note that this sequence is EXACTLY how the inventory file stores it
    - also if the inventory file seems shorter (e.g., only have 3 entries on warframe which should in theory have a lot more), that means the later ones are all empty. overframe deals with this nicely
- For arcanes, polarity = 0. For mods, in 0-indexing, the sequence goes [AP_UNIVERSAL(no polarity), AP_ATTACK, AP_DEFENSE, AP_TACTIC, AP_POWER, AP_PRECEPT, AP_WARD, AP_UMBRA, AP_ANY]
- For riven, the mod instead goes like: [2499,8,0,[[37,1],[26,1],[38,1]],[46,0.9996952686721667],8,1,35], where:
```
[
    riven_mod_id,
    mod_level, 
    polarity,                   // polarity of the slot
    [RIVEN_STAT, ...],          // buffs, non empty list of RIVEN_STAT
    null | RIVEN_STAT,          // debuff, null if no debuff
    mastery_rank_requirement,
    riven_mod_polarity,         // follows that polarity sequence above
    reroll_count
]
```
where RIVEN_STAT is:
```
[
    stat_id,     // ref. overframe: db/riven.js, should be an available __id
    value        // float or int, should be in [0, 1]
]
```