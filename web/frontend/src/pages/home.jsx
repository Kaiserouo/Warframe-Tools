import { useState } from 'react';

export default function Home({setting}) {
  return (<>
    <div className="mx-4 my-4">
        {/* <div className="text-2xl font-bold text-white">
            <p>Warframe Tools</p>
        </div> */}
        <div className="text-xl text-white font-mono">
[ WARFRAME TOOL ]<br />
<br />
Function:<br />
- Item Info: Show item info on warframe.market (e.g., Oracle prices and recent trade.)<br />
- Relic Plat: Gives expected plat reward for specific relic (set).<br />
- Relic Item: Get all relics containing item and give expected plat for each relic.<br />
- Relic Plat Multiple: Can input multiple items.<br />
- Syndicate: Show item market price sold by syndicate.<br />
- Transient Reward: Get available transient mission rewards and show market price.<br />
- Find Best Trade: For a list of items, find the best users to trade with to minimize total price deviation from oracle price.<br />
    (also serves as mass query for multiple items' current market prices & best to buy item currently)<br />
<br />
Note:<br />
- Press TAB to use autocomplete menu, or just type away.<br />
- Use arrow key and press ENTER to choose an item in the menu.<br />
- If not specified, please choose a specific choice (case-sensitive).<br />
- Some functions explicitly shows that it matches ALL items shown in the menu. <br />
    In that case you don\'t need to choose a specific item. Most of these are case-insensitive, too.<br />
        </div><br />
    </div>
  </>);
}
