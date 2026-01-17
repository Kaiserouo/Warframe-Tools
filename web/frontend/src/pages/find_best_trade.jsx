// TODO: item search bar & fetch from API

import { useState } from 'react';

import SearchBar from '../components/search_bar.jsx';
import ItemTable from '../components/item_table.jsx';

export default function ItemInfo({setting}) {
  let sample = {'headers': [{'name': 'Name', 'type': 'item_name'}, {'name': 'Type', 'type': 'string'}, {'name': 'Plat\n(48hr)', 'type': 'float'}, {'name': 'RMP/21\n(Arcane)', 'type': 'float'}, {'name': 'R.Max Plat\n(48hr)', 'type': 'float'}, {'name': 'P*21\n(Arcane)', 'type': 'float'}, {'name': 'Volume\n(48hr)', 'type': 'integer'}, {'name': 'WFM URL', 'type': 'url'}], 'items': [['Contagious Bond', 'Mod', 14.541666666666666, null, null, null, 201, 'https://warframe.market/items/contagious_bond'], ['Vicious Bond', 'Mod', 14.866666666666667, null, null, null, 53, 'https://warframe.market/items/vicious_bond'], ['Tenacious Bond', 'Mod', 15.277777777777779, null, null, null, 153, 'https://warframe.market/items/tenacious_bond'], ["Dreamer's Bond", 'Mod', 10, null, null, null, 9, 'https://warframe.market/items/dreamers_bond'], ['Momentous Bond', 'Mod', 15.829787234042554, null, null, null, 158, 'https://warframe.market/items/momentous_bond']]}

  const [searchText, setSearchText] = useState(null);

  // if (searchText !== null) {
  //   // fetch from the API
  // }
  let itemTable = sample;

  return (<>
    <div className="mx-4 my-4">
        <div className="text-2xl font-bold text-white my-2">
            <p>Item Info</p>
        </div>
        <SearchBar setSearchText={setSearchText} />
        <ItemTable itemTable={itemTable} />
    </div>
  </>);
}

