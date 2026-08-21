import { useState, useCallback, memo, useMemo } from "react";
import ItemInfobox from './item_infobox';
import RivenParser from '../utils/RivenParser.jsx';

import { PhotoshopPicker } from 'react-color';
import RivenInfobox from "./riven_infobox.jsx";
import RivenVariantsInfobox from "./riven_variants_infobox.jsx";


function makeIcon(src, title, bgColor, iconSize=8, text=null) {
  // iconSize = 8 or 6
  return <>
    <div className="relative w-8 h-8">
      <div className={`absolute left-2 top-2 w-4 h-4 blur-sm rounded`} style={{ backgroundColor: bgColor }}/>
      <img src={src} alt={title} title={title} className={`absolute left-${Math.floor((8-iconSize) / 2)} top-${Math.floor((8-iconSize) / 2)} w-${iconSize} h-${iconSize}`} />
      {text ? <p className="absolute left-6 top-4 w-2 h-2 text-white text-xs font-bold text-center drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)]">{text}</p> : null}
    </div>
  </>
}
const iconIncarnon = makeIcon("https://wiki.warframe.com/images/LessRecoil%28xWhite%29.png", "Incarnon", "#0862BB", 8);
const iconIsEquipped = makeIcon("https://wiki.warframe.com/images/IconIOSEmotes%28xWhite%29.png", "Is currently equipped", "#2E7821", 6)
const iconHasDuplicate = makeIcon("https://wiki.warframe.com/images/IconModDuplicates%28xWhite%29.png", "Has duplicate riven for this weapon", "#6E2323", 6)
const makeIconHasDuplicateCount = (count) => makeIcon("https://wiki.warframe.com/images/IconModDuplicates%28xWhite%29.png", `Has ${count} duplicates for this weapon`, "#6E2323", 6, count.toString());
const makeIconVariants = (count) => makeIcon("https://wiki.warframe.com/images/HouseLavan%28xWhite%29.png", "", "#6E2323", 6, count.toString());
export { iconIncarnon, iconIsEquipped, iconHasDuplicate };


function RivenSide({rivenModInfo}) {
  const { isIncarnon, isEquipped, hasDuplicate, familyUnames } = rivenModInfo;
  const [color, setColor] = useState('#FFFFFF');
  const [showTestColor, setShowTestColor] = useState(false);
  
  const handleChange = useCallback((color) => { setColor(color.hex); }, []);

  return (<>
    {showTestColor ? <>
      <PhotoshopPicker color={color} onChange={ handleChange } />
      <div className="relative w-8 h-8">
        <div className="absolute left-1 top-1 w-6 h-6 blur-sm rounded" style={{ backgroundColor: color }}/>
        <img src="https://wiki.warframe.com/images/IconIOSEmotes%28xWhite%29.png" alt="Incarnon" className="absolute left-1 top-1 w-6 h-6" />
      </div>
    </>
    : null}
    <div className="px-4">
    </div>
    <div>
      {isIncarnon && iconIncarnon}
      {isEquipped && iconIsEquipped}
      {hasDuplicate && makeIconHasDuplicateCount(rivenModInfo.duplicateCount)}
      {familyUnames.length > 1 && <RivenVariantsInfobox 
        rivenModInfo={rivenModInfo} 
        header={makeIconVariants(familyUnames.length)} />}
    </div>
  </>);
}
function RivenTitle({rivenModInfo}) {
  const { iconMap, weaponNameMap, upgradeFingerprint, uname, weaponName, disposition, rivenStats, rivenSuffix } = rivenModInfo;

  return (<>
    <div className="flex justify-between items-center gap-x-4">
      {/* <h3 className="text-lg font-bold text-white"><b className="text-yellow-400">{weaponName}</b> {rivenSuffix}</h3> */}
      <div className="flex flex-row items-center gap-x-4">
        <div>
          <img src={iconMap[uname]} alt={weaponName} className="w-16 h-16" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">
            <b className="text-yellow-400 hover:underline">
              {/* <a href={`https://wiki.warframe.com/w/${weaponName.replace(/\s/g, '_')}`} target="_blank" rel="noopener noreferrer">
                {weaponName}
              </a> */}
              <RivenInfobox weaponName={weaponName} />
            </b>
          </h3>
          <h3 className="font-bold text-white">{rivenSuffix}</h3>
        </div>
      </div>
      <div className="flex flex-row items-center">
        <p className="text-white font-bold text-nowrap">lv{upgradeFingerprint.lvl || 0} | {disposition.toFixed(2)}x</p>
      </div>
    </div>
  </>);
}
function RivenEntry({rivenModInfo}) {
  const { 
    weaponNameMap, weaponRivenDispositionMap, rivenLoctagMap, iconMap,
    upgradeFingerprint, uname, weaponName, disposition, rivenStats, rivenSuffix, itemType
  } = rivenModInfo;

  return  (<>
    <div className="mt-2">
      {
        rivenStats.map((s, idx) => {
          return <p key={idx} className={s.isBuff ? "text-green-400" : "text-red-400"}>{s.displayText}</p>;
        })
      }
    </div>
  </>);
}
function RivenMod({rivenModInfo}) {
  return (
    <div className="flex border border-gray-600 rounded my-2" >
      <div className={`p-2 bg-[#511a6d] text-white border-r border-gray-600`}>
        <RivenSide rivenModInfo={rivenModInfo} />
      </div>
      <div className={`p-4 grow bg-[#2b2130]`}>
        <RivenTitle rivenModInfo={rivenModInfo} />
        <RivenEntry rivenModInfo={rivenModInfo} />
      </div>
    </div>
  );
}

