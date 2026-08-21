import { useState } from 'react';
import ItemInfobox from './item_infobox';

function TableHeader({header, sortBy, sortAsc, setSortBy, setSortAsc, filterBy, setFilterBy}) {
  // header: dict[str, str]
  function onClickHeader() {
    if (filterBy.header?.id === header.id) {
      setFilterBy({ header: null, value: '' });
    }
    if (sortBy?.id === header.id) {
      if (sortAsc === false) {
        // back to default
        setSortBy(null); setSortAsc(true);
        return;
      } else {
        setSortAsc(false);
      }
    } else {
      setSortBy(header);
      setSortAsc(true);
    }
  }

  const isFilterColume = filterBy.header?.id === header.id;
  const isSortedColume = sortBy?.id === header.id;

  return (
    <th className={`border border-gray-600 px-4 py-2 ${isFilterColume ? "bg-[#824545]" : "bg-[#456882]"}`}>
      <button onClick={onClickHeader} className="w-full text-left hover:bg-gray-700 px-2 py-1 rounded">
    {header.name} {isFilterColume ? `(${filterBy.value})` : ''}{isSortedColume ? (sortAsc ? '▲' : '▼') : ' '}
      </button>
    </th>
  );
}
  
function TableHeaderRow({header, sortBy, sortAsc, setSortBy, setSortAsc, filterBy, setFilterBy}) {
  // header: list[dict[str, str]], item_table["headers"]
  return (
    <tr>
      {header.map((h, idx) => (
        <TableHeader key={idx} header={h} sortBy={sortBy} sortAsc={sortAsc} setSortBy={setSortBy} setSortAsc={setSortAsc} filterBy={filterBy} setFilterBy={setFilterBy} />
      ))}
    </tr>
  );
}

function TableItemCell({header, value, setting, sortBy, setSortBy, filterBy, setFilterBy}) {
  // header: dict[str, str], one header in item_table["headers"]
  // value: Any, corresponding value in item
  let innerElement = null;
  
  if (value === null) {
    innerElement = (<p className="italic text-gray-500">(N/A)</p>);
  } else {
    switch (header.type) {
      case 'integer':
        innerElement = (<p className="text-right">{value}</p>);
        break;
      case 'float':
        innerElement = (<p className="text-right">{value.toFixed(2)}</p>);
        break;
      case 'deviation':
        if (value > 0) 
          innerElement = (<p className="text-green-400 text-right">+{value.toFixed(2)}%</p>);
        else if (value < 0)
          innerElement = (<p className="text-red-400 text-right">{value.toFixed(2)}%</p>);
        else
          innerElement = (<p className="text-right">{value.toFixed(2)}%</p>);
        break;
      case 'string':
        innerElement = (
          <p className="text-right hover:bg-gray-600 rounded" onClick={() => {
              if (filterBy.header?.id === header.id && filterBy.value === value.toString()) {
                setFilterBy({ header: null, value: '' });
              } else {
                setFilterBy({ header: header, value: value.toString() })
                setSortBy(null); setSortAsc(true);
              }
            }}>
            {value.toString()}
          </p>
        );
        break;
      case 'item_name':
        innerElement = (<span className="text-left"><ItemInfobox itemName={value} setting={setting} /></span>);
        break;
      case 'url':
        innerElement = (
            <a href={value} className="text-blue-400 hover:underline text-right" target="_blank" rel="noopener noreferrer">
              Link
            </a>
        );
        break;
      default:
        innerElement = (<p>{value.toString()}</p>);
    }
  }

  return (
    <td className="border border-gray-600 px-4 py-2">
      {innerElement}
    </td>
  );
}

function TableItemRow({headers, item, setting, sortBy, setSortBy, filterBy, setFilterBy}) {
  // headers: list[dict[str, str]], item_table["headers"]
  // item: list[Any], one item in item_table["items"]
  return (
    <tr>
      {headers.map((h, idx) => (
        <TableItemCell key={idx} header={h} value={item[h.id]} setting={setting} sortBy={sortBy} setSortBy={setSortBy} filterBy={filterBy} setFilterBy={setFilterBy} />
      ))}
    </tr>
  );
}

export default function ItemTable({itemTable, setting}) {
  // item_table: {"headers": list[dict[str, str]], "items": list[dict[str, Any]]}
  //     - each header looks like: {"id": str, "name": str, "type": Literal["number", "deviation", "string", "url", "item_name"]}
  //     - each item is a dict, for each header's id, there should be a corresponding field in item

  // sorting, default (null, true) for no sorting (use the order from item_table)
  const [sortBy, setSortBy] = useState(null);    // should be a header (i.e., dict[str, str])
  const [sortAsc, setSortAsc] = useState(true);  // whether to sort ascending
  const [filterBy, setFilterBy] = useState({
    header: null,  // header to filter by
    value: '',  // filter value
  });

  if (itemTable === null || itemTable.items.length === 0) {
    return null;
  }

  let sortedItems = itemTable.items.slice();

  if (sortBy !== null) {
    sortedItems.sort((a, b) => {
      let valA = a[sortBy.id];
      let valB = b[sortBy.id];

      // handle null values
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      // handle number type items
      switch (sortBy.type) {
        case 'integer':
        case 'float':
        case 'deviation':
          return sortAsc ? (valA - valB) : (valB - valA);
        case 'string':
        case 'item_name':
          return sortAsc ? valA.toString().localeCompare(valB.toString()) : valB.toString().localeCompare(valA.toString());
        default:
          return 0;
      }
    });
  }

  if (filterBy.header !== null) {
    console.log('filtering by', filterBy.header.name, 'with value', filterBy.value);
    sortedItems = sortedItems.filter(item => {
      const val = item[filterBy.header.id];
      return val !== null && val.toString() === filterBy.value;
    });
  }

  return (<>
    <table className="table-auto border-collapse border border-gray-600 text-l text-white font-mono">
      <thead>
        <TableHeaderRow header={itemTable.headers} sortBy={sortBy} sortAsc={sortAsc} setSortBy={setSortBy} setSortAsc={setSortAsc} filterBy={filterBy} setFilterBy={setFilterBy} />
      </thead>
      <tbody>
        {sortedItems.map((item, idx) => (
          <TableItemRow key={idx} headers={itemTable.headers} item={item} setting={setting} sortBy={sortBy} setSortBy={setSortBy} filterBy={filterBy} setFilterBy={setFilterBy} />
        ))}
      </tbody>
    </table>
  </>);
}