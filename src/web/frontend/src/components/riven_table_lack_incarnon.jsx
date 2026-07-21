import { useState, useCallback, memo, useMemo } from "react";
import ItemInfobox from './item_infobox';
import RivenParser from '../utils/RivenParser.jsx';

import { PhotoshopPicker } from 'react-color';

function WeaponTitle({weaponName, iconUrl, disposition}) {
  return (<>
    <div className="flex justify-between items-center gap-x-4">
      {/* <h3 className="text-lg font-bold text-white"><b className="text-yellow-400">{weaponName}</b> {rivenSuffix}</h3> */}
      <div className="flex flex-row items-center gap-x-4">
        <div>
          <img src={iconUrl} alt={weaponName} className="w-16 h-16" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white"><b className="text-yellow-400 hover:underline"><a href={`https://wiki.warframe.com/w/${weaponName.replace(/\s/g, '_')}`} target="_blank" rel="noopener noreferrer">{weaponName}</a></b></h3>
        </div>
      </div>
      <div className="flex flex-row items-center">
        <p className="text-white font-bold text-nowrap">{disposition.toFixed(2)}x</p>
      </div>
    </div>
  </>);
}

function WeaponBlock({weaponName, iconUrl, disposition, count}) {
  return (
    <div className={`flex border border-gray-600 rounded my-2 ${count > 0 ? 'opacity-50' : ''}`} >
      <div className={`p-2 bg-[#3A3575] text-white border-r border-gray-600`}>
      </div>
      <div className={`p-4 grow bg-[#0F1330]`}>
        <WeaponTitle weaponName={weaponName} iconUrl={iconUrl} disposition={disposition} />
        <p className="text-white text-sm">Riven Count: {count}</p>
      </div>
    </div>
  );
}

function getIncarnonRivenCount(rivenData, rivenModInfos) {
  const { incarnon_weapon_uname: incarnonWeaponUname } = rivenData;
  
  const rivenCount = Object.fromEntries(incarnonWeaponUname.map((uname) => [uname, 0]));
  for (const rivenModInfo of rivenModInfos) {
    if (rivenModInfo.isIncarnon) {
      rivenCount[rivenModInfo.uname]++;
    }
  }
  
  return rivenCount;
}

export default function RivenTableLackIncarnon({rivenData, rivenModInfos}) {
  const { 
    weapon_name_map: WeaponNameMap, 
    icon_map: iconMap, 
    weapon_riven_disposition: WeaponRivenDisposition,
    incarnon_weapon_uname: incarnonWeaponUname,
   } = rivenData;
  const incarnonRivenCount = useMemo(
    () => getIncarnonRivenCount(rivenData, rivenModInfos),
    [rivenData, rivenModInfos]
  );

  const sortedWeaponUname = useMemo(
    () => incarnonWeaponUname.sort((a, b) => {
      const countA = incarnonRivenCount[a], countB = incarnonRivenCount[b];
      if (countA !== countB) return countA - countB;
      const dispoA = WeaponRivenDisposition[a], dispoB = WeaponRivenDisposition[b];
      if (dispoA !== dispoB) return dispoB - dispoA;
      const nameA = WeaponNameMap[a], nameB = WeaponNameMap[b];
      if (nameA !== nameB) return nameA.localeCompare(nameB);

    }),
    [incarnonWeaponUname, incarnonRivenCount, WeaponNameMap]
  );
  
  return (<>
    <div className="flex flex-row">
      <div className="grid gap-x-3 grid-cols-4">
        {sortedWeaponUname.map((weaponUname) => {
          const weaponName = WeaponNameMap[weaponUname];
          const iconUrl = iconMap[weaponUname];
          const disposition = WeaponRivenDisposition[weaponUname];
          return <WeaponBlock key={weaponUname} weaponName={weaponName} iconUrl={iconUrl} disposition={disposition} count={incarnonRivenCount[weaponUname]} />
        })}
      </div>
    </div>
  </>);
}