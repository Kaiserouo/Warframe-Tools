import { useState, useMemo } from 'react';

import ItemTable from '../../components/item_table.jsx';
import { Loading, LoadingProgress, Error } from '../../components/loading_status.jsx';
import { queriesMissingItemChecklistData } from '../../api/fetch.jsx';
import { useQueries } from '@tanstack/react-query'

function SelectMenu({options, choice, setChoice, setting}) {
    return (<>
        <select
            value={choice || ""}
            onChange={(e) => setChoice(e.target.value)}
            className="max-w-md flex border border-gray-600 rounded px-4 py-2 bg-[#393E46] text-white"
        >
            <option value="">Choose checklist</option>
            {options.map(option => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    </>);
}

export default function MissingItemChecklist({setting}) {
  const { isPending: micIsPending, error: micError, data: micData } = useQueries(queriesMissingItemChecklistData);

  const [choice, setChoice] = useState(null);   // null | anything in micData

  const ownedItems = useMemo(() => {
    const ownedItems = {
        'mods': {}, 'weapons': new Set(),
    };
    if (!micData || !setting.inventory) {
        return ownedItems;
    }
    const { missing_item_checklist: micList, mod_name_map: modNameMap, weapon_name_map: weaponNameMap } = micData;

    const ownedMods = {};   // {mod name: {"raw": int, "upgraded": int}}
    for (const type of ["Upgrades", "RawUpgrades"]) {
        for (const mod of setting.inventory.data[type]) {
            const modName = modNameMap[mod["ItemType"]];
            if (!ownedMods[modName]) {
                ownedMods[modName] = { "raw": 0, "upgraded": 0 };
            }
            if (type === "RawUpgrades") {
                ownedMods[modName]["raw"] += mod["ItemCount"];
            } else {
                ownedMods[modName]["upgraded"] += 1;
            }
        }
    }
    const ownedWeapons = new Set();
    for (const type of ["LongGuns", "Melee", "Pistols", "SpaceGuns", "SpaceMelee", "SentinelWeapons"]) {
        for (const weapon of setting.inventory.data[type]) {
            ownedWeapons.add(weaponNameMap[weapon["ItemType"]]);
        }
    }

    ownedItems['mods'] = ownedMods;
    ownedItems['weapons'] = ownedWeapons;
    return ownedItems;
  }, [micData, setting.inventory]);

  const itemTable = useMemo(() => {
    if (!micData) {
        // note that if the user doesn't have the inventory file loaded, we still want to show the checklist
        return null;
    }

    const { missing_item_checklist: micList } = micData;
    if(!(choice in micList)) {
        return null;
    }

    const headers = micList[choice]['headers'];
    const items = micList[choice]['items'].map(item => {
        if (item['type'] === 'Mod') {
            const modName = item['name'];
            const ownedMod = ownedItems['mods'][modName] || { "raw": 0, "upgraded": 0 };
            item['owned'] = ownedMod['raw'] > 0 || ownedMod['upgraded'] > 0 ? 'Yes' : 'No';
            item['status'] = `upgraded: ${ownedMod['upgraded']}\nraw: ${ownedMod['raw']}`;
        } else if (item['type'] === 'Weapon') {
            const weaponName = item['name'];
            item['owned'] = ownedItems['weapons'].has(weaponName) ? 'Yes' : 'No';
            item['status'] = '';
        }
        return item;
    });

    return { headers: headers, items: items };
  }, [micData, ownedItems, choice]);

  console.log("itemTable", itemTable);
  console.log("ownedItems", ownedItems);

  return (<>
  <div className="mx-4 my-4">
    <div className="text-2xl font-bold text-white my-2">
      <p>Missing Item Checklist</p>
    </div>

    {/* we separate the loading progress and error display because if there is still data from last time, we still wanna display that */}
    {micIsPending ? <Loading message="Loading Checklist Data" /> : null}
    {!micIsPending && micError ? <Error message={`ERROR: ${micError}`} /> : null}

    {micData ? <SelectMenu options={Object.keys(micData.missing_item_checklist)} choice={choice} setChoice={setChoice} setting={setting} /> : null}
    {setting.inventory === null ? <Loading message="No inventory file loaded. Please load your inventory file in the Options &gt; Inventory File." /> : null}
    {micData && itemTable ? <ItemTable itemTable={itemTable} setting={setting} /> : null}


    
    </div>
  </>);
}

