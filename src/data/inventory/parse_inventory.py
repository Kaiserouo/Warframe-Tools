from collections import defaultdict
import os
import sys
from pathlib import Path
import json
from typing import Counter
import re
import requests
import lzma
import luadata
import subprocess

from colorama import Fore, Style
for color in [Fore, Style]:
    for attr in dir(color):
        if not attr.startswith('_'):
            globals()[attr] = getattr(color, attr)

try:
    from Crypto.Cipher import AES
except Exception:
    print("PyCryptodome is required: pip install pycryptodome")
    sys.exit(2)

incarnon_weapon = [
    "Felarx", "Innodem", "Laetum", "Onos", "Phenmor", "Praedos", 
    "Ruvox", "Thalys", "Boar", "Boltor", "Braton", "Burston", "Dera", 
    "Dread", "Gorgon", "Latron", "Miter", "Paris", "Soma", "Strun", 
    "Sybaris", "Torid", "Vectis", "Angstrum", "Atomos", "Ballistica", 
    "Bronco", "Cestra", "Despair", "Dual Toxocyst", "Furis", "Gammacor", 
    "Kunai", "Lato", "Lex", "Sicarus", "Stug", "Vasto", "Zylok", "Ack & Brunt", 
    "Anku", "Bo", "Ceramic Dagger", "Destreza", "Dual Ichor", "Furax", 
    "Hate", "Magistar", "Nami Solo", "Obex", "Okina", "Sibear", "Skana"
]

def decrypt_lastdata(path: Path) -> bytes:
    # ref. https://sainan.github.io/alecaframe-inventory-parser/
    KEY = bytes([76, 69, 79, 45, 65, 76, 69, 67, 9, 69, 79, 45, 65, 76, 69, 67])
    IV = bytes([49, 50, 70, 71, 66, 51, 54, 45, 76, 69, 51, 45, 113, 61, 57, 0])

    def pkcs7_unpad(b: bytes) -> bytes:
        if not b:
            raise ValueError("Empty input")
        pad = b[-1]
        if pad <= 0 or pad > AES.block_size:
            raise ValueError("Invalid padding")
        if b[-pad:] != bytes([pad]) * pad:
            raise ValueError("Invalid padding bytes")
        return b[:-pad]

    data = path.read_bytes()
    print(f"Decrypting {path} ({len(data)} bytes)")
    if len(data) % AES.block_size != 0:
        # lastData.dat from the original program is padded before encryption
        # but if file isn't a multiple of block size, it's likely corrupt
        raise ValueError("Input size is not multiple of AES block size")
    cipher = AES.new(KEY, AES.MODE_CBC, IV)
    dec = cipher.decrypt(data)
    inv_bytes = pkcs7_unpad(dec)
    return inv_bytes

def get_inventory(path: Path):
    try:
        inv = json.load(path.open('r', encoding='utf-8'))
    except: # probably lastData format
        try:
            inv_bytes = decrypt_lastdata(path)
            inv = json.loads(inv_bytes.decode('utf-8'))
        except Exception as e:
            print("Decryption failed:", e)
    if 'InventoryJson' in inv:
        inv = json.loads(inv['InventoryJson'])
    return inv

def main_decrypt_lastdata():
    if len(sys.argv) < 2:
        p = Path("/mnt/c/Users/User/AppData/Local/AlecaFrame/lastData.dat")
    else:
        p = Path(sys.argv[1])
    
    inv = get_inventory(p)

    wd = WarframePublicExport()
    weapon_un_name_map = wd.get_weapon_name_map(lang='en', use_cache=True)
    weapon_riven_map = wd.get_weapon_riven_disposition(use_cache=True)
    cnt = Counter()

    for mod in inv['Upgrades']:
        if 'Random' not in mod['ItemType']:
            continue
        upgrade_fp = json.loads(mod['UpgradeFingerprint'])
        if 'compat' in upgrade_fp:
            cnt[upgrade_fp['compat']] += 1
        else:
            print(f"{RED}No compat for {mod['ItemType']}{RESET}")
            continue
        name = weapon_un_name_map.get(upgrade_fp['compat'], upgrade_fp['compat'])
        # if name not in ['Reconifex']:
        #     continue
    weapon_ls = [
        (un, count, weapon_riven_map.get(un, 'N/A'))
        for un, count in cnt.most_common()    
    ]
    weapon_ls.sort(key=lambda a: (a[1], a[2], a[0]), reverse=True)

    for un, count, disposition in weapon_ls:
        name = weapon_un_name_map.get(un, un)
        print(f"{name} {BLUE}({disposition:.2f}){RESET}: {count}")

def main_incarnon_riven():
    if len(sys.argv) < 2:
        p = Path("/mnt/c/Users/User/AppData/Local/AlecaFrame/lastData.dat")
    else:
        p = Path(sys.argv[1])
    
    inv = get_inventory(p)
    json.dump(inv, open('inv.json', 'w', encoding='utf-8'), indent=2)

    wd = WarframePublicExport()
    weapon_un_name_map = wd.get_weapon_name_map(lang='en', use_cache=True)
    weapon_riven_map = wd.get_weapon_riven_disposition(use_cache=True)
    riven_stat_parser = wd.get_riven_stat_parser(lang='en', use_cache=True)
    
    ls = []
    for mod in inv['Upgrades']:
        if 'Random' not in mod['ItemType']:
            continue
        upgrade_fp = json.loads(mod['UpgradeFingerprint'])
        if 'compat' not in upgrade_fp:
            # print(f"{RED}No compat for {mod['ItemType']}{RESET}")
            continue
        
        name = weapon_un_name_map.get(upgrade_fp['compat'], upgrade_fp['compat'])
        if name not in incarnon_weapon:
            continue

        s = f'{f"{YELLOW}NEW {RESET}" if upgrade_fp.get("lvl", 0) == 0 else ""}{BLUE}{name} ({weapon_riven_map.get(name, "N/A")}){RESET}: {upgrade_fp.get("lvl", 0)}/8'
        ls.append([name, upgrade_fp.get("lvl", 0), s])

        result = RivenParser.parseRiven(mod["ItemType"][32:], upgrade_fp, weapon_riven_map.get(upgrade_fp['compat']))
        print(f"{name} {result['name']} {upgrade_fp.get('lvl', 0)}/8")
        for stat in result['stats']:
            print(f"  {GREEN if stat['isBuff'] else RED}{riven_stat_parser(mod['ItemType'], stat)}{RESET}")
    
    # ls.sort()
    # for name, lvl, s in ls:
    #     print(s)

