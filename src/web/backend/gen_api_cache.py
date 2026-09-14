"""
for github

caching api results into files s.t. it would work for github pages
"""

from .server import app
from pathlib import Path
from tqdm import tqdm
from sys import argv

fetch_urls = [
    # must NOT start with "/"
    # for 'api/hello', we request "/api/hello" and store the result in "<fetch_output_dir_path>/api/hello"
    'api/public_export/data/en/get_weapon_name_map',
    'api/public_export/data/en/get_weapon_type_map',
    'api/public_export/data/en/get_weapon_riven_disposition',
    'api/public_export/data/en/get_riven_loctag_map',
    'api/public_export/data/en/get_incarnon_weapons',
    'api/public_export/data/en/get_icon_map',
    'api/wiki/data/get_weapon_uname_family_map',
    'api/wiki/data/get_weapon_family_unames_map',
    'api/wiki/data/get_baro_items',
    'api/public_export/data/en/get_mod_name_map',
    'api/public_export/data/en/get_relic_set',
    'api/public_export/data/en/get_relic_reward',
    'api/public_export/data/en/get_name_lookup_map',
    'api/public_export/data/en/get_warframe_info_map',
    'api/public_export/data/en/get_ability_info_map',
    'api/overframe/data/get_item_id',
    'api/overframe/data/get_mod_id',
    'api/overframe/data/get_ability_id',
    '/api/other/data/get_archon_shard_info',
    'api/missing_item_checklist'
]
fetch_output_dir_path = Path(argv[1])  # e.g. "./src/web/frontend/build_github_page"

if __name__ == '__main__':
    with app.test_client() as client:
        for fetch_url in tqdm(fetch_urls):
            try:
                response = client.get(f'/{fetch_url}')
                data = response.get_data(as_text=True)
                path = fetch_output_dir_path / fetch_url
                path.parent.mkdir(parents=True, exist_ok=True)
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(data)
            except:
                print(f'Failed to fetch {fetch_url}')