import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'
import { fetchLoadoutData } from '../../api/fetch.jsx';
import LoadoutTable from '../../components/loadout_table.jsx';
import { Loading, LoadingProgress, Error } from '../../components/loading_status.jsx';

function parseLoadout(loadoutData, inventoryData) {
    /*
        make loadouts
        
        the loadout is formed as follows:
        {
            category (str in [warframe, primary, secondary, melee, companions, archwing, necramech, exalted]): [
                {
                    uname: str,
                    name: str,
                    search_text: str,
                    loadouts: [
                        {
                            name: str (if no name, please follow warframe naming tradition and use CONFIG A etc),
                            overframe_link: str
                        }, ...
                    ],
                    archon_shard (optional): [
                        {
                            color: str (e.g., "ACC_GREEN"),
                            attribute: str (e.g., "/Lotus/Upgrades/Invigorations/ArchonCrystalUpgrades/*"),
                        }
                    ]
                }, ...
            ]
        }
    */

    console.log("parseLoadout", loadoutData, inventoryData);

    const {
        archon_shard_map: archonShardMap,
        mod_name_map: modNameMap,
        warframe_info_map: warframeInfoMap,
        ability_info_map: abilityInfoMap,

        overframe_item_id_map: OFItemIdMap,
        overframe_mod_id_map: OFModIdMap,
        overframe_ability_id_map: OFAbilityIdMap,
    } = loadoutData;

    const modOidMap = {};       // oid -> [overframe mod id, mod level, 0 (set polarity yourself)]
    for (const mod of inventoryData['Upgrades']) {
        if (!(mod['ItemType'] in OFModIdMap)) {
            continue;   // this mod isn't in overframe
        }
        const upgradeFingerprint = JSON.parse(mod['UpgradeFingerprint']);

        // TODO: deal with riven mod
        modOidMap[mod['ItemId']['$oid']] = [OFModIdMap[mod['ItemType']], upgradeFingerprint['lvl'], 0];
    }

    function _parseMod(modId) {
        // map the mod id in config to [overframe mod id, mod level, 0 (set polarity yourself)]
        // deals with: oid ("665c6dc483051570340221fb"), raw ("/Lotus/Upgrades/Mods/Pistol/WeaponPistolConvertAmmoMod"), empty ("")
        if (modId === "") {
            return [0, 0, 0];
        }
        if (modId in modOidMap) {
            return modOidMap[modId];
        }
        if (modId in OFModIdMap) {
            return [OFModIdMap[modId], 0, 0];
        }
        return [0, 0, 0];     // this mod isn't in overframe
    }

    function _parseArchonShard(archonShardUpgrades) {
        return archonShardUpgrades.map((archonShardUpgrade) => {
            const color = archonShardUpgrade['Color'];
            const attribute = archonShardUpgrade['Attribute'];
            return {
                color: color,
                attribute: attribute,
            };
        });
    }

    function _genOverframeLink(itemType, config) {
        const id = OFItemIdMap?.[itemType] || -1;
        if (id === -1) {
            return null;    // this item isn't in overframe
        }

        const of_list = [1, id, 30, 1];
        const mod_list = (config['Upgrades'] || []).map((modId) => _parseMod(modId));
        of_list.push(mod_list);
        
        if ('AbilityOverride' in config) {
            of_list.push([
                config['AbilityOverride']['Index'],
                OFAbilityIdMap[config['AbilityOverride']['Ability']],
            ])
        }
        
        const of_list_str = JSON.stringify(of_list);
        const b64_of_list_str = btoa(of_list_str);
        return `https://overframe.gg/build/new/${id}/?bs=${b64_of_list_str}`;
    }

    function _parseCategory(itemDatas) {
        /* return a list of parsed items for the given category */
        const ls = [];
        for (const itemData of itemDatas) {
            const item = {
                uname: itemData['ItemType'],
                name: itemData['ItemType'], // TODO
                loadouts: [],
            };

            if ('ArchonCrystalUpgrades' in itemData) {
                item['archon_shard'] = _parseArchonShard(itemData['ArchonCrystalUpgrades']);
            }

            for (const i in itemData['Configs']) {
                const config = itemData['Configs'][i];
                const loadout = {
                    name: config['Name'] || `CONFIG ${String.fromCharCode("A".charCodeAt(0) + i)}`,
                    overframe_link: _genOverframeLink(itemData['ItemType'], config),
                };
                item['loadouts'].push(loadout);
            }

            item['search_text'] = `${item['name']}|${item['uname']}|${item['loadouts'].map((loadout) => loadout['name']).join('|')}`;
            
            ls.push(item);
        }
        return ls;
    }

    return {
        warframe: _parseCategory(inventoryData['Suits']),
        primary: _parseCategory(inventoryData['LongGuns']),
        secondary: _parseCategory(inventoryData['Pistols']),
        melee: _parseCategory(inventoryData['Melee']),
        companions: [
            ..._parseCategory(inventoryData['Sentinels']),
            ..._parseCategory(inventoryData['KubrowPets']),
            ..._parseCategory(inventoryData['MoaPets']),
        ],
        archwing: _parseCategory(inventoryData['SpaceSuits']),
        necramech: _parseCategory(inventoryData['MechSuits']),
        exalted: _parseCategory(inventoryData['SpecialItems']),
    }
}

export default function Loadout({setting}) {
  const [searchText, setSearchText] = useState(null);

  const { isPending: loadoutIsPending, error: loadoutError, data: loadoutData } = useQuery({
    queryKey: ['loadout_data'],
    queryFn: () => fetchLoadoutData(),
    staleTime: 60 * 60 * 1000, // 1 hour, it's most likely not needing a refresh until Options > Refresh
  })

  const loadoutInfo = useMemo(
    () => {
      if (!loadoutData || !setting.inventory?.data) 
        return {};
      return parseLoadout(loadoutData, setting.inventory?.data);
    },
    [loadoutData, setting.inventory?.data]
  );


  return (<>
  <div className="mx-4 my-4">
    <div className="text-2xl font-bold text-white my-2">
      <p>Riven</p>
    </div>
    <div className="flex flex-row justify-between items-center gap-x-4">
      <div>
        <div className="text-white font-sans my-2">
          <p className="text-yellow-500 font-bold">&lt; Requires inventory file: add that in the Options menu &gt;</p>
          <p>An loadout viewer... kinda.</p>
          <p>Generates overframe links for the loadout.</p>
        </div>
    </div>
    </div>

    {loadoutIsPending ? <Loading message="Loading loadout data..." /> : null}
    {loadoutError ? <Error message={`ERROR: ${loadoutError}`} /> : null}

    <LoadoutTable loadoutData={loadoutData} loadoutInfo={loadoutInfo} searchText={searchText} />
  </div>
  </>);
}