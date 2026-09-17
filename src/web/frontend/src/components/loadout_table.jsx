import { useState, useCallback, memo, useMemo } from "react";
import { GeneralBlockTable, makeFilterCallbackByKey, makeSortCallbackByKey } from "./general_blocktable.jsx";

function makeIcon(src, title, bgColor, iconSize=8, text=null) {
  // iconSize = 8 or 6
  return <>
    <div className="relative w-8 h-8">
      <div className={`absolute left-2 top-2 w-4 h-4 blur-sm rounded`} style={{ backgroundColor: bgColor }}/>
      <img src={src} alt={title} title={title} className={`absolute left-${Math.floor((8-iconSize) / 2)} top-${Math.floor((8-iconSize) / 2)} w-${iconSize} h-${iconSize}`} />
      {text ? <p className="absolute left-0 top-4 w-2 h-2 text-white text-xs font-bold text-center drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)]">{text}</p> : null}
    </div>
  </>
}

function _renderLoadoutBlock(loadoutInfo) {
  return <div className="flex flex-col gap-y-2">
    <p className="text-white">{loadoutInfo.name}</p>
    {loadoutInfo.loadouts.map((loadout, idx) => (<>
      <p className="text-white" key={idx}>{loadout.name}: <a href={loadout.overframe_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Overframe</a></p>
    </>))}
  </div>
}

function LoadoutBlockSide({loadoutInfo}) {
  return (<>
    <div className="px-4">
    </div>
    <div>
      {null}
    </div>
  </>);
}
function LoadoutBlockTitle({loadoutInfo}) {
  const {
    archon_shard_map: archonShardMap,
    mod_name_map: modNameMap,
    warframe_info_map: warframeInfoMap,
    ability_info_map: abilityInfoMap,
    icon_map: iconMap,
  } = loadoutInfo.loadoutData;

  const { uname, name, category, loadouts, archon_shard: archonShards } = loadoutInfo;

  return (<>
    <div className="flex flex-row items-center gap-x-4">
      <div>
        <img src={iconMap[uname]} alt={name} className="w-16" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white">
          <b className="text-yellow-400 hover:underline whitespace-nowrap">
            {name}
          </b>
        </h3>
        <div className="grid gap-x-4 grid-cols-5 w-full">
          {archonShards && archonShards.length > 0 ? archonShards.map((archonShard, idx) => {
            console.log('archon shard', archonShards, archonShard, archonShardMap[archonShard.color]);
            if (!archonShardMap[archonShard.color]) {
              // either there's a new archon shard or color is undefined
              return null;
            }
            return (<div key={idx}>
              {makeIcon(
                archonShardMap[archonShard.color].Icon,
                archonShardMap[archonShard.color].Attributes[archonShard.attribute],
                "#6E2323",
                6,
                archonShardMap[archonShard.color].AttributesAbbreviation[archonShard.attribute]
              )}
            </div>
            );
          }) : null}
        </div>
      </div>
    </div>
  </>);
}
function LoadoutBlockEntry({loadoutInfo}) {
  return <div className="flex flex-col gap-y-2">
    {loadoutInfo.loadouts.map((loadout, idx) => (<>
      <p className="text-white font-bold" key={idx}>
        {loadout.name}: <a href={loadout.overframe_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          Overframe
        </a>
      </p>
    </>))}
  </div>
}
function LoadoutBlock({loadoutInfo}) {
  return (
    <div className="flex border border-gray-600 rounded h-full my-2" >
      <div className={`p-2 bg-[#511a6d] text-white border-r border-gray-600`}>
        <LoadoutBlockSide loadoutInfo={loadoutInfo} />
      </div>
      <div className={`p-4 grow bg-[#2b2130]`}>
        <LoadoutBlockTitle loadoutInfo={loadoutInfo} />
        <LoadoutBlockEntry loadoutInfo={loadoutInfo} />
      </div>
    </div>
  );
}
function renderLoadoutBlock(loadoutInfo) {
  return <LoadoutBlock loadoutInfo={loadoutInfo} />;
}

export default function LoadoutTable({loadoutData, loadoutInfos, searchText}) {
  /*
    the loadoutInfos is defined in src/pages/inventory/loadout.jsx: parseLoadoutInfos()
  */

  console.log("LoadoutTable", loadoutData, loadoutInfos, searchText);

  if (!loadoutData || !loadoutInfos) {
    return null;
  }

  // make all of them in one array
  const loadoutInfoArray = useMemo(() => {
    const arr = [];
    for (const [category, loadoutInfo] of Object.entries(loadoutInfos)) {
      arr.push(...loadoutInfo);
    }
    return arr;
  }, [loadoutInfos]);

  const filterOptions = [
    {
      categoryId: 'category', categoryName: 'Category', choiceType: 'single', booleanType: 'true', 
      filterOptions: [
          { optionId: 'warframe', optionName: 'Warframe', filterCallback: makeFilterCallbackByKey('category', 'warframe') },
          { optionId: 'primary', optionName: 'Primary', filterCallback: makeFilterCallbackByKey('category', 'primary') },
          { optionId: 'secondary', optionName: 'Secondary', filterCallback: makeFilterCallbackByKey('category', 'secondary') },
          { optionId: 'melee', optionName: 'Melee', filterCallback: makeFilterCallbackByKey('category', 'melee') },
          { optionId: 'companions', optionName: 'Companions', filterCallback: makeFilterCallbackByKey('category', 'companions') },
          { optionId: 'archwing', optionName: 'Archwing', filterCallback: makeFilterCallbackByKey('category', 'archwing') },
          { optionId: 'necramech', optionName: 'Necramech', filterCallback: makeFilterCallbackByKey('category', 'necramech') },
          { optionId: 'exalted', optionName: 'Exalted', filterCallback: makeFilterCallbackByKey('category', 'exalted') }
      ]
    }
  ];

  const sortOptions = [
    { optionId: 'name', optionName: 'Name', sortCallback: makeSortCallbackByKey('name') },
  ];

  return (<>
    <GeneralBlockTable 
      blockInfos={loadoutInfoArray} 
      filterOptions={filterOptions} 
      sortOptions={sortOptions} 
      searchText={searchText}
      renderBlockCallback={renderLoadoutBlock}
    />
  </>);
}