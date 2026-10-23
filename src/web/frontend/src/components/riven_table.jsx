import { useState, useCallback, memo, useMemo } from "react";
import ItemInfobox from './item_infobox';
import RivenParser from '../utils/RivenParser.jsx';

import { PhotoshopPicker } from 'react-color';
import RivenInfobox from "./riven_infobox.jsx";
import RivenVariantsInfobox from "./riven_variants_infobox.jsx";

import { GeneralBlockTable, makeFilterCallbackByKey, makeSortCallbackByKey, makeSortCallbackByKeyFunction } from "./general_blocktable.jsx";


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
const iconVariants = makeIcon("https://wiki.warframe.com/images/HouseLavan%28xWhite%29.png", "Has variant riven for this weapon", "#6E2323", 6)
const makeIconVariants = (count) => makeIcon("https://wiki.warframe.com/images/HouseLavan%28xWhite%29.png", "", "#6E2323", 6, count.toString());
const iconSpliced = makeIcon("https://wiki.warframe.com/images/HouseVidar%28xWhite%29.png", "This Riven is spliced", "#6fb4b8", 6)
export { iconIncarnon, iconIsEquipped, iconHasDuplicate, iconVariants, iconSpliced };


function RivenSide({rivenModInfo}) {
  const { isIncarnon, isEquipped, hasDuplicate, familyUnames, isSpliced } = rivenModInfo;
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
      {isSpliced && iconSpliced}
      {isEquipped && iconIsEquipped}
      {hasDuplicate && makeIconHasDuplicateCount(rivenModInfo.duplicateCount)}
      {familyUnames.length > 1 && <RivenVariantsInfobox 
        rivenModInfo={rivenModInfo} 
        header={makeIconVariants(familyUnames.length)} />}
    </div>
  </>);
}
function RivenTitle({rivenModInfo}) {
  const { iconMap, weaponNameMap, upgradeFingerprint, uname, weaponName, disposition, rivenStats, rivenSuffix, retiredDisposition } = rivenModInfo;

  const dispoText = retiredDisposition ? `${retiredDisposition.toFixed(2)}x` : `(${disposition.toFixed(2)}x)`;

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
        <p className="text-white font-bold text-nowrap">lv{upgradeFingerprint.lvl || 0} | {dispoText}</p>
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
          return <p key={idx}>
            {/* use span to avoid the background spanning the entire block, making the gradient not really visible*/}
            <span className={s.isSpliced ? "bg-linear-to-r from-cyan-400 to-green-200 bg-clip-text text-transparent" : s.isBuff ? "text-green-400" : "text-red-400"}>
              {s.displayText}
            </span>
          </p>;
        })
      }
    </div>
  </>);
}
function RivenMod({rivenModInfo}) {
  const { isSpliced } = rivenModInfo;
  const colorCode = isSpliced ? "spliced" : "normal";
  
  const sideBgColor = {
    "normal": "#511a6d",
    "spliced": "#236b6e",
  }[colorCode];
  const mainBgColor = {
    "normal": "#2b2130",
    "spliced": "#212f30",
  }[colorCode];

  return (
    <div className="flex border border-gray-600 rounded my-2 h-full" >
      <div className={`p-2 text-white border-r border-gray-600`} style={{ backgroundColor: sideBgColor }}>
        <RivenSide rivenModInfo={rivenModInfo} />
      </div>
      <div className={`p-4 grow`} style={{ backgroundColor: mainBgColor }}>
        <RivenTitle rivenModInfo={rivenModInfo} />
        <RivenEntry rivenModInfo={rivenModInfo} />
      </div>
    </div>
  );
}

const MemoizedRivenMod = memo(RivenMod);

export default function RivenTable({rivenModInfos, searchText}) {

  const filterOptions = [
    {
      categoryId: 'filter', categoryName: 'Filter', choiceType: 'multiple', booleanType: 'all', 
      filterOptions: [
          { optionId: 'isIncarnon', optionName: "Is Incarnon", filterCallback: makeFilterCallbackByKey('isIncarnon')},
          { optionId: 'isSpliced', optionName: "Is Spliced", filterCallback: makeFilterCallbackByKey('isSpliced')},
          { optionId: 'isEquipped', optionName: "Is Equipped", filterCallback: makeFilterCallbackByKey('isEquipped')},
          { optionId: 'hasDuplicate', optionName: "Has Duplicate", filterCallback: makeFilterCallbackByKey('hasDuplicate')},
          { optionId: 'isUpgraded', optionName: "Is Upgraded", filterCallback: (rivenModInfo) => (rivenModInfo.upgradeFingerprint.lvl > 0)},
          { optionId: 'anyDupIsEquipped', optionName: "Any Duplicate Is Equipped", filterCallback: makeFilterCallbackByKey('anyDupIsEquipped')},
          { optionId: 'anyDupIsUpgraded', optionName: "Any Duplicate Is Upgraded", filterCallback: makeFilterCallbackByKey('anyDupIsUpgraded')},
      ]
    },
    {
      categoryId: 'category', categoryName: 'Filter (Category)', choiceType: 'single', booleanType: 'true', 
      filterOptions: [
          { optionId: 'isPrimary', optionName: "Primary", filterCallback: (rivenModInfo) => (rivenModInfo.type === 'LongGuns')},
          { optionId: 'isSecondary', optionName: "Secondary", filterCallback: (rivenModInfo) => (rivenModInfo.type === 'Pistols')},
          { optionId: 'isMelee', optionName: "Melee", filterCallback: (rivenModInfo) => (rivenModInfo.type === 'Melee')},
          { optionId: 'isArchgun', optionName: "Archgun", filterCallback: (rivenModInfo) => (rivenModInfo.type === 'SpaceGuns')},
          { optionId: 'isCompanion', optionName: "Companion", filterCallback: (rivenModInfo) => (rivenModInfo.type === 'SentinelWeapons')},
      ]
    }
  ];

  const sortOptions = [
    { optionId: 'weaponName', optionName: "Weapon Name", sortCallback: makeSortCallbackByKey('weaponName')},
    { optionId: 'disposition', optionName: "Retired Disposition", sortCallback: makeSortCallbackByKeyFunction((rivenModInfo) => rivenModInfo.retiredDisposition || rivenModInfo.disposition)},
    { optionId: 'isIncarnon', optionName: "Is Incarnon", sortCallback: makeSortCallbackByKey('isIncarnon')},
    { optionId: 'isSpliced', optionName: "Is Spliced", sortCallback: makeSortCallbackByKey('isSpliced')},
    { optionId: 'isEquipped', optionName: "Is Equipped", sortCallback: makeSortCallbackByKey('isEquipped')},
    { optionId: 'hasDuplicate', optionName: "Has Duplicate", sortCallback: makeSortCallbackByKey('hasDuplicate')},
    { optionId: 'duplicateCount', optionName: "Duplicate Count", sortCallback: makeSortCallbackByKey('duplicateCount')},
  ];

  return (
    <GeneralBlockTable
      blockInfos={rivenModInfos}
      searchText={searchText}
      renderBlockCallback={(rivenModInfo) => <MemoizedRivenMod rivenModInfo={rivenModInfo} />}
      filterOptions={filterOptions}
      sortOptions={sortOptions}
      gridCols={4}
      flexWrap={false}
    />
  )
}