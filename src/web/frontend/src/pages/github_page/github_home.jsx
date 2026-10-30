
import Home from '../home.jsx';
import ItemInfobox from '../../components/item_infobox';

export default function GithubHome({ setting }) {
    return (<>
        <div className="mx-4 my-4 border-2 border-gray-600 rounded-lg p-4 bg-gray-800 text-white">
            <div className="text-2xl font-bold text-white">
                <h1>Github Page Version</h1>
            </div>
            <div className="text-l text-gray-200">
                <p>This is a simplified version of Warframe Tools.</p>
                <p>Only inventory related functions are available in this version. Market related functions are not available on the github page due to the lack of API server.</p>
                <p>The data used for inventory analysis (e.g., new weapons, riven dispositions values, etc) is stored on Github repository statically, and thus may be stale. </p>
                <br />
                <p>Please <a 
                href="https://github.com/Kaiserouo/Warframe-Tools/blob/main/src/web/README.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold underline decoration-dashed underline-offset-2 hover:text-blue-400">build the project manually</a> if you want to access all functionalities.</p>
                <br />
                <p className="text-sm text-gray-400">(The data cache is fetched at: {new Date(__BUILD_DATE__).toLocaleString()})</p>
            </div>
        </div>
        
        
        <div className="mx-4 my-4">
            <div className="text-2xl font-bold text-white">
            <h1>Warframe Tools (Github Version)</h1>
            </div>
            <div className="text-l text-gray-200">
            <h2 className='text-2xl font-bold text-white'>Function</h2>
            <ul className="list-disc list-inside">
                <li><span className="text-yellow-400 font-bold">Inventory</span>: Inventory related functionalities.</li>
                <ul className="list-disc list-inside ml-4">
                <li><span className="text-yellow-400 font-bold">Riven</span>: Riven viewer with advanced sorting and filtering.</li>
                <li><span className="text-yellow-400 font-bold">Missing Item Checklist</span>: Check missing items from all sorts of farms.</li>
                <li><span className="text-yellow-400 font-bold">Loadout</span>: Loadout viewer for all items in inventory.</li>
                <li><span className="text-yellow-400 font-bold">Relic</span>: Find items in relic to make sets.</li>
                <li><span className="text-yellow-400 font-bold">JSON Viewer</span>: View raw inventory JSON file.</li>
                <li><span className="text-yellow-400 font-bold">Items</span>: Inventory Viewer.</li>
                </ul>
            </ul>
            <br />
            
            <h2 className='text-2xl font-bold text-white'>Inventory</h2>
            <p>With the inventory file, we can do more analysis like how e.g., Alecaframe does its functionalities.</p>
            <p>For currently available methods (August 2026), we can only get this file on PC (Windows / Linux).</p>
            <p>You can import the file in <i className='text-cyan-400'>Options (upper left corner) &gt; Inventory File</i>.</p>
            <p>This file will only stay on your browser and will not be uploaded to the server.</p>
            <br />
            <ul className="list-disc list-inside">
                <li>If you use AlecaFrame: Use <code>%localappdata%/AlecaFrame/lastData.dat</code>.</li>
                <li>If you don't: Use <a href="https://github.com/Sainan/warframe-api-helper/releases/latest" target="_blank" rel="noopener noreferrer" className='underline text-blue-400 font-bold'>warframe-api-helper</a> while game is on and logged in.</li>
            </ul>
            </div>
        </div>
    </>);
}