import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../../components/search_bar.jsx';
import RivenTable from '../../components/riven_table.jsx';
import RivenTableLackIncarnon from '../../components/riven_table_lack_incarnon.jsx';
import { iconIncarnon, iconIsEquipped, iconHasDuplicate } from '../../components/riven_table.jsx';
import { Loading, LoadingProgress, Error } from '../../components/loading_status.jsx';
import { fetchRivenData } from '../../api/fetch.jsx';
import { makeHandleSubmit } from '../../api/task.jsx';
import RivenParser from '../../utils/RivenParser.jsx';

function getRivenModInfo(rivenData, rivenMod, inventoryData) {
  /*
    Should contain all information that is needed when rendering RivenTable
    Note that some information would be added to rivenModInfo in getRivenModInfos
  */
  const { 
    weapon_name_map: weaponNameMap, 
    weapon_riven_disposition: weaponRivenDispositionMap, 
    riven_loctag_map: rivenLoctagMap, 
    icon_map: iconMap,
    weapon_uname_family_map: weaponUnameFamilyMap,
    weapon_family_unames_map: weaponFamilyUnamesMap,
  } = rivenData;
  const upgradeFingerprint = JSON.parse(rivenMod.UpgradeFingerprint);

  const oid = rivenMod["ItemId"]["$oid"];
  const uname = upgradeFingerprint.compat;
  const weaponName = weaponNameMap[upgradeFingerprint.compat] || upgradeFingerprint.compat;
  const disposition = weaponRivenDispositionMap[upgradeFingerprint.compat] || 0;
  const itemType = rivenMod.ItemType;
  const family = weaponUnameFamilyMap[uname] || null;
  const familyUnames = weaponFamilyUnamesMap[family] || [];

  const { stats: rivenStats, name: rivenSuffix } = RivenParser.parseRiven(itemType.slice(32), upgradeFingerprint, disposition, rivenLoctagMap);
  for (const rivenStat of rivenStats) {
    rivenStat.displayText = getRivenStatText(itemType, upgradeFingerprint, rivenStat, rivenLoctagMap);
  }

  const isIncarnon = rivenData.incarnon_weapon_uname.includes(uname);

  const searchString = (
    `${weaponName} ${rivenSuffix} | ` +
    `${rivenStats.map((s) => s.displayText).join(', ')} | ` +
    `${familyUnames.map((uname) => weaponNameMap[uname] || uname).join(', ')} | ` +
    `lv${upgradeFingerprint.lvl || 0} | ${disposition.toFixed(2)}x | ` + 
    (isIncarnon ? "isIncarnon | " : "")
  ).toLowerCase();

  return {
    rivenData: rivenData,
    rivenMod: rivenMod,

    weaponNameMap: weaponNameMap,
    weaponRivenDispositionMap: weaponRivenDispositionMap,
    rivenLoctagMap: rivenLoctagMap,
    iconMap: iconMap,
    weaponUnameFamilyMap: weaponUnameFamilyMap,
    
    oid: oid,
    upgradeFingerprint: upgradeFingerprint,
    weaponName: weaponName,
    uname: uname,
    itemType: rivenMod.ItemType,
    disposition: disposition,
    family: family,
    familyUnames: familyUnames,
    
    rivenStats: rivenStats,
    rivenSuffix: rivenSuffix,

    isIncarnon: isIncarnon,

    searchString: searchString,

    // the following fields will be properly set in getRivenModInfos
    isEquipped: false,
    hasDuplicate: false,
    duplicateCount: 1,
    anyDupIsEquipped: false,
    anyDupIsUpgraded: false,
  }
}

function getRivenModInfos(rivenData, rivenMods, inventoryData) {
  /*
    Get all rivenModInfo for all riven mods
  */

  const rivenModInfos = rivenMods.map((rivenMod) => getRivenModInfo(rivenData, rivenMod, inventoryData));
  
  // equipped
  const rivenModOidSet = new Set(rivenModInfos.map((rivenModInfo) => rivenModInfo.oid));
  const equippedModsOidSet = new Set();
  for (const type of ["LongGuns", "Melee", "Pistols", "SpaceGuns", "SpaceMelee", "SentinelWeapons"]) {
    for (const item of inventoryData[type] ?? []){
      for (const config of item.Configs ?? []) {
        for (const modOid of config.Upgrades ?? []) {
          if (rivenModOidSet.has(modOid))
            equippedModsOidSet.add(modOid);
        }
      }
    }
  }
  console.log(rivenModOidSet, equippedModsOidSet);
  for (const rivenModInfo of rivenModInfos) {
    rivenModInfo.isEquipped = equippedModsOidSet.has(rivenModInfo.oid);
  }
  
  // duplicate
  const rivenUnameMap = {};  // uname -> list of rivenModInfo
  for (const rivenModInfo of rivenModInfos) {
    if (!rivenUnameMap[rivenModInfo.uname]) {
      rivenUnameMap[rivenModInfo.uname] = [];
    }
    rivenUnameMap[rivenModInfo.uname].push(rivenModInfo);
  }
  const rivenUnameAnyDupIsEquippedMap = {};  // uname -> any duplicate is equipped
  const rivenUnameAnyDupUpgradedMap = {};  // uname -> any duplicate is upgraded
  for (const [uname, rivenModInfoList] of Object.entries(rivenUnameMap)) {
    rivenUnameAnyDupIsEquippedMap[uname] = rivenModInfoList.some((rivenModInfo) => rivenModInfo.isEquipped);
    rivenUnameAnyDupUpgradedMap[uname] = rivenModInfoList.some((rivenModInfo) => rivenModInfo.upgradeFingerprint.lvl > 0);
  }

  for (const rivenModInfo of rivenModInfos) {
    rivenModInfo.hasDuplicate = rivenUnameMap[rivenModInfo.uname].length > 1;
    rivenModInfo.duplicateCount = rivenUnameMap[rivenModInfo.uname].length;
    rivenModInfo.anyDupIsEquipped = rivenUnameAnyDupIsEquippedMap[rivenModInfo.uname];
    rivenModInfo.anyDupIsUpgraded = rivenUnameAnyDupUpgradedMap[rivenModInfo.uname];
  }
  
  return rivenModInfos;
}

