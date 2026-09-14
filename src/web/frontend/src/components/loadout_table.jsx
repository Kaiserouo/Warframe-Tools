import { useState, useCallback, memo, useMemo } from "react";



export default function LoadoutTable({loadoutData, loadoutInfo, searchText}) {
  console.log("LoadoutTable", loadoutData, loadoutInfo, searchText);
  return (<>
    <div className="flex flex-row">
      <div className="grid gap-x-3 grid-cols-1 md:grid-cols-4">
        {loadoutInfo && Object.entries(loadoutInfo).map(([category, item_ls]) => (
          <div key={category} className="flex flex-col gap-y-3">
              <h2 className="text-lg font-bold text-white">{category}</h2>
              {item_ls.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-y-2">
                  <p className="text-white">{item.name}</p>
                  {item.loadouts.map((loadout, idx2) => (
                    <a href={loadout.overframe_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        Overframe
                    </a>
                  ))}
                </div>
              ))}
            </div>
        ))}
      </div>
    </div>
  </>);
}