import { useState } from 'react';
import ItemInfobox from '../components/item_infobox';

export default function Home({setting}) {
return (<>
    <div className="mx-4 my-4">
        <div className="text-2xl font-bold text-white">
            <h1>Warframe Tools</h1>
        </div>
        <div className="text-l text-gray-200 font-mono">
            <h2>Function:</h2>
            <ul className="list-disc list-inside">
                <li><span className="text-yellow-400 font-bold">Item Info</span>: Show item information and market prices on warframe.market. <b className='text-white'>Can search multiple items at once.</b></li>
                <li><span className="text-yellow-400 font-bold">Relic</span>: Gives expected plat reward for relics.</li>
                <li><span className="text-yellow-400 font-bold">Syndicate</span>: Show item information and market prices sold by the syndicate.</li>
                <li><span className="text-yellow-400 font-bold">Transient Reward</span>: Show item information and market prices sold of transient rewards.</li>
                <li><span className="text-yellow-400 font-bold">Find Best Trade</span>: For a list of items, find the best users to trade with to minimize total price deviation from oracle price. (also serves as mass query for multiple items' current market prices & best to buy item currently)</li>
            </ul>
            <br />
            <p>Item name with underline show additional information and links in the hovering info box.</p>
            <p>e.g.: <ItemInfobox setting={setting} itemName="Serration" /> <span className='text-gray-500'>(hover on the item name to see more information)</span></p>
            <br />
            <p>Note that <b className='text-white'>everything is cached, including the prices</b>. The prices will not reflect the true prices on the market after some time.</p>
            <p>Please go to <i className='text-cyan-400'>Options (upper left corner) &gt; Refresh Market Data</i> to refresh the market data from time to time.</p>
            <br />
            <p>To estimate the price / value for each item, we calculate an <b className='text-white'>oracle price</b> from trade histories on <i>warframe.market</i>.</p>
            <p>You can change how the oracle prices are calculated with <i className='text-cyan-400'>Options (upper left corner) &gt; Price Oracle</i>:</p>
            <ul className="list-disc list-inside">
                <li><span className="text-purple-400 font-bold">Default Oracle Price (48h)</span>: The default algorithm. The same as <span className='text-purple-400'>Top 30% Avg (48h)</span>.</li>
                <li><span className="text-purple-400 font-bold">Top 30% Avg (48h)</span>: We list all trade history of this item within 48 hours, take the orders with the top 30% prices, and calculate their average price. Good for when you intend to sell the item and is looking for the estimated selling price.</li>
                <li><span className="text-purple-400 font-bold">Bottom 30% Avg (48h)</span>: Same idea, but we take the bottom 30% prices. Good for when you intend to buy the item recently.</li>
                <li><span className="text-purple-400 font-bold">Current Lowest Price</span>: Use the current lowest selling price directly. Good for when you intend to buy right now, or the above oracles aren't to your taste.</li>
            </ul>
        </div>
    </div>
</>);
}