class WarframePublicExport:
    # ref. https://wiki.warframe.com/w/Public_Export
    def __init__(self):
        self._export_map_cache = {}  # from index: lang -> {export_name -> export_file_name}
        self._export_cache = {}      # from manifest: (lang, export_name) -> data (usually a list of dicts)
    
    def _clean_public_export_cache(self):
        self._export_map_cache.clear()
        self._export_cache.clear()

    def _prefetch_all_public_export(self, lang='en'):
        """
        quite literally get all available public export data and cache them
        """
        for export_name in self._get_public_export_map(lang, use_cache=True).keys():
            self._get_public_export(export_name, lang, use_cache=True)

    def _get_public_export_map(self, lang='en', use_cache=True):
        """
            get the public export mapping for the given language
            e.g., 
            {
                'ExportCustoms': 'ExportCustoms_en.json!00_ZJIc6+RSf2aEMuBg6sLAzw',
                'ExportDrones': 'ExportDrones_en.json!00_-2N+QHfciQUZhljJlrdz-w',
                ...
            }
        """
        if use_cache and lang in self._export_map_cache:
            return self._export_map_cache[lang]
        try:
            response = requests.get(f'https://origin.warframe.com/PublicExport/index_{lang}.txt.lzma')
            data = response.content
            lzma_data = lzma.decompress(data)
        except Exception as e:
            # sometimes origin.warframe.com is down (or would blocked you if it is requested on github action server)
            # we can try content.warframe.com instead, but might be a bit stale
            # https://github.com/WFCD/warframe-items/blob/66c1c1a5452d8d2a2d4aa79fd8e459e29220e34d/build/scraper.ts#L65
            response = requests.get(f'https://content.warframe.com/PublicExport/index_{lang}.txt.lzma')
            data = response.content
            lzma_data = lzma.decompress(data)
        """
        in the form of:
            ExportCustoms_en.json!00_ZJIc6+RSf2aEMuBg6sLAzw
            ExportDrones_en.json!00_-2N+QHfciQUZhljJlrdz-w
            ...
            ExportManifest.json
        """
        export_map = {
            # note that we need to deal with "ExportCustoms_en.json" and "ExportManifest.json"
            line.split('.json')[0].split('_')[0]: line.strip()
            for line in lzma_data.decode('utf-8').splitlines()
        }
        if use_cache:
            self._export_map_cache[lang] = export_map
        return export_map

    def _get_public_export(self, name, lang='en', use_cache=True):
        """
        get public export data
        e.g., to get ExportWeapons_en.json, do _get_public_export('ExportWeapons', 'en')
        (note that usually the json would be like: {'ExportWeapons': [list of dicts]},
         we will directly return the value of the first key, i.e., the [list of dicts] part)
        """
        if use_cache and (lang, name) in self._export_cache:
            return self._export_cache[(lang, name)]
        
        filename = self._get_public_export_map(lang, use_cache)[name]
        
        response = requests.get(f'http://content.warframe.com/PublicExport/Manifest/{filename}')
        data = response.content
        export_data = json.loads(data.decode('utf-8'))
        data = export_data[list(export_data.keys())[0]]
        if use_cache:
            self._export_cache[(lang, name)] = data
        return data  # return the first key's value

    def get_weapon_name_map(self, lang='en', use_cache=True):
        """
        get a mapping of weapon unique names to their display names
        e.g.,
        {
            '/Lotus/Weapons/Corpus/Melee/KickAndPunch/KickPunchWeapon': 'Obex', 
            '/Lotus/Weapons/Corpus/Melee/Hammer/CorpusHammerWeapon': 'Arca Titron',
        }
        """
        weapons = self._get_public_export('ExportWeapons', lang, use_cache)
        weapon_un_map = {
            weapon['uniqueName']: weapon['name']
            for weapon in weapons
        }
        return weapon_un_map

    def get_weapon_type_map(self, lang='en', use_cache=True):
        """
            map from uname to weapon type,
            weapon type is string in {
                'LongGuns', 'SpecialItems', 'OperatorAmps', 'SentinelWeapons', 
                'Melee', 'SpaceMelee', 'Pistols', 'SpaceGuns'
            }
        """
        weapons = self._get_public_export('ExportWeapons', lang, use_cache)
        weapon_type_map = {
            weapon['uniqueName']: weapon['productCategory']
            for weapon in weapons
        }
        return weapon_type_map

    def get_weapon_riven_disposition(self, use_cache=True):
        """
        get a mapping of weapon unique names to their riven disposition
        e.g.,
        {
            '/Lotus/Weapons/Corpus/Melee/KickAndPunch/KickPunchWeapon': 1.2, 
            '/Lotus/Weapons/Corpus/Melee/Hammer/CorpusHammerWeapon': 0.8,
        }
        """
        weapons = self._get_public_export('ExportWeapons', 'en', use_cache)
        weapon_riven_disposition_map = {
            weapon['uniqueName']: weapon['omegaAttenuation']
            for weapon in weapons
        }
        return weapon_riven_disposition_map

    def get_riven_loctag_map(self, lang='en', use_cache=True):
        """
        returns: {riven mod uname: {tag: locTag}}
        e.g.,{
            '/Lotus/Upgrades/Mods/Randomized/LotusArchgunRandomModRare': {
                'WeaponArmorPiercingDamageMod': '|val|% <DT_PUNCTURE_COLOR>Puncture',
                'WeaponCritChanceMod': '|val|% Critical Chance',
                ...
            },
            ...
        }
        """
        upgrades = self._get_public_export('ExportUpgrades', lang, use_cache)
        return {
            mod['uniqueName']: {
                entry['tag']: entry['upgradeValues'][0]['locTag']
                for entry in mod['upgradeEntries'] if 'upgradeValues' in entry and 'locTag' in entry['upgradeValues'][0]
            }
            for mod in upgrades if 'upgradeEntries' in mod
        }
    
    def get_riven_stat_parser(self, lang='en', use_cache=True):
        """
        returns: a function that maps (uname, {tag, displayValue}) to a string
        e.g., 
            func(
                '/Lotus/Upgrades/Mods/Randomized/LotusArchgunRandomModRare', 
                {'tag': 'WeaponCritChanceMod', 'displayValue': 11.1}
            ) -> '+11.1% Critical Chance'
        """
        riven_loctag_map = self.get_riven_loctag_map(lang, use_cache)
        def func(uname, stat):
            loctag = riven_loctag_map[uname][stat['tag']]
            loctag = re.sub(r'<.*?>', '', loctag)
            val = f"{stat['displayValue']:+}"
            loctag = loctag.replace('|val|', val)
            loctag = loctag.replace('|STAT1|', val)
            return loctag
        return func

    def get_incarnon_weapons(self, use_cache=True):
        """
        get a list of incarnon weapons
        since we actually don't have this information directly, we fetch all incarnon adapters and
        any weapon with the word "incarnon" in its description

        returns the name of incarnon weapons. note that we do NOT resolve all weapons
        (e.g., we only return Lex but not Lex Prime)
        """
        incarnon_names = set()

        # all incarnon genesis weapon
        incarnon_names.update([
            resource["name"].split(' Incarnon Genesis')[0]
            for resource in self._get_public_export('ExportResources', 'en', use_cache)
            if resource["name"].endswith(' Incarnon Genesis')
        ])

        # any other weapon
        incarnon_names.update([
            weapon["name"]
            for weapon in self._get_public_export('ExportWeapons', 'en', use_cache)
            if (
                weapon["uniqueName"].startswith('/Lotus/Weapons/Tenno/Zariman') or
                'incarnon' in weapon["description"].lower()
            )
        ])

        # try to resolve weapon name into unique name
        incarnon_names = [
            weapon["uniqueName"]
            for weapon in self._get_public_export('ExportWeapons', 'en', use_cache)
            if weapon["name"] in incarnon_names
        ]

        return list(incarnon_names)

    def get_icon_map(self, use_cache=True):
        return {
            entry['uniqueName']: f"https://content.warframe.com/PublicExport{entry['textureLocation']}"
            for entry in self._get_public_export('ExportManifest', 'en', use_cache)
        }

    def get_mod_name_map(self, lang='en', use_cache=True):
        """
        get a mapping of mod unique names to their display names
        e.g.,
        {
            '/Lotus/Weapons/Tenno/Melee/Polearms/Naginata/ShrineMaidenNaginataAugment': 'Amanata Pressure', 
        }
        """
        mods = self._get_public_export('ExportUpgrades', lang, use_cache)
        mods_un_map = {
            mod['uniqueName']: mod['name']
            for mod in mods
        }
        return mods_un_map

    def get_relic_reward(self, lang='en', use_cache=True):
        """
            return {
                "/Lotus/Types/Game/Projections/T4VoidProjectionTitaniaPrimeAPlatinum": {
                    "name": "Axi G4 Relic",
                    "relicRewards": {
                        "/Lotus/StoreItems/Types/Recipes/Weapons/WeaponParts/GramPrimeHandle": {
                            "rarity": "RARE",
                            "itemCount": 1
                        },
                        ...
                    }
                }
                ...
            }
        """
        
        relics = self._get_public_export('ExportRelicArcane', lang, use_cache)
        return {
            relic['uniqueName']: {
                'name': relic['name'],
                'relicRewards': {
                    relic_reward['rewardName']: {
                        'rarity': relic_reward['rarity'],
                        'itemCount': relic_reward['itemCount']
                    }
                    for relic_reward in relic['relicRewards']
                }
            }
            for relic in relics if 'relicRewards' in relic
        }

    def get_relic_sets(self, lang='en', use_cache=True):
        """
        return {
            "/Lotus/Powersuits/Werewolf/VorunaPrime": {
                "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeHelmetBlueprint": 1,
                "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeChassisBlueprint": 1,
                "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeSystemsBlueprint": 1,
                "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeBlueprint": 1
            },
            ...
        }

        we guarentee that all ingredients are from relics,
        we only return uniqueName for each item
        note that one item may exist in multiple sets (e.g., Vasto Prime Barrel is needed for both Vasto Prime and Akvasto Prime)
        """
        # first we get what exactly are in the relics
        resource_unames = set([
            resource["uniqueName"]
            for resource in self._get_public_export('ExportResources', lang, use_cache)
        ])

        relic_item_unames = set()
        for relic in self.get_relic_reward(lang, use_cache).values():
            relic_item_unames.update(relic['relicRewards'].keys())
        relic_item_unames = set(
            [uname.replace('/StoreItems', '', 1) for uname in relic_item_unames]
        )

        # and we sort out all recipes that uses these items
        recipes = self._get_public_export('ExportRecipes', lang, use_cache)
        blueprint_unames = set([recipe['uniqueName'] for recipe in recipes])
        prime_bp_unames = set.intersection(blueprint_unames, relic_item_unames)
        prime_product_recipes = {
            recipe['resultType']: recipe
            for recipe in recipes
            if recipe['uniqueName'] in prime_bp_unames
        }

        # we have assumptions:
        # 1. all related prime items must have a blueprint in the relic_item_unames
        # 2. if a product isn't a resource in ExportResource, then it is a final item

        # we try to find all products
        prime_set = {}
        for recipe in recipes:
            if recipe['uniqueName'] not in prime_bp_unames:
                continue
            if recipe['resultType'] in resource_unames:
                continue

            # then this should be a final recipe, we try to reduce this
            ingredients = defaultdict(int)
            for ingredient in recipe['ingredients']:
                # note that we use "+=" instead of "=" because there might be duplicate items
                # in the recipe (e.g., in Akvasto Prime, there are 2 Vasto Prime listed separately)
                ingredients[ingredient["ItemType"]] += ingredient["ItemCount"]
            ingredients[recipe['uniqueName']] += 1

            keep_loop = True
            while keep_loop:
                keep_loop = False
                new_ingredients = defaultdict(int)
                for ingredient in ingredients:
                    if ingredient in relic_item_unames:
                        new_ingredients[ingredient] += ingredients[ingredient]
                        continue

                    keep_loop = True

                    if ingredient not in prime_product_recipes:
                        continue    # not even related to this whole thing

                    # then this ingredient should be a prime product, we try to find its recipe and reduce it
                    sub_recipe = prime_product_recipes[ingredient]
                    new_ingredients[sub_recipe['uniqueName']] += ingredients[ingredient]
                    for sub_ingredient in sub_recipe['ingredients']:
                        new_ingredients[sub_ingredient['ItemType']] += sub_ingredient['ItemCount'] * ingredients[ingredient]
                
                ingredients = new_ingredients

            prime_set[recipe['resultType']] = ingredients
        return prime_set

    def get_name_lookup_map(self, lang='en', use_cache=True):
        """
        get all name lookups, literally all possible names that you may need
        return {uname -> name} for all items whenever applicable
        """
        name_lookup = {}
        for export_name in self._get_public_export_map(lang, use_cache=True).keys():
            data = self._get_public_export(export_name, lang, use_cache)
            for entry in data:
                if 'uniqueName' in entry and 'name' in entry:
                    name_lookup[entry['uniqueName']] = entry['name']
        return name_lookup

    def get_warframe_info_map(self, lang='en', use_cache=True):
        """
        return warframe info map, i.e., from warframe uname to the dict in ExportWarframes.
        we also add warframe icon and ability icons to the dict
        """
        wf_info_map = {}
        icon_map = self.get_icon_map(use_cache)
        for wf in self._get_public_export('ExportWarframes', lang, use_cache):
            wf_info = {
                **wf,
                'icon': icon_map.get(wf['uniqueName'], None)
            }
            wf_info['abilities'] = [
                {**ability, 'icon': icon_map.get(ability['abilityUniqueName'], None)}
                for ability in wf['abilities']
            ]
            wf_info_map[wf['uniqueName']] = wf_info

        return wf_info_map

    def get_ability_info_map(self, lang='en', use_cache=True):
        """
        return ability uname -> ability
        e.g., {
            "/Lotus/Powersuits/Cowgirl/Abilities/GunFuAbility": {
                "abilityUniqueName": "/Lotus/Powersuits/Cowgirl/Abilities/GunFuAbility",
                "abilityName": "Peacemaker",
                "description": "With intense focus, Mesa draws her Regulator pistols, shooting down her foes in rapid succession."
                
                "warframe": <Warframe uname>
                "icon": <a URL to the icon>
            }
        }
        """
        ab_info_map = {}
        icon_map = self.get_icon_map(use_cache)
        for wf in self._get_public_export('ExportWarframes', lang, use_cache):
            for ability in wf['abilities']:
                ab_info_map[ability['abilityUniqueName']] = {
                    **ability, 
                    'warframe': wf['uniqueName'],
                    'icon': icon_map.get(ability['abilityUniqueName'], None)
                }
        return ab_info_map