const MemoizedRivenMod = memo(RivenMod);

class RivenOrganizer {
  viableSetting = {
    filterOptions: {
      isIncarnon: [null, true, false],
      isEquipped: [null, true, false],
      hasDuplicate: [null, true, false],
      isUpgraded: [null, true, false],
      anyDupIsEquipped: [null, true, false],
      anyDupIsUpgraded: [null, true, false],
    },
    sortOptions: {
      sortOrderType: [
        'weaponName', 'disposition', 'isIncarnon', 'isEquipped', 'hasDuplicate', 'duplicateCount'
      ],
    }
  };

  constructor() {
    this.setting = {
      filterOptions: {
        isIncarnon: null,
        isEquipped: null,
        hasDuplicate: null,
        isUpgraded: null,
        anyDupIsEquipped: null,
        anyDupIsUpgraded: null,
      },
      sortOptions: {
        sortOrder: [
          {type: 'weaponName', isAsc: null},
          {type: 'disposition', isAsc: null},
          {type: 'isIncarnon', isAsc: null},
          {type: 'isEquipped', isAsc: null},
          {type: 'hasDuplicate', isAsc: null},
          {type: 'duplicateCount', isAsc: null},
          // ...(can have many)
        ]
      }
    }
  }

  copySetting() {
    return {
      filterOptions: {...this.setting.filterOptions},
      sortOptions: {
        sortOrder: [...this.setting.sortOptions.sortOrder]
      }
    }
  }

  _filterRiven(rivenModInfos, searchText) {
    const searchLower = searchText ? searchText.toLowerCase() : null;
    return rivenModInfos.filter((rivenModInfo) => {
      if (searchLower) {
        if (!rivenModInfo.searchString.includes(searchLower)) {
          return false;
        }
      }

      for (const [filterKey, filterValue] of Object.entries(this.setting.filterOptions)) {
        if (filterValue === null)
          continue;

        let value = null;
        if (filterKey === 'isUpgraded') {
          value = rivenModInfo.upgradeFingerprint.lvl > 0;
        } else {
          value = rivenModInfo[filterKey];
        }

        if (value !== filterValue)
          return false;
      }
      return true;
    });
  }

  _sortRiven(rivenModInfos) {
    const sortOrder = this.setting.sortOptions.sortOrder;

    return rivenModInfos.sort((a, b) => {
      for (const {type, isAsc} of sortOrder) {
        if (a[type] === b[type])
          continue;
        if (isAsc === null)
          continue;

        if (isAsc)
          return a[type] < b[type] ? -1 : 1;
        else
          return a[type] > b[type] ? -1 : 1;
      }
      return 0;
    });
  }

  organizeRiven(rivenModInfos, searchText) {
    return this._sortRiven(this._filterRiven(rivenModInfos, searchText));
  }
}

function FilterOptionToggleButton({ label, state, onClick }) {
  const cnNull = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnTrue = "bg-green-700 hover:bg-green-500 text-white border-gray-300";
  const cnFalse = "bg-red-700 hover:bg-red-500 text-white border-gray-300";
  return (
    <button 
      className={`mr-2 px-2 py-1 border rounded ${state === null ? cnNull : state ? cnTrue : cnFalse}`}
      onClick={onClick}>
        {label}
    </button>
  );
}