function getRivenStatText(rivenItemType, rivenUpgradeFingerprint, rivenStat, riven_loctag_map) {
  const factionDamageTags = ["WeaponFactionDamageGrineer", "WeaponFactionDamageCorpus", "WeaponFactionDamageInfested", "WeaponMeleeFactionDamageGrineer", "WeaponMeleeFactionDamageCorpus", "WeaponMeleeFactionDamageInfested"];

  const prefix = (!factionDamageTags.includes(rivenStat.tag) && rivenStat.displayValue > 0 ? "+" : "");
  const suffix = (factionDamageTags.includes(rivenStat.tag) ? "x" : "")
  const displayValue = (factionDamageTags.includes(rivenStat.tag) ? (1 + rivenStat.displayValue).toFixed(2) : rivenStat.displayValue.toFixed(1))
  
  const valStr = `${prefix}${displayValue}${suffix}`;
  
  return (
    riven_loctag_map[rivenItemType][rivenStat.tag]
    .replace(/<.*?>/g, '') // remove icon tags, for now
    .replace('|val|', valStr)
    .replace('|STAT1|', valStr)
  );
}

function RivenIncarnonPage({rivenData, rivenModInfos, searchText}) {
  return <RivenIncarnonList
    rivenModInfos={rivenModInfos}
    searchText={searchText}
  />
}

function TableTypeChoice({choices, tableType, setTableType, setSearchText}) {
  // make buttons for each choice
  function onClick(choice) {
    setSearchText(null);  // reset search text
    setTableType(choice);
  }

  const cnUnselected = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnSelected = "bg-gray-100 hover:bg-gray-300 text-black border-gray-300";

  return (
    <div className="flex gap-2 my-2">
      {choices.map(choice => (
        <button
          key={choice}
          onClick={() => onClick(choice)}
          className={`px-4 py-2 rounded border ${
            tableType === choice
              ? cnSelected
              : cnUnselected
          }`}
        >
          {choice.charAt(0).toUpperCase() + choice.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default function Riven({setting}) {
  const [searchText, setSearchText] = useState(null);
  const [tableType, setTableType] = useState('riven');  // riven, incarnon

  const { isPending: rivenIsPending, error: rivenError, data: rivenData } = useQuery({
    queryKey: ['riven_data'],
    queryFn: () => fetchRivenData(),
    staleTime: 60 * 60 * 1000, // 1 hour, it's most likely not needing a refresh until Options > Refresh
  })

  const rivenMods = setting.inventory ? (
    setting.inventory.data.Upgrades.filter((mod) => mod.ItemType.includes('Random') && mod.UpgradeFingerprint.includes('compat'))
  ) : [];

  const rivenModInfos = useMemo(
    () => {
      if (!rivenData || !rivenMods || !setting.inventory?.data) 
        return [];
      return getRivenModInfos(rivenData, rivenMods, setting.inventory?.data);
    },
    [rivenData, rivenMods, setting.inventory?.data]
  );


  return (<>
  <div className="mx-4 my-4">
    <div className="text-2xl font-bold text-white my-2">
      <p>Riven</p>
    </div>
    <TableTypeChoice
      choices={['riven', 'incarnon']}
      tableType={tableType}
      setTableType={setTableType}
      setSearchText={setSearchText}
    />
    <div className="flex flex-row justify-between items-center gap-x-4">
      <div>
        <div className="text-white font-sans my-2">
          <p className="text-yellow-500 font-bold">&lt; Requires inventory file: add that in the Options menu &gt;</p>
          <p>A riven viewer... hopefully a bit better than how Alecaframe did it.</p>
          <p>Provides filter for True / False condition. Provides sorting for ascending / descending.</p>
          <p>Can enable multiple sorting criteria. Drag & drop to reorder the sequence in which they are applied.</p>
          <p>The search bar can search any keyword you want, include names / tags / etc.</p>
        </div>


        <SearchBar 
          placeholder="Search..."
          items={[]}
          nameKey={null}
          searchMode="contains"
          setSearchText={setSearchText}
          searchOnChange={true} />
        {searchText && <div className="text-white my-2">Search Text: {searchText}</div>}
      </div>
      <div className="text-white">
        <span className="flex flex-row items-center">{iconIncarnon}: Is incarnon</span>
        <span className="flex flex-row items-center">{iconIsEquipped}: Is currently equipped</span>
        <span className="flex flex-row items-center">{iconHasDuplicate}: Has duplicate riven for this weapon</span>
      </div>
    </div>
    
    {rivenIsPending ? <Loading message="Loading riven data..." /> : null}
    {rivenError ? <Error message={`ERROR: ${rivenError}`} /> : null}

    {setting.inventory !== null && rivenData && tableType === 'riven' && (
      <RivenTable
        rivenData={rivenData}
        rivenModInfos={rivenModInfos}
        searchText={searchText}
      />
    )}
    {setting.inventory !== null && rivenData && tableType === 'incarnon' && (
      <RivenTableLackIncarnon
        rivenData={rivenData}
        rivenModInfos={rivenModInfos}
      />
    )}
    
    {setting.inventory === null ? <div className="text-white font-mono my-2 font-extrabold">
      [ No inventory file loaded. Please load your inventory file in the Options &gt; Inventory File.]
    </div> : null}
  </div>
  </>);
}