def main_public_export():
    # https://wiki.warframe.com/w/Public_Export
    wd = WarframePublicExport()
    # weapon_map = wd.get_weapon_un_name_map(lang='en', use_cache=True)
    print(wd.get_riven_text())

class RivenParser:
    # ref.
    # - https://calamity-inc.github.io/warframe-riven-info/RivenParser.js
    # - https://browse.wf/rivencalc#weapon=LotusRifleRandomModRare%3A1&lvl=8&buffs=1&curses=1
    riven_tags = {
        "LotusArchgunRandomModRare": [
            { "tag": "WeaponArmorPiercingDamageMod", "value": 0.01, "prefix": "insi", "suffix": "cak" },
            { "tag": "WeaponCritChanceMod", "value": 0.0111, "prefix": "crita", "suffix": "cron" },
            { "tag": "WeaponCritDamageMod", "value": 0.0089, "prefix": "acri", "suffix": "tis" },
            { "tag": "WeaponElectricityDamageMod", "value": 0.0133, "prefix": "vexi", "suffix": "tio" },
            { "tag": "WeaponFireDamageMod", "value": 0.0133, "prefix": "igni", "suffix": "pha" },
            { "tag": "WeaponFireRateMod", "value": 0.00667, "prefix": "croni", "suffix": "dra" },
            { "tag": "WeaponFreezeDamageMod", "value": 0.0133, "prefix": "geli", "suffix": "do" },
            { "tag": "WeaponImpactDamageMod", "value": 0.01, "prefix": "magna", "suffix": "ton" },
            { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" },
            { "tag": "WeaponSlashDamageMod", "value": 0.01, "prefix": "sci", "suffix": "sus" },
            { "tag": "WeaponStunChanceMod", "value": 0.0067, "prefix": "hexa", "suffix": "dex" },
            { "tag": "WeaponToxinDamageMod", "value": 0.0133, "prefix": "toxi", "suffix": "tox" },
            { "tag": "WeaponAmmoMaxMod", "value": 0.0111, "prefix": "ampi", "suffix": "bin" },
            { "tag": "WeaponClipMaxMod", "value": 0.0067, "prefix": "arma", "suffix": "tin" },
            { "tag": "WeaponDamageAmountMod", "value": 0.0111, "prefix": "visi", "suffix": "ata" },
            { "tag": "WeaponFireIterationsMod", "value": 0.0067, "prefix": "sati", "suffix": "can" },
            { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" },
            { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" },
            { "tag": "WeaponReloadSpeedMod", "value": 0.0111, "prefix": "feva", "suffix": "tak" },
            { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" },
            { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" },
            { "tag": "WeaponZoomFovMod", "value": 0.006666, "prefix": "hera", "suffix": "lis" }
        ],
        "LotusModularMeleeRandomModRare": [
            { "tag": "WeaponMeleeDamageMod", "value": 0.0183, "prefix": "visi", "suffix": "ata" },
            { "tag": "WeaponArmorPiercingDamageMod", "value": 0.0133, "prefix": "insi", "suffix": "cak" },
            { "tag": "WeaponImpactDamageMod", "value": 0.0133, "prefix": "magna", "suffix": "ton" },
            { "tag": "WeaponSlashDamageMod", "value": 0.0133, "prefix": "sci", "suffix": "sus" },
            { "tag": "WeaponCritChanceMod", "value": 0.02, "prefix": "crita", "suffix": "cron" },
            { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" },
            { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" },
            { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" },
            { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" },
            { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" },
            { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" },
            { "tag": "WeaponMeleeFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" },
            { "tag": "WeaponMeleeFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" },
            { "tag": "WeaponMeleeFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" },
            { "tag": "WeaponFireRateMod", "value": 0.0061, "prefix": "croni", "suffix": "dra" },
            { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" },
            { "tag": "ComboDurationMod", "value": 0.09, "prefix": "tempi", "suffix": "nem" },
            { "tag": "SlideAttackCritChanceMod", "value": 0.013334, "prefix": "pleci", "suffix": "nent" },
            { "tag": "WeaponMeleeRangeIncMod", "value": 0.02158, "prefix": "locti", "suffix": "tor" },
            { "tag": "WeaponMeleeFinisherDamageMod", "value": 0.0133, "prefix": "exi", "suffix": "cta" },
            { "tag": "WeaponMeleeComboEfficiencyMod", "value": 0.00816, "prefix": "forti", "suffix": "us" },
            { "tag": "WeaponMeleeComboInitialBonusMod", "value": 0.27224, "prefix": "para", "suffix": "um" },
            { "tag": "WeaponMeleeComboPointsOnHitMod", "value": -0.01165 },
            { "tag": "WeaponMeleeComboBonusOnHitMod", "value": 0.00653, "prefix": "laci", "suffix": "nus" }
        ],
        "LotusModularPistolRandomModRare": [
            { "tag": "WeaponArmorPiercingDamageMod", "value": 0.01333, "prefix": "insi", "suffix": "cak" },
            { "tag": "WeaponCritChanceMod", "value": 0.016666, "prefix": "crita", "suffix": "cron" },
            { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" },
            { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" },
            { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" },
            { "tag": "WeaponFireRateMod", "value": 0.0083, "prefix": "croni", "suffix": "dra" },
            { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" },
            { "tag": "WeaponImpactDamageMod", "value": 0.013333, "prefix": "magna", "suffix": "ton" },
            { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" },
            { "tag": "WeaponSlashDamageMod", "value": 0.013333, "prefix": "sci", "suffix": "sus" },
            { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" },
            { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" },
            { "tag": "WeaponAmmoMaxMod", "value": 0.01, "prefix": "ampi", "suffix": "bin" },
            { "tag": "WeaponClipMaxMod", "value": 0.005555, "prefix": "arma", "suffix": "tin" },
            { "tag": "WeaponDamageAmountMod", "value": 0.0244, "prefix": "visi", "suffix": "ata" },
            { "tag": "WeaponFireIterationsMod", "value": 0.0133, "prefix": "sati", "suffix": "can" },
            { "tag": "WeaponProjectileSpeedMod", "value": 0.01, "prefix": "conci", "suffix": "nak" },
            { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" },
            { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" },
            { "tag": "WeaponReloadSpeedMod", "value": 0.005555, "prefix": "feva", "suffix": "tak" },
            { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" },
            { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" },
            { "tag": "WeaponFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" },
            { "tag": "WeaponZoomFovMod", "value": 0.0089, "prefix": "hera", "suffix": "lis" }
        ],
        "LotusPistolRandomModRare": [
            { "tag": "WeaponArmorPiercingDamageMod", "value": 0.01333, "prefix": "insi", "suffix": "cak" },
            { "tag": "WeaponCritChanceMod", "value": 0.016666, "prefix": "crita", "suffix": "cron" },
            { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" },
            { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" },
            { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" },
            { "tag": "WeaponFireRateMod", "value": 0.0083, "prefix": "croni", "suffix": "dra" },
            { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" },
            { "tag": "WeaponImpactDamageMod", "value": 0.013333, "prefix": "magna", "suffix": "ton" },
            { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" },
            { "tag": "WeaponSlashDamageMod", "value": 0.013333, "prefix": "sci", "suffix": "sus" },
            { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" },
            { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" },
            { "tag": "WeaponAmmoMaxMod", "value": 0.01, "prefix": "ampi", "suffix": "bin" },
            { "tag": "WeaponClipMaxMod", "value": 0.005555, "prefix": "arma", "suffix": "tin" },
            { "tag": "WeaponDamageAmountMod", "value": 0.0244, "prefix": "visi", "suffix": "ata" },
            { "tag": "WeaponFireIterationsMod", "value": 0.0133, "prefix": "sati", "suffix": "can" },
            { "tag": "WeaponProjectileSpeedMod", "value": 0.01, "prefix": "conci", "suffix": "nak" },
            { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" },
            { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" },
            { "tag": "WeaponReloadSpeedMod", "value": 0.005555, "prefix": "feva", "suffix": "tak" },
            { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" },
            { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" },
            { "tag": "WeaponFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" },
            { "tag": "WeaponZoomFovMod", "value": 0.0089, "prefix": "hera", "suffix": "lis" }
        ],
        "LotusRifleRandomModRare": [
            { "tag": "WeaponArmorPiercingDamageMod", "value": 0.01333, "prefix": "insi", "suffix": "cak" },
            { "tag": "WeaponCritChanceMod", "value": 0.016666, "prefix": "crita", "suffix": "cron" },
            { "tag": "WeaponCritDamageMod", "value": 0.013333, "prefix": "acri", "suffix": "tis" },
            { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" },
            { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" },
            { "tag": "WeaponFireRateMod", "value": 0.00667, "prefix": "croni", "suffix": "dra" },
            { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" },
            { "tag": "WeaponImpactDamageMod", "value": 0.013333, "prefix": "magna", "suffix": "ton" },
            { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" },
            { "tag": "WeaponSlashDamageMod", "value": 0.013333, "prefix": "sci", "suffix": "sus" },
            { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" },
            { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" },
            { "tag": "WeaponAmmoMaxMod", "value": 0.00555, "prefix": "ampi", "suffix": "bin" },
            { "tag": "WeaponClipMaxMod", "value": 0.005555, "prefix": "arma", "suffix": "tin" },
            { "tag": "WeaponDamageAmountMod", "value": 0.018333, "prefix": "visi", "suffix": "ata" },
            { "tag": "WeaponFireIterationsMod", "value": 0.01, "prefix": "sati", "suffix": "can" },
            { "tag": "WeaponProjectileSpeedMod", "value": 0.01, "prefix": "conci", "suffix": "nak" },
            { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" },
            { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" },
            { "tag": "WeaponReloadSpeedMod", "value": 0.005555, "prefix": "feva", "suffix": "tak" },
            { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" },
            { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" },
            { "tag": "WeaponFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" },
            { "tag": "WeaponZoomFovMod", "value": 0.006666, "prefix": "hera", "suffix": "lis" }
        ],
        "LotusShotgunRandomModRare": [
            { "tag": "WeaponArmorPiercingDamageMod", "value": 0.01333, "prefix": "insi", "suffix": "cak" },
            { "tag": "WeaponCritChanceMod", "value": 0.01, "prefix": "crita", "suffix": "cron" },
            { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" },
            { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" },
            { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" },
            { "tag": "WeaponFireRateMod", "value": 0.01, "prefix": "croni", "suffix": "dra" },
            { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" },
            { "tag": "WeaponImpactDamageMod", "value": 0.013333, "prefix": "magna", "suffix": "ton" },
            { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" },
            { "tag": "WeaponSlashDamageMod", "value": 0.013333, "prefix": "sci", "suffix": "sus" },
            { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" },
            { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" },
            { "tag": "WeaponAmmoMaxMod", "value": 0.01, "prefix": "ampi", "suffix": "bin" },
            { "tag": "WeaponClipMaxMod", "value": 0.005555, "prefix": "arma", "suffix": "tin" },
            { "tag": "WeaponDamageAmountMod", "value": 0.0183, "prefix": "visi", "suffix": "ata" },
            { "tag": "WeaponFireIterationsMod", "value": 0.0133, "prefix": "sati", "suffix": "can" },
            { "tag": "WeaponProjectileSpeedMod", "value": 0.01, "prefix": "conci", "suffix": "nak" },
            { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" },
            { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" },
            { "tag": "WeaponReloadSpeedMod", "value": 0.005555, "prefix": "feva", "suffix": "tak" },
            { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" },
            { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" },
            { "tag": "WeaponFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" }
        ],
        "PlayerMeleeWeaponRandomModRare": [
            { "tag": "WeaponMeleeDamageMod", "value": 0.0183, "prefix": "visi", "suffix": "ata" },
            { "tag": "WeaponArmorPiercingDamageMod", "value": 0.0133, "prefix": "insi", "suffix": "cak" },
            { "tag": "WeaponImpactDamageMod", "value": 0.0133, "prefix": "magna", "suffix": "ton" },
            { "tag": "WeaponSlashDamageMod", "value": 0.0133, "prefix": "sci", "suffix": "sus" },
            { "tag": "WeaponCritChanceMod", "value": 0.02, "prefix": "crita", "suffix": "cron" },
            { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" },
            { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" },
            { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" },
            { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" },
            { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" },
            { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" },
            { "tag": "WeaponMeleeFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" },
            { "tag": "WeaponMeleeFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" },
            { "tag": "WeaponMeleeFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" },
            { "tag": "WeaponFireRateMod", "value": 0.0061, "prefix": "croni", "suffix": "dra" },
            { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" },
            { "tag": "ComboDurationMod", "value": 0.09, "prefix": "tempi", "suffix": "nem" },
            { "tag": "SlideAttackCritChanceMod", "value": 0.013334, "prefix": "pleci", "suffix": "nent" },
            { "tag": "WeaponMeleeRangeIncMod", "value": 0.02158, "prefix": "locti", "suffix": "tor" },
            { "tag": "WeaponMeleeFinisherDamageMod", "value": 0.0133, "prefix": "exi", "suffix": "cta" },
            { "tag": "WeaponMeleeComboEfficiencyMod", "value": 0.00816, "prefix": "forti", "suffix": "us" },
            { "tag": "WeaponMeleeComboInitialBonusMod", "value": 0.27224, "prefix": "para", "suffix": "um" },
            { "tag": "WeaponMeleeComboPointsOnHitMod", "value": -0.01165 },
            { "tag": "WeaponMeleeComboBonusOnHitMod", "value": 0.00653, "prefix": "laci", "suffix": "nus" }
        ]
    }
    numBuffsAtten = [0, 1, .66000003, .5, .40000001, .34999999]
    numBuffsCurseAtten = [0, 1, .33000001, .5, 1.25, 1.5]

    @staticmethod
    def rivenIntToFloat(i: int) -> float:
        f = i / 0x3FFFFFFF
        if 0.0 <= f <= 1.0:
            return f
        return 0.0

    @staticmethod
    def floatToRivenInt(f: float) -> int:
        return round(f * 0x3FFFFFFF)

    @staticmethod
    def lerp(a: float, b: float, t: float) -> float:
        return (a + (b - a) * t)

    @staticmethod
    def valueToDisplayValue(tag: str, value: float):
        if tag in ("WeaponFactionDamageGrineer", "WeaponFactionDamageCorpus", "WeaponFactionDamageInfested",
                   "WeaponMeleeFactionDamageGrineer", "WeaponMeleeFactionDamageCorpus", "WeaponMeleeFactionDamageInfested"):
            return round(value * 100) / 100
        if tag in ("WeaponMeleeComboInitialBonusMod", "ComboDurationMod", "WeaponMeleeRangeIncMod"):
            return round(value * 10) / 10
        return round(value * 1000) / 10

    @staticmethod
    def displayValueToValue(tag: str, displayValue: float):
        if tag in ("WeaponFactionDamageGrineer", "WeaponFactionDamageCorpus", "WeaponFactionDamageInfested",
                   "WeaponMeleeFactionDamageGrineer", "WeaponMeleeFactionDamageCorpus", "WeaponMeleeFactionDamageInfested",
                   "WeaponMeleeComboInitialBonusMod", "ComboDurationMod", "WeaponMeleeRangeIncMod"):
            return displayValue
        return displayValue / 100

    @staticmethod
    def toTitleCase(word: str) -> str:
        return word[0].upper() + word[1:]

    @classmethod
    def parseRiven(cls, rivenType: str, fingerprint: dict, omegaAttenuation: float):
        """
        Args:
            rivenType: str, the part after /Lotus/Upgrades/Mods/Randomized/, e.g., "LotusArchgunRandomModRare"
                       should be mod["ItemType"][32:]
            fingerprint: the whole UpgradeFingerprint dict
            omegaAttenuation: float, the omegaAttenuation value for the weapon
        Returns:
            {
                'stats': {
                    'tag': the original tag, e.g., "WeaponFactionDamageGrineer", 
                    'value': raw value, most times means VALUE%, but for some others (e.g., faction damage) means VALUE directly, 
                    'displayValue': the value to display, floating points would be truncated
                'name': the name of riven, would be appended after weapon name
            }
        """
        fingerprint.setdefault('curses', [])
        stats = []
        buffTags = {}
        curseAtten = (1.25) ** len(fingerprint['curses'])
        attenuation = 1
        attenuation *= 1.5   # SPECIFIC_FIT_ATTENUATION
        attenuation *= omegaAttenuation
        attenuation *= 10    # getBaseDrain(RIVEN_BASE_DRAIN)

        for buff in fingerprint['buffs']:
            buffTags[buff['Tag']] = max(buffTags.get(buff['Tag'], 0), buff['Value'])
            taginfo = next(x for x in cls.riven_tags[rivenType] if x['tag'] == buff['Tag'])
            upgradeValue = taginfo['value']
            upgradeValue *= attenuation
            upgradeValue *= curseAtten
            upgradeValue *= cls.lerp(0.9, 1.1, cls.rivenIntToFloat(buff['Value']))
            upgradeValue *= cls.numBuffsAtten[min(len(fingerprint['buffs']), len(cls.numBuffsAtten) - 1)]
            upgradeValue *= fingerprint.get('lvl', 0) + 1
            stats.append({'tag': buff['Tag'], 'value': upgradeValue, 'displayValue': cls.valueToDisplayValue(buff['Tag'], upgradeValue), 'isBuff': True})

        for curse in fingerprint['curses']:
            taginfo = next(x for x in cls.riven_tags[rivenType] if x['tag'] == curse['Tag'])
            upgradeValue = taginfo['value'] * -1.0
            upgradeValue *= attenuation
            upgradeValue *= cls.lerp(0.9, 1.1, cls.rivenIntToFloat(curse['Value']))
            upgradeValue *= cls.numBuffsCurseAtten[min(len(fingerprint['buffs']), len(cls.numBuffsCurseAtten) - 1)]
            upgradeValue *= cls.numBuffsAtten[min(len(fingerprint['curses']), len(cls.numBuffsAtten) - 1)]
            upgradeValue *= fingerprint.get('lvl', 0) + 1
            stats.append({'tag': curse['Tag'], 'value': upgradeValue, 'displayValue': cls.valueToDisplayValue(curse['Tag'], upgradeValue), 'isBuff': False})

        name = ""
        sortedBuffs = sorted(list(fingerprint['buffs']), key=lambda a: ( -buffTags[a['Tag']], next(x['value'] for x in cls.riven_tags[rivenType] if x['tag']==a['Tag']) ))
        for idx, buff in enumerate(sortedBuffs):
            info = next(x for x in cls.riven_tags[rivenType] if x['tag'] == buff['Tag'])
            if buff['Tag'] == sortedBuffs[-1]['Tag']:
                name += info.get('suffix','')
            elif buff['Tag'] == sortedBuffs[0]['Tag']:
                name += cls.toTitleCase(info.get('prefix',''))
            else:
                name += '-'
                name += info.get('prefix','')

        return {'stats': stats, 'name': name}

    @classmethod
    def unparseBuff(cls, rivenType, omegaAttenuation, lvl, numBuffs, numCurses, tag, value):
        """
        from (tag, value), return the grade of this buff in scale [0, 1]
        """
        curseAtten = (1.25) ** numCurses
        attenuation = 1
        attenuation *= 1.5  # SPECIFIC_FIT_ATTENUATION
        attenuation *= omegaAttenuation
        attenuation *= 10   # getBaseDrain(RIVEN_BASE_DRAIN)
        value /= lvl + 1
        value /= cls.numBuffsAtten[min(numBuffs, len(cls.numBuffsAtten) - 1)]
        value /= curseAtten
        value /= attenuation
        value /= next(x['value'] for x in cls.riven_tags[rivenType] if x['tag'] == tag)
        value -= 0.9
        value /= 0.2
        return value

    @classmethod
    def unparseCurse(cls, rivenType, omegaAttenuation, lvl, numBuffs, numCurses, tag, value):
        """
        from (tag, value), return the grade of this curse in scale [0, 1]
        """
        attenuation = 1
        attenuation *= 1.5
        attenuation *= omegaAttenuation
        attenuation *= 10
        value /= lvl + 1
        value /= cls.numBuffsAtten[min(numCurses, len(cls.numBuffsAtten) - 1)]
        value /= cls.numBuffsCurseAtten[min(numBuffs, len(cls.numBuffsCurseAtten) - 1)]
        value /= attenuation
        value /= next(x['value'] for x in cls.riven_tags[rivenType] if x['tag'] == tag)
        value /= -1.0
        value -= 0.9
        value /= 0.2
        return value

    @staticmethod
    def floatToGrade(value: float) -> str:
        """
        from riven grade in scale [0, 1], turn to text style riven grade
        """
        value = RivenParser.lerp(-10, +10, value)
        if -11.5 <= value <= 11.5:
            if value >= 9.5: return "S"
            if value >= 7.5: return "A+"
            if value >= 5.5: return "A"
            if value >= 3.5: return "A-"
            if value >= 1.5: return "B+"
            if value >= -1.5: return "B"
            if value >= -3.5: return "B-"
            if value >= -5.5: return "C+"
            if value >= -7.5: return "C"
            if value >= -9.5: return "C-"
            return "F"
        return "X"

def main_incarnon():
    wpe = WarframePublicExport()
    i = wpe.get_incarnon_weapons()
    print(i, len(i))
    print(incarnon_weapon, len(incarnon_weapon))
    print(set().difference(set(i), set(incarnon_weapon)))

def main_corrupted_mods():
    corrupted_mods_set = set(["Corrupt Charge", "Hollow Point", "Spoiled Strike", "Magnum Force", "Tainted Clip", "Critical Delay", "Heavy Caliber", "Tainted Mag", "Vile Precision", "Narrow Minded", "Fleeting Expertise", "Blind Rage", "Overextended", "Tainted Shell", "Vicious Spread", "Burdened Magazine", "Anemic Agility", "Vile Acceleration", "Frail Momentum", "Critical Deceleration", "Creeping Bullseye", "Transient Fortitude", "Depleted Reload", "Catalyzing Shields"])

    if len(sys.argv) < 2:
        p = Path("/mnt/c/Users/User/AppData/Local/AlecaFrame/lastData.dat")
    else:
        p = Path(sys.argv[1])
    inv = get_inventory(p)

    wd = WarframePublicExport()
    mod_un_name_map = wd.get_mod_name_map(lang='en', use_cache=True)
    mod_name_un_map = {v: k for k, v in mod_un_name_map.items()}
    upgrades = inv['Upgrades'] + inv['RawUpgrades']
    for i in corrupted_mods_set:
        if i not in mod_name_un_map:
            print(f"Mod {i} not found in mod_name_un_map")
            continue
        un = mod_name_un_map[i]
        mod_info = next((mod for mod in upgrades if mod['ItemType'] == un), None)
        if mod_info is None:
            print(f"{RED}Mod {i} ({un}) info not found in inventory{RESET}")
            continue
        print(f"{GREEN}Mod {i} ({un}) found in inventory with info: {mod_info}{RESET}")

    mods_set = set()
    for mod in inv['Upgrades'] + inv['RawUpgrades']:
        mods_set.add(mod_un_name_map.get(mod['ItemType'], mod['ItemType']))

    unobtained_cmods = list(corrupted_mods_set.difference(mods_set))
    print(unobtained_cmods)
    
def main_get_platform_name():
    import zlib
    
    magic_numbers = [753, 639, 247, 37, 60, 161]
    
    def get_discriminator(name, platform_id):
        name_lower = name.lower() + "595"
        return (zlib.crc32(name_lower.encode()) + magic_numbers[platform_id]) % 1000
    
    print(list(get_discriminator("Orrka", i) for i in range(6)))

def main_explore_inventory():
    # if len(sys.argv) < 2:
    #     p = Path("/mnt/c/Users/User/AppData/Local/AlecaFrame/lastData.dat")
    # else:
    #     p = Path(sys.argv[1])
    # inv = get_inventory(p)
    # with open('./export/inv.json', 'w') as f:
    #     f.write(json.dumps(inv, indent=4))
    
    with open('./export/inv.json', 'r') as f:
        inv = json.load(f)

    # a = [item['ItemType'] for item in inv['MiscItems'] if item['ItemType'].startswith('/Lotus/Types/Game/Projections')]
    # print(a)
    s = WarframePublicExport().get_relic_sets()
    with open('./export/wfe_relic_sets.json', 'w') as f:
        f.write(json.dumps(s, indent=4))

class WarframeWiki:
    def __init__(self):
        self.weapon_data_cache = None
        self.baro_data_cache = None
        self.nightwave_items_cache = None
        self.warframe_pve_augment_mods_cache = None

    def _get_data_from_url(self, url, decode_lua=True):
        """
            if decode_lua is True:
                we expect the returned text is: "return {...}"
                and we manually patch out stuff that can't be parsed by luadata, e.g., math.huge
            if decode_lua is False:
                we just return the text as is
        """
        import requests
        r = requests.get(url)
        if r.status_code != 200:
            raise Exception(f"Failed to get data from {url}, status code: {r.status_code}")

        if decode_lua:
            lua_code = r.text
            try:
                lua_code = lua_code.replace('return ', '', 1)
                lua_code = lua_code.replace('math.huge', '10000000')
                data = luadata.unserialize(lua_code, encoding="utf-8", multival=False)
            except Exception as e:
                print(f"Error occurred while parsing {url}: {e}")
                raise e
            return data
        else:
            return r.text

    def _get_all_weapon_data(self, use_cache=True):
        if use_cache and self.weapon_data_cache is not None:
            return self.weapon_data_cache

        # return {'primary': the dict that warframe market returns, etc}
        urls = {
            'primary': 'https://wiki.warframe.com/w/Module:Weapons/data/primary?action=raw',
            'secondary': 'https://wiki.warframe.com/w/Module:Weapons/data/secondary?action=raw',
            'melee': 'https://wiki.warframe.com/w/Module:Weapons/data/melee?action=raw',
            'archwing': 'https://wiki.warframe.com/w/Module:Weapons/data/archwing?action=raw',
            'companion': 'https://wiki.warframe.com/w/Module:Weapons/data/companion?action=raw',
            'railjack': 'https://wiki.warframe.com/w/Module:Weapons/data/railjack?action=raw',
            'modular': 'https://wiki.warframe.com/w/Module:Weapons/data/modular?action=raw',
            'misc': 'https://wiki.warframe.com/w/Module:Weapons/data/misc?action=raw',
        }

        datas = {}
        for key, url in urls.items():
            print(f"Fetching data for {key} from {url}...")
            datas[key] = self._get_data_from_url(url)

        if use_cache:
            self.weapon_data_cache = datas
        return datas

    def _get_baro_data(self, use_cache=True):
        url = "https://wiki.warframe.com/w/Module:Baro/data?action=raw"
        if use_cache and self.baro_data_cache is not None:
            return self.baro_data_cache
        data = self._get_data_from_url(url)
        if use_cache:
            self.baro_data_cache = data
        return data

    def get_weapon_uname_family_map(self, use_cache=True):
        # get the weapon family map
        # it will return two dicts: {uname -> family_name}, {family_name -> [uname1, uname2, ...]}
        weapon_data = self._get_all_weapon_data(use_cache=use_cache)
        uname_family_map = {}
        for data in weapon_data.values():
            for info in data.values():
                uname = info.get('InternalName', None)
                family_name = info.get('Family', None)
                if uname is None or family_name is None:
                    continue
                uname_family_map[uname] = family_name
        return uname_family_map

    def get_weapon_family_unames_map(self, use_cache=True):
        weapon_data = self._get_all_weapon_data(use_cache=use_cache)
        family_unames_map = {}
        for data in weapon_data.values():
            for info in data.values():
                uname = info.get('InternalName', None)
                family_name = info.get('Family', None)
                if uname is None or family_name is None:
                    continue
                if family_name not in family_unames_map:
                    family_unames_map[family_name] = []
                family_unames_map[family_name].append(uname)
        return family_unames_map

    def get_baro_items(self, use_cache=True):
        # return {'mod': ['Primed Chamber', ...], 'weapon': ['Zylok', ...]}
        baro_data = self._get_baro_data(use_cache=use_cache)
        items = {
            'mod': [],
            'weapon': [],
        }
        for item in baro_data.get('Items', []).values():
            item_type = item.get('Type', None)
            if 'Mod' in item_type:
                items['mod'].append(item.get('Name', None))
            elif item_type == 'Weapon':
                items['weapon'].append(item.get('Name', None))
        return items

    def get_nightwave_items(self, use_cache=True):
        """
        we only care about mods and weapons
        """
        url = "https://wiki.warframe.com/w/Nightwave/Offerings?action=raw"
        if use_cache and self.nightwave_items_cache is not None:
            return self.nightwave_items_cache
        data = self._get_data_from_url(url, decode_lua=False)

        # we find all {{M|mod name}} and {{Weapon|weapon name}}
        mod_pattern = re.compile(r'\{\{M\|([^}]+)\}\}')
        weapon_pattern = re.compile(r'\{\{Weapon\|([^}]+)\}\}')
        mods = mod_pattern.findall(data)
        weapons = weapon_pattern.findall(data)
        data = {
            'mod': list(set(mods)),
            'weapon': list(set(weapons)),
        }
        
        if use_cache:
            self.nightwave_items_cache = data
        return data

    def get_warframe_pve_augment_mods(self, use_cache=True):
        """
            return [
                {"warframe": warframe name, "mods": [mod name, ...], "syndicate": [syndicate name, ...]},
            ]
        """
        url = "https://wiki.warframe.com/w/Warframe_Augment_Mods/PvE?action=raw"
        if use_cache and self.warframe_pve_augment_mods_cache is not None:
            return self.warframe_pve_augment_mods_cache
        data = self._get_data_from_url(url, decode_lua=False)

        # we find all {{M|mod name}} and {{Weapon|weapon name}}
        augment_mods = []
        mod_pattern = re.compile(r'\{\{M\|([^}]+)\}\}')
        warframe_pattern = re.compile(r'\{\{WF\|([^}]+)\}\}')
        faction_pattern = re.compile(r'\{\{Faction\|([^}]+)\}\}')

        data = "id=\"" + data + "id=\""
        for text in data.split("id=\"")[1:]:
            mod = mod_pattern.findall(text)
            warframe = warframe_pattern.findall(text)
            faction = faction_pattern.findall(text)
            if not warframe:
                continue
            augment_mods.append({
                "warframe": warframe[0],
                "mods": mod,
                "syndicate": faction,
            })

        if use_cache:
            self.warframe_pve_augment_mods_cache = augment_mods
        return augment_mods

    
    def main(self):
        a = self.get_baro_items()
        with open('./export/warframe_wiki_weapon_data.json', 'w') as f:
            f.write(json.dumps(a, indent=4))

def get_archon_shard_info():
    """
        the data will be like:
        {
            "ACC_RED": {
                "Name": "Crimson Archon Shard",
                "Attributes": {
                    "/Lotus/Upgrades/Invigorations/ArchonCrystalUpgrades/ArchonCrystalUpgradeMeleeCritDamage": "+25% Melee Critical Damage",
                    "/Lotus/Upgrades/Invigorations/ArchonCrystalUpgrades/ArchonCrystalUpgradePrimaryStatusChance": "+25% Primary Status Chance",
                    ...
                }
            },
            ...
        }
    """
    path = Path(__file__).parent / 'archon_shard.json'
    with open(path, 'r') as f:
        data = json.load(f)
    return data

class Overframe:
    def __init__(self):
        self.DEFAULT_PAGE = "https://overframe.gg/build/new/13/atlas/"
        self.overframe_page_cache = {}
        self.overframe_url_map_cache = None
        self.overframe_page_data_cache = {}

    def _get_overframe_page(self, page_url, use_cache=True):
        """
        get the page content of overframe.gg page
        ref. src/data/inventory/overframe.md: Overframe > Data > Data Fetching > Webpack Fetching
        """
        if use_cache and page_url in self.overframe_page_cache:
            return self.overframe_page_cache[page_url]
        script_path = Path(__file__).parent / 'get_webpage.py'
        text = subprocess.Popen(
            ['xvfb-run', '-a', 'python', str(script_path), page_url], 
            stdout=subprocess.PIPE
        ).stdout.read().decode('utf-8')
        if use_cache:
            self.overframe_page_cache[page_url] = text
        return text

    def _get_overframe_url_map(self, use_cache=True):
        """
            return a dict of {name: url} for all the webpack js files used in overframe.gg
            e.g., {
                'db/variants': 'https://static.overframe.gg/_next/static/db/variants.3a89436831e541ca.js',
                ...
            }
            There should be at least:
                'db/abilities', 'db/abilitystats', 'db/glyphs', 'db/items', 'db/moddescriptions', 
                'db/mods', 'db/modsets', 'db/modularparts', 'db/patchlogs', 'db/relicrewards', 'db/rivens', 
                'db/sources', 'db/variants', 
                'i18n/de-json', 'i18n/es-json', 'i18n/fr-json', 'i18n/it-json', 'i18n/ja-json', 'i18n/ko-json', 
                'i18n/pl-json', 'i18n/pt-json', 'i18n/ru-json', 'i18n/tc-json', 'i18n/tr-json', 'i18n/uk-json', 'i18n/zh-json'
        """
        if use_cache and self.overframe_url_map_cache is not None:
            return self.overframe_url_map_cache

        text = self._get_overframe_page(self.DEFAULT_PAGE)
        webpack_filename = re.search(r'webpack.*?\.js', text).group()
        r = requests.get(f'https://static.overframe.gg/_next/static/chunks/{webpack_filename}')
        t = r.text
        t = t[t.find('"static/chunks/"'):]
        name_map, nonce_map = tuple([
            json.loads(re.sub(r'(\d+):', r'"\1":', bracket_text.group(0))) 
            for bracket_text, _ in zip(re.finditer(r'\{([^}]+)\}', t), range(2))
        ])

        url_map = {
            name_map[i]: f"https://static.overframe.gg/_next/static/chunks/{name_map[i]}.{nonce_map[i]}.js"
            for i in name_map
        }
        if use_cache:
            self.overframe_url_map_cache = url_map
        return url_map 

    def _parse_webpack_js(self, text):
        """
        ref. src/data/inventory/overframe.md: Overframe > Data > Data Parsing
        
        text is the content of a webpack js file, 
        e.g., requests.get('https://static.overframe.gg/_next/static/chunks/db/abilities.a658d8c8a74f481a.js').text
        """
        json_text = text[text.find("JSON.parse('")+12:text.rfind("'")].replace("\\'", "'").replace('\\\\', '\\')
        # escape unicude \x
        json_text = re.sub(r'\\x([0-9a-fA-F]{2})', lambda m: chr(int(m.group(1), 16)), json_text)
        data = json.loads(json_text)
        return data

    def _test_get_all_pages(self):
        url_map = self._get_overframe_url_map()
        for name, url in url_map.items():
            print(f"Fetching {name} from {url}...")
            text = requests.get(url).content.decode('utf-8')
            filename = Path(f'./export/overframe/{name}.json')
            if not filename.parent.exists():
                filename.parent.mkdir(parents=True)
            with open(filename, 'w') as f:
                json.dump(self._parse_webpack_js(text), f, indent=4)

    def _get_data(self, name, use_cache=True):
        """
            name: str, the name of the webpack js file, e.g., 'db/variants'
            return: dict, the data
        """
        if use_cache and name in self.overframe_page_data_cache:
            return self.overframe_page_data_cache[name]

        url_map = self._get_overframe_url_map(use_cache=use_cache)
        if name not in url_map:
            raise ValueError(f"Name {name} not found in overframe url map")
        url = url_map[name]
        text = requests.get(url).content.decode('utf-8')
        data = self._parse_webpack_js(text)

        if use_cache:
            self.overframe_page_data_cache[name] = data

        return data

    def get_item_id(self, use_cache=True):
        """
        return id of all moddable items, from uname to id
        """
        return {
            uname: item['id']
            for uname, item in self._get_data('db/items', use_cache=use_cache).items()
            if 'id' in item
        }

    def get_mod_id(self, use_cache=True):
        """
        return id of all mods, from uname to id
        """
        return {
            uname: mod['id']
            for uname, mod in self._get_data('db/mods', use_cache=use_cache).items()
            if 'id' in mod
        }

    def get_ability_id(self, use_cache=True):
        """
        return id of all abilities, from uname to id
        """
        return {
            uname: mod['id']
            for uname, mod in self._get_data('db/abilities', use_cache=use_cache).items()
            if 'id' in mod
        }



def main_tmp():
    # if len(sys.argv) < 2:
    #     p = Path("/mnt/c/Users/User/AppData/Local/AlecaFrame/lastData.dat")
    # else:
    #     p = Path(sys.argv[1])
    # inv = get_inventory(p)

    # upgrades = {
    #     upgrade['ItemId']['$oid']: upgrade
    #     for upgrade in inv['Upgrades']
    # }

    # # umbra = [suit for suit in inv['Suits'] if suit['ItemType'] == "/Lotus/Powersuits/Excalibur/ExcaliburUmbra"][0]
    # umbra = [suit for suit in inv['Pistols'] if suit['ItemType'] == "/Lotus/Weapons/Tenno/Pistols/SapientPistol/SapientPistol"][0]
    # print(umbra['Configs'][0]['Upgrades'])
    # for upgrade_id in umbra['Configs'][0]['Upgrades']:
    #     if upgrade_id in upgrades:
    #         upgrade = upgrades[upgrade_id]
    #         print(upgrade['ItemType'], upgrade.get('UpgradeFingerprint', None))
    #     elif upgrade_id == "":
    #         print("(N/A)")
    #     else:
    #         print(upgrade_id, "(raw)")
    wof = Overframe()
    wof.get_item_id()
    wof.get_mod_id()
    wof.get_ability_id()


if __name__ == '__main__':
    # main_decrypt_lastdata()
    # main_incarnon_riven()
    # main_incarnon()
    # main_corrupted_mods()
    # main_explore_inventory()
    # print(WarframeWiki().get_augment_mods())
    # main_get_platform_name()
    # main_public_export()
    # main_disposition()
    # pe_weapon = WarframePublicExport()._get_public_export('ExportWeapons')
    # print(set([w['productCategory'] for w in pe_weapon]))
    main_tmp()