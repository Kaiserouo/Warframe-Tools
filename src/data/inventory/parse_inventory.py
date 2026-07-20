import sys
from pathlib import Path
import json
from typing import Counter
import re
import requests
import lzma

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
        response = requests.get(f'https://origin.warframe.com/PublicExport/index_{lang}.txt.lzma')
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
    
    

if __name__ == '__main__':
    # main_decrypt_lastdata()
    # main_incarnon_riven()
    main_incarnon()
    # main_public_export()
    # main_disposition()
