import { useState, useCallback, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query'

import { Loading, Error } from '../../components/loading_status.jsx';
import { queriesInventoryRelicData } from '../../api/fetch.jsx';

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
  let lowestSetCount = Infinity;
  let nItemLowestSetCount = 0;
  for (const item of relicSet) {
    const curItemCount = itemCount[item] || 0;
    const setCount = Math.floor(curItemCount / relicSet[item]);
    if (setCount < lowestSetCount) {
      lowestSetCount = setCount;
      nItemLowestSetCount = 1;
    } else if (setCount === lowestSetCount) {
      nItemLowestSetCount += 1;
    }
  }
  if (nItemLowestSetCount > 1) {
    // all zero
    return relicSet.items().reduce((acc, item) => {
      acc[item] = 0;
      return acc;
    }, {});
  }
  return relicSet.items().reduce((acc, item) => {
      acc[item] = Math.max(0, (itemCount[item] || 0) - lowestSetCount * relicSet[item]);
      return acc;
    }, {});
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
      "/Lotus/Types/Recipes/WarframeRecipes/VorunaPrimeHelmetBlueprint": [VorunaPrimeSet],
      ...
    }
    where VorunaPrimeSet is the dict for voruna prime in the relic set
  */
  const itemToRelicSet = {};
  for (const [relicSetName, relicSet] of Object.entries(relicSets)) {
    for (const item of Object.keys(relicSet)) {
      if (!itemToRelicSet[item]) {
        itemToRelicSet[item] = [];
      }
      itemToRelicSet[item].push(relicSet);
    }
  }
  return itemToRelicSet;
}

function getItemInfo(relicSets, iconMap, nameLookupMap) {
  /*
    for each item, return the info about it to be rendered
    i.e., 
    return := {itemUname: itemInfo}
    itemInfo := {
      itemUname: string    // the unique name of the item
      itemName: string     // the name of the item
      itenCount: int       // the number of this item the user has
      icon: string         // url
      relicSet: [relicSet] // the relic set that contains this item
      lackingCount: int    // the lacking count of an item
    }
  */
  const itemToRelicSet = getRelicSetForItem(relicSets);
  const itemCount = getItemCount(setting.inventory.data);
  const itemLackingCount = calculateLackCountAll(relicSets, itemCount);
  return Object.keys(itemToRelicSet).reduce((acc, itemUname) => {
    acc[itemUname] = {
      itemUname: itemUname,
      itemName: nameLookupMap[itemUname] || null,
      itemCount: itemCount[itemUname] || 0,
      icon: iconMap[itemUname] || null,
      relicSet: itemToRelicSet[itemUname],
      lackingCount: itemLackingCount[itemUname] || -1
    };
  }, {});
}

export default function Relic({setting}) {
  const { isPending: relicIsPending, error: relicError, data: relicData } = useQueries(queriesInventoryRelicData);

  let itemTable = {};
  if (relicData && setting.inventory.data) {
    const {icon_map: iconMap, name_lookup_map: nameLookupMap} = relicData;
    const itemInfos = getItemInfo(relicData.relic_set, relicData.icon_map, relicData.name_lookup_map);
    
    itemTable = {
      "headers": [
        {"id": "relic_name", "name": "Relic Name"},
        {"id": "max_lacking_count_item", "name": "Max Lacking Count Item"},
        {"id": "max_lacking_count", "name": "Max Lacking Count"},
        {}
      ]
    };
  }


  return (<>
  <div className="mx-4 my-4">
    <div className="text-2xl font-bold text-white my-2">
      <p>Relic</p>
    </div>

    {/* we separate the loading progress and error display because if there is still data from last time, we still wanna display that */}
    {relicIsPending ? <Loading message="Loading Relic Data" /> : null}
    {!relicIsPending && relicError ? <Error message={`ERROR: ${relicError}`} /> : null}
    {relicData && itemTable ? <p>a</p> : null}
    </div>
  </>);
}

