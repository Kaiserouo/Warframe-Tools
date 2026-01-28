import { useState, useCallback, memo, useMemo,useRef } from "react";
import ItemInfobox from './item_infobox.jsx';

function makeTradeText(user, tradeOption) {
  /**
   * Sample:
   * /w -CNT-NekoCharm Hi! I want to buy: "Catalyzing Shields (rank 1)" for 18 platinum. (warframe.market)
   * /w oKaziii Hi! I want to buy: "Vauban Prime Blueprint" for 27 platinum. (warframe.market)
   */
  function _makeItemText(itemName, itemInfo) {
    /**
     * itemName: string
     * itemInfo: { price: number, quantity: number, rank: number | null  }
     */
    const fullItemName = `${itemName}${itemInfo.rank !== null ? ` (rank ${itemInfo.rank})` : ""}`;
    if (itemInfo.quantity == 1) {
      return `"${fullItemName}" for ${itemInfo.price} platinum`;
    } else {
      return `"${fullItemName}" x ${itemInfo.quantity} for ${itemInfo.price}x${itemInfo.quantity} = ${itemInfo.price * itemInfo.quantity} platinum`;
    }
  }
  const itemTexts = Object.keys(tradeOption.items).map((itemName) => {
    return _makeItemText(itemName, tradeOption.items[itemName]);
  });
  const totalText = Object.keys(tradeOption.items).length > 1 ? `, with a total of ${tradeOption.total_price} platinum` : "";

  const tradeText = `/w ${user.user_in_game_name} Hi! I want to buy: ${itemTexts.join(", ")}${totalText}. (warframe.market)`;
  return tradeText;
}

function VarText({ v }) {
  const textColor = v > 0 ? "text-red-400" : v == 0 ? "text-gray-400" : "text-green-400";
  const sign = v > 0 ? "+" : v == 0 ? "±" : "-";
  const vStr = Math.abs(v).toFixed(2);
  
  return (<>
    <span className={`${textColor}`}>({sign}{vStr})</span>
  </>);
}

function BestTradeTableHeader() {
  return (
    <tr>
      <th className="border border-gray-600 px-4 py-2 bg-[#456882] w-1/6">User In-Game Name</th>
      <th className="border border-gray-600 px-4 py-2 bg-[#456882] w-1/6">Total Price</th>
      <th className="border border-gray-600 px-4 py-2 bg-[#456882]">Items</th>
      <th className="border border-gray-600 px-4 py-2 bg-[#456882] w-1/6"></th>
    </tr>
  );
}

