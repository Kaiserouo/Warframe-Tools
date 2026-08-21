import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query'

import ItemTable from '../../components/item_table.jsx';
import { Loading, LoadingProgress, Error } from '../../components/loading_status.jsx';
import { fetchBaroData } from '../../api/fetch.jsx';

export default function Baro({setting}) {
  const { isPending: baroIsPending, error: baroError, data: baroData } = useQuery({
    queryKey: ['baro_data'],
    queryFn: () => fetchBaroData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  let itemTable = {};
  if (baroData && setting.inventory.data) {
    const { baro_items: baroItems, mod_name_map: modNameMap, weapon_name_map: weaponNameMap } = baroData;
    const { mod: mods, weapon: weapons } = baroItems;
    console.log(baroData);

    const ownedMods = new Set();
    for (const type of ["Upgrades", "RawUpgrades"]) {
        for (const mod of setting.inventory.data[type]) {
            ownedMods.add(modNameMap[mod["ItemType"]]);
        }
    }
    const ownedWeapons = new Set();
    for (const type of ["LongGuns", "Melee", "Pistols", "SpaceGuns", "SpaceMelee", "SentinelWeapons"]) {
        for (const weapon of setting.inventory.data[type]) {
            ownedWeapons.add(weaponNameMap[weapon["ItemType"]]);
        }
    }
    
    itemTable['headers'] = [
        {'id': 'item_name', 'name': 'Item Name', 'type': 'string'},
        {'id': 'type', 'name': 'Type', 'type': 'string'},
        {'id': 'is_owned', 'name': 'Owned', 'type': 'string'},
    ]
    itemTable['items'] = [];
    for (const mod of mods) {
        itemTable['items'].push({
            'item_name': mod,
            'type': 'Mod',
            'is_owned': ownedMods.has(mod) ? 'Yes' : 'No',
        });
    }
    for (const weapon of weapons) {
        itemTable['items'].push({
            'item_name': weapon,
            'type': 'Weapon',
            'is_owned': ownedWeapons.has(weapon) ? 'Yes' : 'No',
        });
    }
  }


  return (<>
  <div className="mx-4 my-4">
    <div className="text-2xl font-bold text-white my-2">
      <p>Baro Data</p>
    </div>

    {/* we separate the loading progress and error display because if there is still data from last time, we still wanna display that */}
    {baroIsPending ? <Loading message="Loading Baro Data" /> : null}
    {!baroIsPending && baroError ? <Error message={`ERROR: ${baroError}`} /> : null}
    {baroData && itemTable ? <ItemTable itemTable={itemTable} setting={setting} /> : null}
    </div>
  </>);
}

