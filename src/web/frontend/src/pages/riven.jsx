import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'

import SearchBar from '../components/search_bar.jsx';
import RivenTable from '../components/riven_table.jsx';
import { iconIncarnon, iconIsEquipped, iconHasDuplicate } from '../components/riven_table.jsx';
import { Loading, LoadingProgress, Error } from '../components/loading_status.jsx';
import { fetchRivenData } from '../api/fetch.jsx';
import { makeHandleSubmit } from '../api/task.jsx';
import RivenParser from '../utils/RivenParser.jsx';

function getRivenModInfo(rivenData, rivenMod, inventoryData) {
  /*
    Should contain all information that is needed when rendering RivenTable
    Note that some information would be added to rivenModInfo in getRivenModInfos
  */
  const { 
    weapon_name_map: weaponNameMap, 
    weapon_riven_disposition: weaponRivenDispositionMap, 
    riven_loctag_map: rivenLoctagMap, 
    icon_map: iconMap 
  } = rivenData;
  const upgradeFingerprint = JSON.parse(rivenMod.UpgradeFingerprint);

  const oid = rivenMod["ItemId"]["$oid"];
  const uname = upgradeFingerprint.compat;
  const weaponName = weaponNameMap[upgradeFingerprint.compat] || upgradeFingerprint.compat;
  const disposition = weaponRivenDispositionMap[upgradeFingerprint.compat] || 0;
  const itemType = rivenMod.ItemType;

  const { stats: rivenStats, name: rivenSuffix } = RivenParser.parseRiven(itemType.slice(32), upgradeFingerprint, disposition, rivenLoctagMap);
  for (const rivenStat of rivenStats) {
    rivenStat.displayText = getRivenStatText(itemType, upgradeFingerprint, rivenStat, rivenLoctagMap);
  }

  const isIncarnon = rivenData.incarnon_weapon_uname.includes(uname);

  const searchString = (
    `${weaponName} ${rivenSuffix} | ` +
    `${rivenStats.map((s) => s.displayText).join(', ')} | ` +
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
    
    oid: oid,
    upgradeFingerprint: upgradeFingerprint,
    weaponName: weaponName,
    uname: uname,
    itemType: rivenMod.ItemType,
    disposition: disposition,

    rivenStats: rivenStats,
    rivenSuffix: rivenSuffix,

    isIncarnon: isIncarnon,

    searchString: searchString,

    // the following fields will be properly set in getRivenModInfos
    isEquipped: false,
    hasDuplicate: false,
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
  const rivenUnameCountMap = {};
  for (const rivenModInfo of rivenModInfos) {
    if (!(rivenModInfo.uname in rivenUnameCountMap)) {
      rivenUnameCountMap[rivenModInfo.uname] = 0;
    }
    rivenUnameCountMap[rivenModInfo.uname]++;
  }
  for (const rivenModInfo of rivenModInfos) {
    rivenModInfo.hasDuplicate = rivenUnameCountMap[rivenModInfo.uname] > 1;
    rivenModInfo.duplicateCount = rivenUnameCountMap[rivenModInfo.uname];
  }
  
  return rivenModInfos;
}

function getRivenStatText(rivenItemType, rivenUpgradeFingerprint, rivenStat, riven_loctag_map) {
  const factionDamageTags = ["WeaponFactionDamageGrineer", "WeaponFactionDamageCorpus", "WeaponFactionDamageInfested", "WeaponMeleeFactionDamageGrineer", "WeaponMeleeFactionDamageCorpus", "WeaponMeleeFactionDamageInfested"];

  const prefix = (!factionDamageTags.includes(rivenStat.tag) && rivenStat.displayValue > 0 ? "+" : "");
  const suffix = (factionDamageTags.includes(rivenStat.tag) ? "x" : "")
  const displayValue = (factionDamageTags.includes(rivenStat.tag) ? (1 + rivenStat.displayValue).toFixed(2) : rivenStat.displayValue.toFixed(2))
  
  const valStr = `${prefix}${displayValue}${suffix}`;
  
  return (
    riven_loctag_map[rivenItemType][rivenStat.tag]
    .replace(/<.*?>/g, '') // remove icon tags, for now
    .replace('|val|', valStr)
    .replace('|STAT1|', valStr)
  );
}

export default function Riven({setting}) {
  const [searchText, setSearchText] = useState(null);

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
    <div className="flex flex-row justify-between items-center gap-x-4">
      <div>
        <div className="text-white font-sans my-2">
          <p className="text-yellow-500 font-bold">&lt; Requires inventory file: add that in the Options menu &gt;</p>
          <p>A riven viewer... hopefully a bit better than how Alecaframe did it.</p>
          <p>Provides filter for True / False condition.</p>
          <p>Provides sorting for ascending / descending. Can enable multiple sorting criteria. Drag & drop to reorder the sequence in which they are applied.</p>
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

    {rivenError ? <Error message={`ERROR: ${rivenError}`} /> : null}
    {rivenModInfos.length > 0 && (
      <RivenTable
        rivenModInfos={rivenModInfos}
        searchText={searchText}
      />
    )}
  </div>
  </>);
}
