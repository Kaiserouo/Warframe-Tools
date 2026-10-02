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

function InventoryItemBlockSide({itemInfo}) {
  return (<>
    <div className="px-4">
    </div>
    <div>
      {null}
    </div>
  </>);
}

function InventoryItemBlockTitle({itemInfo}) {
  const { uname, name, invQueryData, count, isUniqueItem, isBlueprint } = itemInfo;
  const { icon_map: iconMap } = invQueryData;
  return (<>
    <div >
      <div className="relative">
        {isUniqueItem ? null : (
          <h3 className="text-xs text-white absolute right-0 top-0 w-full flex justify-end drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
              {new Intl.NumberFormat("en-US", {style: "decimal"}).format(count)}
          </h3>
        )}
      <div className="relative w-32 h-32">
        {isBlueprint ? <img src="https://wiki.warframe.com/images/MarketBoxBP.png" className="absolute w-full h-full" alt="" /> : null}
        <img src={iconMap[uname]} alt={name} className="w-32 h-32" loading="lazy" />
      </div>
      <div className="relative">
        <h3 className={`text-xs text-white absolute left-0 top-0 w-full h-full flex items-center justify-center text-center whitespace-normal ${name == null ? 'break-all' : 'break-words'} drop-shadow-[0_0_1.5px_rgba(0,0,0,1)]`}>
            {name == null ? uname : name}
        </h3>
      </div>
      </div>
    </div>
  </>);
}
function InventoryItemBlockEntry({itemInfo}) {
  return <div className="flex flex-col gap-y-2 my-2">
    
  </div>;
}
function InventoryItemBlock({itemInfo}) {
  return (
    <div className="flex border border-gray-600 rounded h-40 w-40 my-2" >
      <div className={`p-2 bg-[#1a3a6d] text-white border-r border-gray-600`}>
        {/* <LoadoutBlockSide itemInfo={itemInfo} /> */}
      </div>
      <div className={`p-4 grow bg-[#212630]`}>
        <InventoryItemBlockTitle itemInfo={itemInfo} />
        <InventoryItemBlockEntry itemInfo={itemInfo} />
      </div>
    </div>
  );
}
function renderInventoryItemBlock(itemInfo) {
  return <InventoryItemBlock itemInfo={itemInfo} />;
}

export default function InventoryItemTable({invQueryData, inventoryItemInfos, searchText}) {
  console.log("InventoryItemTable", invQueryData, inventoryItemInfos, searchText);

  if (!invQueryData || !inventoryItemInfos) {
    return null;
  }

  // make all of them in one array
  const inventoryItemInfoArray = useMemo(() => {
    const arr = [];
    for (const [category, inventoryItemInfo] of Object.entries(inventoryItemInfos)) {
      arr.push(...inventoryItemInfo);
    }
    return arr;
  }, [inventoryItemInfos]);

  const filterOptions = null;

  const sortOptions = [
    { optionId: 'name', optionName: 'Name', sortCallback: makeSortCallbackByKey('name') },
  ];

  return (<>
    <GeneralBlockTable 
      blockInfos={inventoryItemInfoArray} 
      filterOptions={filterOptions} 
      sortOptions={sortOptions} 
      searchText={searchText}
      renderBlockCallback={renderInventoryItemBlock}
      flexWrap={true}
    />
  </>);
}