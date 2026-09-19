import { useState, useCallback, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query'

import { Loading, Error } from '../../components/loading_status.jsx';
import { queriesInventoryRelicData } from '../../api/fetch.jsx';
import ItemTable from '../../components/item_table.jsx';

function calculateLackCount(relicSet, itemCount) {
  /*
    relicSet: a particular relic set, e.g., for Voruna:
      {
          "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeHelmetBlueprint": 1,
          "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeChassisBlueprint": 1,
          "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeSystemsBlueprint": 1,
          "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeBlueprint": 1
      }
    itemCount: dict with the same keys (or less) which contains the number of items the user has

    returns: the dict with the same keys as relicSet, with values indicating how many of this item the user is lacking
    in order to make a set
    
    > the definition of the lacking count is a bit weird. given an item and a set, the number N is called this number's
    > lacking count of this set, if we can make N more sets when the user gets N more of this item.
    > note that with this definition, only one item at most would have a non-zero lacking count for a set
  */
  let availSetCounts = Object.keys(relicSet).map(item => Math.floor((itemCount[item] || 0) / relicSet[item]));
  availSetCounts = availSetCounts.sort((a, b) => a - b);
  const secondLowestSetCount = availSetCounts.length >= 2 ? availSetCounts[1] : 0;
  const lackingCount = Object.keys(relicSet).reduce((acc, item) => {
      acc[item] = Math.max(0, secondLowestSetCount * relicSet[item] - (itemCount[item] || 0));
      return acc;
    }, {});
  console.log('calculateLackCount', "relicSet", relicSet, "itemCount", itemCount, "secondLowestSetCount", secondLowestSetCount, "lackingCount", lackingCount);
  return lackingCount;
}

function calculateLackCountAll(relicSets, itemCount) {
  /*
    relicSets: the thing returned by fetchPERelicData().relic_set
      e.g., {
        "/Lotus/Powersuits/Werewolf/VorunaPrime": {
            "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeHelmetBlueprint": 1,
            "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeChassisBlueprint": 1,
            "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeSystemsBlueprint": 1,
            "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeBlueprint": 1
        },
        ...
      }
    itemCount: dict with the same keys (or less) which contains the number of items the user has

    return: a dict with all items from relicSets, with values indicating how many of this item the user is lacking in order to make a set

    > Note that in case that an item appears multiple times in different sets (e.g,. Vasto Prime Barrel in Vasto and Akvasto Prime),
    > the lacking count would be the maximum of the two lacking counts from each set
    > (note: lacking count is not really additive because different sets may need the same materials, which complicates the math)
  */
  let lackingCount = {};
  for (const relicSet of Object.values(relicSets)) {
    const curLackingCount = calculateLackCount(relicSet, itemCount);
    for (const [item, count] of Object.entries(curLackingCount)) {
      if (lackingCount[item] === undefined || lackingCount[item] < count) {
        lackingCount[item] = count;
      }
    }
  }
  return lackingCount;
}

function getItemCount(inventoryData) {
  const itemCount = {};
  for (const category of ["MiscItems", "Recipes"]) {
    for (const item of inventoryData[category]) {
      itemCount[item["ItemType"]] = item["ItemCount"];
    }
  }
  return itemCount;
}

function getRelicSetForItem(relicSets) {
  /*
    return the relic set that contains the item
    e.g., {
      "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeHelmetBlueprint": [VorunaPrimeSetUname],
      ...
    }
    where VorunaPrimeSetUname is the uname of the voruna prime set, which is a key in relicSets
  */
  const itemToRelicSet = {};
  for (const [relicSetUname, relicSet] of Object.entries(relicSets)) {
    for (const item of Object.keys(relicSet)) {
      if (!itemToRelicSet[item]) {
        itemToRelicSet[item] = [];
      }
      itemToRelicSet[item].push(relicSetUname);
    }
  }
  return itemToRelicSet;
}

function getItemInfo(relicSets, iconMap, nameLookupMap, inventoryData) {
  /*
    for each item, return the info about it to be rendered
    i.e., 
    return := {itemUname: itemInfo}
    itemInfo := {
      itemUname: string    // the unique name of the item
      itemName: string     // the name of the item
      itemCount: int       // the number of this item the user has
      icon: string         // url
      relicSetUnames: [relicSetUname, ...] // the relic set that contains this item
      lackingCount: int    // the lacking count of an item
    }
  */
  const itemToRelicSet = getRelicSetForItem(relicSets);
  const itemCount = getItemCount(inventoryData);
  const itemLackingCount = calculateLackCountAll(relicSets, itemCount);
  return Object.keys(itemToRelicSet).reduce((acc, itemUname) => {
    acc[itemUname] = {
      itemUname: itemUname,
      itemName: nameLookupMap[itemUname] || null,
      itemCount: itemCount[itemUname] || 0,
      icon: iconMap[itemUname] || null,
      relicSetUnames: itemToRelicSet[itemUname],
      lackingCount: itemLackingCount[itemUname] || 0
    };
    return acc;
  }, {});
}

function RelicSetString(relicSetUname, relicSets, itemCount, nameLookupMap) {
  /*
    return a string that describes the relic set, e.g., "
      [Voruna Prime](3)
        - Voruna Prime Blueprint (1)
    "
  */
  const relicSet = relicSets[relicSetUname];
  const itemCountForSet = Math.min(...Object.keys(relicSet).map(item => Math.floor((itemCount[item] || 0) / relicSet[item])));
  return (<>
    <p>{`[${nameLookupMap[relicSetUname] || relicSetUname}](${itemCountForSet} sets)`}</p>
    <ul className="list-disc list-inside">
      {Object.keys(relicSet).map(item => {
        const itemName = nameLookupMap[item] || item;
        const itemCountForItem = itemCount[item] || 0;
        return <li>{itemName} ({itemCountForItem}/{relicSet[item]})</li>;
      })}
    </ul>
  </>)
}
function RelicSetsString(relicSetUnames, relicSets, itemCount, nameLookupMap) {
  return (<>
    {relicSetUnames.map((relicSetUname, idx) => <div key={idx}>{RelicSetString(relicSetUname, relicSets, itemCount, nameLookupMap)}</div>)}
  </>);
}

export default function Relic({setting}) {
  const { isPending: relicIsPending, error: relicError, data: relicData } = useQueries(queriesInventoryRelicData);

  let itemTable = null;
  if (relicData && setting.inventory?.data) {
    const {relic_sets: relicSets, icon_map: iconMap, name_lookup_map: nameLookupMap} = relicData;
    console.log("relicSets", relicSets, "iconMap", iconMap, "nameLookupMap", nameLookupMap);
    const itemInfos = getItemInfo(relicSets, iconMap, nameLookupMap, setting.inventory.data);
    const itemCount = getItemCount(setting.inventory.data);
    itemTable = {
      "headers": [
        // {"id": str, "name": str, "type": Literal["number", "deviation", "string", "url", "item_name"], setting: Optional[dict]}
        {id: "item_name", name: "Item Name", type: "string"},
        {id: "item_count", name: "Item Count", type: "integer"},
        {id: "lacking_count", name: "Lacking Count", type: "integer"},
        {id: "relic_sets", name: "Relic Sets", type: "react"},
      ],
      "items": Object.values(itemInfos).map(itemInfo => ({
        "item_name": itemInfo.itemName,
        "item_count": itemInfo.itemCount,
        "lacking_count": itemInfo.lackingCount,
        "relic_sets": RelicSetsString(itemInfo.relicSetUnames, relicSets, itemCount, nameLookupMap),
      })),
    }
  }
  console.log("itemTable", itemTable);

  return (<>
  <div className="mx-4 my-4">
    <div className="text-2xl font-bold text-white my-2">
      <p>Relic</p>
    </div>
    <div className="text-white font-sans my-2">
      <p className="text-yellow-500 font-bold">&lt; Requires inventory file: add that in the Options menu &gt;</p>
      <p>Sometimes, you wanna see what relics to farm based on whether you can make more sets of items.</p>
      <p className="text-gray-400">(For example, if you have 3 Xaku Prime BP, 13 Xaku Prime Chassis BP, 17 Xaku Prime Systems BP, 23 Xaku Prime Neuroptics BP, you wanna farm Xaku Prime BP because you can make more sets of Xaku Prime out of it.)</p>
      <br />
      <p>We caculate the <span className="font-bold">Lacking Count</span> of each item based on your inventory.</p>
      <p>If an item's lacking count is N, it means you can make N more sets if you get N more of that item.</p>
      <p className="text-gray-400">(In the above example, the lacking count of Xaku Prime BP is 10, because you can make 10 more Xaku Prime Sets if you get 10 more Xaku Prime BP. Note that the lacking count of Xaku Prime Chassis BP is 0 because you can't make any more Xaku Prime Sets even if you get more of it.)</p>
    </div>

    {/* we separate the loading progress and error display because if there is still data from last time, we still wanna display that */}
    {relicIsPending ? <Loading message="Loading Relic Data" /> : null}
    {!relicIsPending && relicError ? <Error message={`ERROR: ${relicError}`} /> : null}
    {relicData && itemTable ? <ItemTable itemTable={itemTable} setting={setting} /> : null}
    </div>
  </>);
}