function BestTradeTableOptionRow({ user, tradeOption, priceOracle, setting, setSelectedItems }) {
  const [showCopyCommand, setShowCopyCommand] = useState(false);
  const inputRef = useRef(null);
  const removedRef = useRef(null);

  // technically a hack? this works, but idk why tbh
  const handleCopyClick = () => {
    setShowCopyCommand(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  };

  const handleRemoveItem = () => {
    setSelectedItems((prevSelectedItems) => {
      const newSelectedItems = {...prevSelectedItems};
      for (const itemName of Object.keys(tradeOption.items)) {
        if (itemName in newSelectedItems) {
          newSelectedItems[itemName] -= tradeOption.items[itemName].quantity;
          if (newSelectedItems[itemName] <= 0) {
            delete newSelectedItems[itemName];
          }
        }
      }
      return newSelectedItems;
    });

    removedRef.current.classList.remove('hidden');
    setTimeout(() => {
      removedRef.current.classList.add('hidden');
    }, 2000);
  }

  const rankText = (item_name) => (tradeOption.items[item_name].rank !== null ? (<span className="text-gray-400"> (rank {tradeOption.items[item_name].rank})</span>) : null);

  return (
    <tr>
      {
        !showCopyCommand ? (<>
          <td className="border border-gray-600 px-4 py-2">
            <a className="font-bold underline underline-offset-2" href={user.url} target="_blank" rel="noopener noreferrer">{user.user_in_game_name}</a>
          </td>
          <td className="border border-gray-600 px-4 py-2">{tradeOption.total_price}p <VarText v={tradeOption.total_variation} /></td>
          <td className="border border-gray-600 px-4 py-2">
          {Object.keys(tradeOption.items).map((item_name, index) => (
            <div key={index}>
            <ItemInfobox setting={setting} itemName={item_name} />{rankText(item_name)}: {tradeOption.items[item_name].price}p <VarText v={tradeOption.items[item_name].price - priceOracle[item_name]} /> x {tradeOption.items[item_name].quantity}
            </div>
            ))}
          </td>
        </>) : null
      }
      {
        showCopyCommand ? (<>
          <td colSpan="3" className="border border-gray-600 px-4 py-2">
            <div className="flex">
              <p>{Object.keys(tradeOption.items).map((item_name, index) => (<br key={index} />))}</p>
              <input ref={inputRef} readOnly className="border rounded border-black px-1 bg-gray-900 w-full font-sans" type="text" value={makeTradeText(user, tradeOption)} />
            </div>
          </td>
        </>) : null
      }

      <td>
        {
          showCopyCommand ? 
          <button className="w-20 px-2 py-1 bg-red-900 hover:bg-red-700 text-white rounded border border-red-300" onClick={() => setShowCopyCommand(false)}>
            Close
          </button> :
          <button className="w-20 px-2 py-1 bg-blue-900 hover:bg-blue-700 text-white rounded border border-blue-300" onClick={handleCopyClick}>
            Copy
          </button>
        }

        <div className='relative inline-block'>
          <button className="w-30 px-2 py-1 bg-red-900 hover:bg-red-700 text-white rounded border border-red-300" onClick={handleRemoveItem}>Remove Item</button>
          <div ref={removedRef} className="hidden absolute inset-0 bottom-full -translate-y-4 flex items-center justify-center">
            <div className="bg-black/70 text-white font-sans px-3 py-1 rounded">
              Removed!
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function OptionToggleButton({ label, isSelected, onClick }) {
  const cnUnselected = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnSelected = "bg-gray-100 hover:bg-gray-300 text-black border-gray-300";
  return (
    <button 
      className={`mr-2 px-2 py-1 border rounded ${isSelected ? cnSelected : cnUnselected}`}
      onClick={onClick}>
        {label}
    </button>
  );
}

function FilterOptionSelection({ filterOption, setFilterOption }) {
  /**
   * supports:
   * {
   *    moreThanOneItem: bool,
   *    onlyNegativeVariation: bool,
   * }
   */
  return (<>
    <div className="flex font-mono my-1">
      <p className="mr-2 py-1 text-white text-lg">Filter: </p>

      <OptionToggleButton
        label="Only item count > 1"
        isSelected={filterOption.moreThanOneItem}
        onClick={() => setFilterOption((prev) => ({ ...prev, moreThanOneItem: !prev.moreThanOneItem }))}
      />

      <OptionToggleButton
        label="Only negative variation"
        isSelected={filterOption.onlyNegativeVariation}
        onClick={() => setFilterOption((prev) => ({ ...prev, onlyNegativeVariation: !prev.onlyNegativeVariation }))}
      />
    </div>
  </>);
}

function filterTradeOptions(tradeOptions, filterOption) {
  /**
   * supports:
   * {
   *    moreThanOneItem: bool,
   *    onlyNegativeVariation: bool,
   * }
   */
  return tradeOptions.filter((tradeOption) => {
    if (filterOption.moreThanOneItem && Object.keys(tradeOption.items).length <= 1) {
      return false;
    }
    if (filterOption.onlyNegativeVariation && tradeOption.total_variation >= 0) {
      return false;
    }
    return true;
  });
}

function SortOptionSelection({ sortOption, setSortOption, isAsc, setIsAsc }) {
  /**
   * sortOption supports:
   * - total_price, total_variation, item_count
   */
  const cnUnselected = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnSelected = "bg-gray-100 hover:bg-gray-300 text-black border-gray-300";

  const selectedHandleClick = (option) => {
    if (sortOption === option) {
      if (isAsc) {
        setIsAsc(false);
      }
      else if (!isAsc) {
        setSortOption(null);
      }
    } else {
      setSortOption(option);
      setIsAsc(true);
    }
  };

  return (<>
    <div className="flex font-mono my-1">
      <p className="mr-2 py-1 text-white text-lg">Sort by: </p>

      <OptionToggleButton
        label={`Total Price${sortOption === 'total_price' ? (isAsc ? ' ▲' : ' ▼') : ""}`}
        isSelected={sortOption === 'total_price'}
        onClick={() => selectedHandleClick('total_price')}
      />
      <OptionToggleButton
        label={`Total Variation${sortOption === 'total_variation' ? (isAsc ? ' ▲' : ' ▼') : ""}`}
        isSelected={sortOption === 'total_variation'}
        onClick={() => selectedHandleClick('total_variation')}
      />
      <OptionToggleButton
        label={`Item Count${sortOption === 'item_count' ? (isAsc ? ' ▲' : ' ▼') : ""}`}
        isSelected={sortOption === 'item_count'}
        onClick={() => selectedHandleClick('item_count')}
      />
    </div>
  </>);
}

function sortTradeOptions(tradeOptions, sortOption, isAsc) {
  /**
   * sortOption supports:
   * - total_price, total_variation, item_count
   */
  if (sortOption === null) {
    return tradeOptions;
  }

  const m = isAsc ? 1 : -1;
  const sortFn = {
    'total_price': (a, b) => m * (a.total_price - b.total_price),
    'total_variation': (a, b) => m * (a.total_variation - b.total_variation),
    'item_count': (a, b) => m * (Object.keys(a.items).length - Object.keys(b.items).length),
  }
  return tradeOptions.sort(sortFn[sortOption] || (() => 0));
}

export default function UserBestTradeTable({ userMap, tradeOptions, priceOracle, setting, setSelectedItems }) {
  /*
      orderData: {item_name: list[Order]}, Order is wfm.Orders.Order turned into json object
      priceOracle: {item_name: int}
  */
  const [sortOption, setSortOption] = useState('total_variation');
  const [isAsc, setIsAsc] = useState(true);
  const [filterOption, setFilterOption] = useState({
    moreThanOneItem: false,
    onlyNegativeVariation: false,
  });

  if (userMap === null || tradeOptions === null || priceOracle === null || 
      userMap === undefined || tradeOptions === undefined || priceOracle === undefined) {
    return null;
  }

  const sortedTradeOptions = sortTradeOptions(filterTradeOptions([...tradeOptions], filterOption), sortOption, isAsc);

  return (<>
    <div className="py-1">
      <FilterOptionSelection filterOption={filterOption} setFilterOption={setFilterOption} />
      <SortOptionSelection sortOption={sortOption} setSortOption={setSortOption} isAsc={isAsc} setIsAsc={setIsAsc} />
      <table className="table-fixed border-collapse border border-gray-600 text-l text-white font-mono w-full">
        <thead>
          <BestTradeTableHeader />
        </thead>
        <tbody>
          {
            sortedTradeOptions.map((tradeOption, index) => (
              <BestTradeTableOptionRow 
                key={index} 
                user={userMap[tradeOption.user_id]} 
                tradeOption={tradeOption} 
                priceOracle={priceOracle} 
                setting={setting} 
                setSelectedItems={setSelectedItems} />
            ))
          }
        </tbody>
      </table>
    </div>
  </>);
}