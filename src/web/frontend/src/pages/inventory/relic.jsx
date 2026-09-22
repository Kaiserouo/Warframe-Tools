import { useState, useCallback, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query'

import { Loading, Error } from '../../components/loading_status.jsx';
import { queriesInventoryRelicData } from '../../api/fetch.jsx';
import ItemTable from '../../components/item_table.jsx';
import Infobox from '../../components/infobox.jsx';

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

function getRelicAvailableForItem(relicRewards, itemCount) {
  /*
    return {itemUname: relicCountInfo}
    relicCountInfo := {
      totalCount: int,
      t1Count: int,
      t2Count: int,
      t3Count: int,
      t4Count: int,
      
      relics: {relicUname: int, ...}
    }


    Silver
    Bronze
    Platinum
  */
  const itemRelicCount = {};
  for (let [relicUname, relic] of Object.entries(relicRewards)) {
    const relicType = relicUname.split('/').slice(-1)[0].slice(0, 2); // T1, T2, T3, T4
    if (!itemCount[relicUname]) {
      continue;
    }
    for (let itemUname in relic.relicRewards) {
      itemUname = itemUname.replace('/StoreItems', '', 1);
      if (!itemRelicCount[itemUname]) {
        itemRelicCount[itemUname] = {
          totalCount: 0,
          t1Count: 0,
          t2Count: 0,
          t3Count: 0,
          t4Count: 0,
          relics: {}
        };
      }
      itemRelicCount[itemUname].totalCount += itemCount[relicUname];
      switch (relicType) {
        case 'T1':
          itemRelicCount[itemUname].t1Count += itemCount[relicUname];
          break;
        case 'T2':
          itemRelicCount[itemUname].t2Count += itemCount[relicUname];
          break;
        case 'T3':
          itemRelicCount[itemUname].t3Count += itemCount[relicUname];
          break;
        case 'T4':
          itemRelicCount[itemUname].t4Count += itemCount[relicUname];
          break;
      }
      itemRelicCount[itemUname].relics[relicUname] = itemCount[relicUname];
    }
  }
  return itemRelicCount;
}

function getItemInfos(relicSets, relicRewards, iconMap, nameLookupMap, inventoryData, ducatPrice) {
  /*
    for each item, return the info about it to be rendered
    i.e., 
    return := {itemUname: itemInfo}
    itemInfo := {
      itemUname: string    // the unique name of the item
      itemName: string     // the name of the item
      itemCount: int       // the number of this item the user has
      ducatPrice: int  // the ducat price of the item
      icon: string         // url
      relicSetUnames: [relicSetUname, ...] // the relic set that contains this item
      lackingCount: int    // the lacking count of an item
      relicCounts: Dict      // the number of relics available for this item, ref. getRelicAvailableForItem()
      relics: {relicUname: int, ...} // the relics available for this item
    }
  */
  const itemToRelicSet = getRelicSetForItem(relicSets);
  const itemCount = getItemCount(inventoryData);
  const itemLackingCount = calculateLackCountAll(relicSets, itemCount);
  const itemRelicCount = getRelicAvailableForItem(relicRewards, itemCount);
  console.log("itemRelicCount", itemRelicCount);
  return Object.keys(itemToRelicSet).reduce((acc, itemUname) => {
    acc[itemUname] = {
      itemUname: itemUname,
      itemName: nameLookupMap[itemUname] || null,
      itemCount: itemCount[itemUname] || 0,
      ducatPrice: ducatPrice[itemUname] || 0,
      icon: iconMap[itemUname] || null,
      relicSetUnames: itemToRelicSet[itemUname],
      lackingCount: itemLackingCount[itemUname] || 0,
      relicCount: itemRelicCount[itemUname] || {
        totalCount: 0, t1Count: 0, t2Count: 0, t3Count: 0, t4Count: 0, relics: {}
      },
      relics: itemRelicCount[itemUname]?.relics || {},
    };
    return acc;
  }, {});
}

function RelicTypesString(itemInfo) {
  let header = null;
  let content = null;
  if (itemInfo.relicCount.totalCount === 0) {
    header = (<p className="text-gray-400">No Relics</p>);
    content = null;
  } else {
    header = (<p className="text-white font-bold">(
      <span className="text-amber-500">{itemInfo.relicCount.t1Count}</span>/
      <span className="text-gray-300">{itemInfo.relicCount.t2Count}</span>/
      <span className="text-gray-100">{itemInfo.relicCount.t3Count}</span>/
      <span className="text-yellow-300">{itemInfo.relicCount.t4Count}</span>
    )</p>);
  }

  return (<Infobox header={header} content={content} pos="right" />);
}

function RelicSetString(relicSetUname, relicSets, itemUname, itemCount, nameLookupMap) {
  /*
    return a string that describes the relic set, e.g., "
      [Voruna Prime](3)
        - Voruna Prime Blueprint (1)
    "
  */
  const relicSet = relicSets[relicSetUname];
  const itemCountForSet = Math.min(...Object.keys(relicSet).map(item => Math.floor((itemCount[item] || 0) / relicSet[item])));
  const header = (
    <p className="font-bold text-yellow-500 underline underline-offset-2 decoration-dotted">
      {`[${nameLookupMap[relicSetUname] || relicSetUname}](${itemCountForSet} sets)`}
    </p>
  );
  const content = (
    <ul className="list-disc list-inside whitespace-nowrap">
      {Object.keys(relicSet).map((item, idx) => {
        const itemName = nameLookupMap[item] || item;
        const itemCountForItem = itemCount[item] || 0;
        return <li key={idx} className={item === itemUname ? "font-bold text-green-500" : ""}>{itemName} ({itemCountForItem}/{relicSet[item]})</li>;
      })}
    </ul>
  );

  return (<>
    <Infobox header={header} content={content} pos="bottom-right-10" />
  </>)
}
function RelicSetsString(relicSetUnames, relicSets, itemUname, itemCount, nameLookupMap) {
  return (<>
    {relicSetUnames.map((relicSetUname, idx) => <div key={idx}>{RelicSetString(relicSetUname, relicSets, itemUname, itemCount, nameLookupMap)}</div>)}
  </>);
}

export default function Relic({setting}) {
  const { isPending: relicIsPending, error: relicError, data: relicData } = useQueries(queriesInventoryRelicData);

  let itemTable = null;
  if (relicData && setting.inventory?.data) {
    const {
      ducat_price: ducatPrice, 
      relic_sets: relicSets, 
      icon_map: iconMap, 
      name_lookup_map: nameLookupMap, 
      relic_rewards: relicRewards
    } = relicData;
    console.log("relicSets", relicSets, "iconMap", iconMap, "nameLookupMap", nameLookupMap);
    const itemInfos = getItemInfos(relicSets, relicRewards, iconMap, nameLookupMap, setting.inventory.data, ducatPrice);
    const itemCount = getItemCount(setting.inventory.data);
    
    itemTable = {
      "headers": [
        // {"id": str, "name": str, "type": Literal["number", "deviation", "string", "url", "item_name"], setting: Optional[dict]}
        {id: "item_name", name: "Item Name", type: "string", setting: {filterable: false}},
        {id: "ducat_price", name: "Ducat Price", type: "integer"},
        {id: "item_count", name: "Item Count", type: "integer"},
        {id: "lacking_count", name: "Lacking Count", type: "integer"},
        {id: "relic_count", name: "Relic Count", type: "integer"},
        {id: "relic_types", name: "Relic Types", type: "react"},
        {id: "relic_sets", name: "Relic Sets", type: "react"},
      ],
      "items": Object.values(itemInfos).map(itemInfo => ({
        "item_name": itemInfo.itemName,
        "ducat_price": itemInfo.ducatPrice,
        "item_count": itemInfo.itemCount,
        "lacking_count": itemInfo.lackingCount,
        "relic_count": itemInfo.relicCount.totalCount,
        "relic_types": RelicTypesString(itemInfo),
        "relic_sets": RelicSetsString(itemInfo.relicSetUnames, relicSets, itemInfo.itemUname, itemCount, nameLookupMap),
      })).filter(item => item.lacking_count > 0),
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
      <p className="text-gray-400">(Take Lex Prime for example: if you have 3 Blueprints, 13 Barrels, 17 Receivers, you wanna farm Blueprints because you can make more sets of Lex Prime out of it.)</p>
      <br />
      <p>We caculate the <span className="font-bold">Lacking Count</span> of each item based on your inventory.</p>
      <p>If an item's lacking count is N, it means you can make N more sets if you get N more of that item.</p>
      <p className="text-gray-400">(In the above example, the lacking count of Blueprint is 10, because you can make 10 more Lex Prime Sets if you get 10 more Blueprints. Note that the lacking count of Barrel is 0 because you can't make any more sets even if you get more of it.)</p>
      <br />
      <p>We only show inventory where lacking count is greater than 0. Relic count is the number of relics in your inventory with that item.</p>
    </div>

    {/* we separate the loading progress and error display because if there is still data from last time, we still wanna display that */}
    {relicIsPending ? <Loading message="Loading Relic Data" /> : null}
    {!relicIsPending && relicError ? <Error message={`ERROR: ${relicError}`} /> : null}
    {relicData && itemTable ? <ItemTable itemTable={itemTable} setting={setting} /> : null}
    </div>
  </>);
}

