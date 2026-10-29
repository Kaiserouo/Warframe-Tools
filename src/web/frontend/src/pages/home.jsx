import { useState } from 'react';
import ItemInfobox from '../components/item_infobox';

export default function Home({setting}) {
  return (<>
    <div className="mx-4 my-4">
      <div className="text-2xl font-bold text-white">
        <h1>Warframe Tools</h1>
      </div>
      <div className="text-l text-gray-200">
        <h2 className='text-2xl font-bold text-white'>Function</h2>
        <ul className="list-disc list-inside">
          <li><span className="text-yellow-400 font-bold">Item Info</span>: Show item market information on warframe.market. Can search multiple items at once.</li>
          <li><span className="text-yellow-400 font-bold">Relic</span>: Calculate expected plat reward for relics.</li>
          <li><span className="text-yellow-400 font-bold">Syndicate</span>: Show syndicate item information and market prices.</li>
          <li><span className="text-yellow-400 font-bold">Transient Reward</span>: Show transient reward item information and market prices.</li>
          <li><span className="text-yellow-400 font-bold">Find Best Trade</span>: For a list of items you want to buy, find the best buyers to buy from.</li>
          <li><span className="text-yellow-400 font-bold">Inventory</span>: Inventory related functionalities.</li>
          <ul className="list-disc list-inside ml-4">
            <li><span className="text-yellow-400 font-bold">Riven</span>: Riven viewer with advanced sorting and filtering.</li>
            <li><span className="text-yellow-400 font-bold">Missing Item Checklist</span>: Check missing items from all sorts of farms.</li>
            <li><span className="text-yellow-400 font-bold">Loadout</span>: Loadout viewer for all items in inventory.</li>
            <li><span className="text-yellow-400 font-bold">Relic</span>: Find items in relic to make sets.</li>
            <li><span className="text-yellow-400 font-bold">JSON Viewer</span>: View raw inventory JSON file.</li>
          </ul>
        </ul>
        <br />
        <p>Item name with underline show additional information and links in the hovering info box.</p>
        <p>e.g.: <ItemInfobox setting={setting} itemName="Serration" />, <ItemInfobox setting={setting} itemName="Kestrel Prime Blade" /> <span className='text-gray-500'>(hover on the item name to see more information)</span></p>
        <br />
        <p>Note that <b className='text-white'>everything is cached, including the prices</b>. The prices will not reflect the true prices on the market after some time.</p>
        <p>Please go to <i className='text-cyan-400'>Options (upper left corner) &gt; Refresh Market Data</i> to refresh the market data from time to time.</p>
        <br />
        <h2 className='text-2xl font-bold text-white'>Price Origin</h2>
        <p>To estimate the price / value for each item from the statistics, we need to calculate an <b className='text-white'>oracle price</b> to represent each item's value.</p>
        <p>The origin of these price related data is called <b className='text-white'>price origin</b>.</p>
        <p>With these data, we can give them to an <b className='text-white'>oracle function</b>, which calculates oracle prime from the statistics from the price origin.</p>
        <p>(e.g., with "Current Lowest Price", the oracle price is just the lowest price with Online In-Game status listed on the market)</p>
        <p>You can change how the oracle prices are calculated with <i className='text-cyan-400'>Options (upper left corner) &gt; Price Origin / Oracle Type</i>:</p>
        <br />
        <ul className="list-disc list-inside">
          <li><span className="text-purple-400 font-bold">Warframe Market</span>: Warframe market data, freshly fetched. This is guarenteed to reflect real time market data if you refresh frequent enough, but is very slow to fetch. We calculate the price based on its 48 hours / 90 days statistics.</li>
          <li><span className="text-purple-400 font-bold">Ducantor</span>: With prime items, we use the ducantor page on the warframe market to override the price. This speeds up loading time for prime items. The rest uses the Warframe Market price origin.</li>
          <li><span className="text-purple-400 font-bold">Alecaframe</span>: Alecaframe data, fetched from Alecaframe servers. This is the fastest of all, but their price information may be stale and the oracle price calculation algorithm is a blackbox (on their server).</li>
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