function RivenFilterBar({rivenOrganizer, setRivenOrganizer}) {
  const keyLabels = {
    isIncarnon: "Is Incarnon",
    isEquipped: "Is Equipped",
    hasDuplicate: "Has Duplicate",
    isUpgraded: "Is Upgraded",
    anyDupIsEquipped: "Any Duplicate Is Equipped",
    anyDupIsUpgraded: "Any Duplicate Is Upgraded",
  };

  const handleFilterChange = useCallback((filterKey) => {
    setRivenOrganizer((prev) => {
      const newRivenOrganizer = new RivenOrganizer();
      newRivenOrganizer.setting = prev.copySetting();
      const curKey = newRivenOrganizer.setting.filterOptions[filterKey];
      const viableFilterOptions = newRivenOrganizer.viableSetting.filterOptions[filterKey];
      const nextKey = viableFilterOptions[
        (viableFilterOptions.indexOf(curKey) + 1) % viableFilterOptions.length
      ];
      newRivenOrganizer.setting.filterOptions[filterKey] = nextKey;
      return newRivenOrganizer;
    })
  }, [setRivenOrganizer]);

  return (<>
      <div className="flex font-mono my-1">
      <p className="mr-2 py-1 text-white text-lg">Filter: </p>
      {
        Object.keys(keyLabels).map((key) => (
          <FilterOptionToggleButton
            key={key}
            label={keyLabels[key]}
            state={rivenOrganizer.setting.filterOptions[key]}
            onClick={() => handleFilterChange(key)}
          />
        ))
      }
    </div>
  </>);
}
function SortOptionToggleButton({ label, state, onClick, draggable, onDragStart, onDragOver, onDrop }) {
  // state: null, true (isAsc), false (!isAsc)
  const cnUnselected = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnSelected = "bg-gray-100 hover:bg-gray-300 text-black border-gray-300";
  return (
    <button 
      className={`mr-2 px-2 py-1 border rounded ${state === null ? cnUnselected : cnSelected}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}>
        {label}{state === null ? "" : state ? ' ▲' : ' ▼'}
    </button>
  );
}

function RivenSortBar({rivenOrganizer, setRivenOrganizer}) {
  const keyLabels = {
    weaponName: "Weapon Name",
    disposition: "Disposition",
    isIncarnon: "Is Incarnon",
    isEquipped: "Is Equipped",
    hasDuplicate: "Has Duplicate",
    duplicateCount: "Duplicate Count"
  };

  const [draggedKey, setDraggedKey] = useState(null);

  const handleSortChange = useCallback((filterKey) => {
    setRivenOrganizer((prev) => {
      const newRivenOrganizer = new RivenOrganizer();
      newRivenOrganizer.setting = prev.copySetting();
      for (const entry of newRivenOrganizer.setting.sortOptions.sortOrder) {
        if (entry.type === filterKey) {
          if (entry.isAsc === null) {
            entry.isAsc = true;
          } else if (entry.isAsc === true) {
            entry.isAsc = false;
          } else {
            entry.isAsc = null;
          }
        }
      }
      return newRivenOrganizer;
    })
  }, [setRivenOrganizer]);

  const handleDropSortKey = useCallback((dropKey) => {
    if (!draggedKey || draggedKey === dropKey) {
      setDraggedKey(null);
      return;
    }

    setRivenOrganizer((prev) => {
      const newRivenOrganizer = new RivenOrganizer();
      newRivenOrganizer.setting = prev.copySetting();
      const sortOrder = [...newRivenOrganizer.setting.sortOptions.sortOrder];
      const draggedIdx = sortOrder.findIndex((entry) => entry.type === draggedKey);
      const dropIdx = sortOrder.findIndex((entry) => entry.type === dropKey);

      if (draggedIdx === -1 || dropIdx === -1) {
        return newRivenOrganizer;
      }

      const [moved] = sortOrder.splice(draggedIdx, 1);
      sortOrder.splice(dropIdx, 0, moved);
      newRivenOrganizer.setting.sortOptions.sortOrder = sortOrder;
      return newRivenOrganizer;
    });

    setDraggedKey(null);
  }, [draggedKey, setRivenOrganizer]);

  console.log("rivenOrganizer.setting.sortOptions.sortOrder", rivenOrganizer.setting.sortOptions.sortOrder);

  return (<>
    <div className="flex font-mono my-1">
      <p className="mr-2 py-1 text-white text-lg">Sort by: </p>
      {
        rivenOrganizer.setting.sortOptions.sortOrder.map(({type, isAsc}) => (
          <SortOptionToggleButton
            key={type}
            label={keyLabels[type]}
            state={isAsc}
            onClick={() => handleSortChange(type)}
            draggable
            onDragStart={() => setDraggedKey(type)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDropSortKey(type)}
          />
        ))
      }
    </div>
  </>);
}

function RivenOrganizeBar({rivenOrganizer, setRivenOrganizer}) {
  return (<>
    <RivenFilterBar rivenOrganizer={rivenOrganizer} setRivenOrganizer={setRivenOrganizer} />
    <RivenSortBar rivenOrganizer={rivenOrganizer} setRivenOrganizer={setRivenOrganizer} />
  </>);
}

export default function RivenTable({rivenModInfos, searchText}) {
  const [rivenOrganizer, setRivenOrganizer] = useState(new RivenOrganizer());

  const organizedRivenModInfos = useMemo(() => {
    return rivenOrganizer.organizeRiven(rivenModInfos, searchText);
  }, [rivenOrganizer, rivenModInfos, searchText]);

  return (<>
    <RivenOrganizeBar rivenOrganizer={rivenOrganizer} setRivenOrganizer={setRivenOrganizer} />

    <div className="flex flex-row">
      <div className="grid gap-x-3 grid-cols-1 md:grid-cols-4">
        {organizedRivenModInfos.map((rivenModInfo, idx) => (
          <MemoizedRivenMod key={idx} rivenModInfo={rivenModInfo} />
        ))}
      </div>
    </div>
  </>);
}