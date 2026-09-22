import { useState, useCallback, useEffect, useMemo } from 'react';
import JsonView from 'react18-json-view';
import 'react18-json-view/src/style.css';
import 'react18-json-view/src/dark.css';
import CopySvg from 'react18-json-view/src/svgs/copy.svg?react';

export default function JsonViewer({setting}) {

  return (<>
  <div className="mx-4 my-4">
    <div className="text-2xl font-bold text-white my-2">
      <p>Inventory JSON Viewer</p>
    </div>
    <div className="text-white font-sans my-2">
      <p className="text-yellow-500 font-bold">&lt; Requires inventory file: add that in the Options menu &gt;</p>
      <p>The raw inventory file, for people curious to see what's in there.</p>
      <p>You can use the clipboard button (<CopySvg className="inline-block" />) to copy the JSON to your clipboard.</p>
      <p>For the unique names (<pre className="inline-block">"/Lotus/..."</pre>), you can use <a href="https://browse.wf/" target="_blank" rel="noopener noreferrer" className='underline text-blue-400 font-bold'>browse.wf</a> to find more information.</p>
      <p>If you wanna see my take on the meaning of entries, ref. <a href="https://github.com/Kaiserouo/Warframe-Tools/blob/main/src/data/inventory/inv_keys.md" target="_blank" rel="noopener noreferrer" className='underline text-blue-400 font-bold'>inv_keys_en.md</a></p>
    </div>
    <div className="bg-[#1e1e1e] p-4 rounded-md">
      <JsonView 
        src={setting.inventory?.data} 
        enableClipboard={true}
        displaySize={true}
        collapsed={1}
        collapseObjectsAfterLength={Infinity}
        theme="vscode"
        dark={true}
      />
    </div>
  </div>
  </>);
}
