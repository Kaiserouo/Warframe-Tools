import { useState, useCallback, useEffect, useMemo } from 'react';
// TODO: should support copy organizer and a static method changing it
class Organizer {
  constructor(filterOptions, sortOptions) {
    this.filterOptions = filterOptions || {};
    this.sortOptions = sortOptions || {};

    this.viableSettings = {
        'filterOptions': {},
        'sortOptions': {
            'sortOrderType': []
        }
    };
    this.setting = {
        'filterOptions': {},
        'sortOptions': {
            'sortOrder': []
        }
    }
    this.filterCallbacks = {};
    this.sortCallbacks = {};
    for (const category of filterOptions) {
        for (const option of category.filterOptions) {
            if (category.categoryId.includes('__') || option.optionId.includes('__')) {
                throw new Error(`Category ID and Option ID should not contain "__" (categoryId: ${category.categoryId}, optionId: ${option.optionId})`);
            }
            this.viableSettings.filterOptions[category.categoryId + '__' + option.optionId] = (
                category.booleanType === 'all' ? [null, true, false] : [null, true]
            );
            this.setting.filterOptions[category.categoryId + '__' + option.optionId] = null;
            this.filterCallbacks[category.categoryId + '__' + option.optionId] = option.filterCallback;
        }
    }
    for (const sortOption of sortOptions) {
        this.viableSettings.sortOptions.sortOrderType.push(sortOption.optionId);
        this.setting.sortOptions.sortOrder.push({
            type: sortOption.optionId,
            name: sortOption.optionName,
            isAsc: null
        });
        this.sortCallbacks[sortOption.optionId] = sortOption.sortCallback;
    }
  }

  copySetting(setting) {
    // make a copy of setting
    return {
      filterOptions: {...this.setting.filterOptions},
      sortOptions: {
        sortOrder: [...this.setting.sortOptions.sortOrder]
      }
    }
  }

  _filterBlockInfos(blockInfos, searchText) {
    // searchText is a string, if null, then no search filter is applied
    const searchLower = searchText ? searchText.toLowerCase() : null;
    return blockInfos.filter((blockInfo) => {
      if (searchLower) {
        if (!blockInfo.searchString.includes(searchLower)) {
          return false;
        }
      }

      for (const [filterKey, filterValue] of Object.entries(this.setting.filterOptions)) {
        if (filterValue === null)
          continue;

        let value = this.filterCallbacks[filterKey](blockInfo);

        if (value !== filterValue)
          return false;
      }
      return true;
    });
  }

  _sortBlockInfos(blockInfos) {
    const sortOrder = this.setting.sortOptions.sortOrder;

    return blockInfos.sort((a, b) => {
      for (const {type, isAsc} of sortOrder) {
        if (isAsc === null) {
            // we don't need to sort this
            continue;
        }

        const aLTb = this.sortCallbacks[type](a, b);
        const bLTa = this.sortCallbacks[type](b, a);

        if (aLTb === bLTa) {
            // they're equal, continue to the next sort condition
            continue;     
        }
        if (isAsc) return aLTb ? -1 : 1;
        else return bLTa ? -1 : 1;
      }
      return 0;
    });
  }

  organizeBlockInfo(blockInfos, searchText) {
    return this._sortBlockInfos(this._filterBlockInfos(blockInfos, searchText));
  }

  setNextFilterOption(categoryId, optionId) {
    // set the next filter option for the given categoryId and optionId
    // e.g., if viableOptions = [null, true, false], and the current option is null, then the next option will be true
    const filterKey = categoryId + '__' + optionId;
    if (!(filterKey in this.setting.filterOptions)) {
      throw new Error(`Invalid filter option: ${filterKey}`);
    }
    const curKey = this.setting.filterOptions[filterKey];
    const viableFilterOptions = this.viableSettings.filterOptions[filterKey];
    const curIdx = viableFilterOptions.indexOf(curKey);
    const nextIdx = (curIdx + 1) % viableFilterOptions.length;
    this.setting.filterOptions[filterKey] = viableFilterOptions[nextIdx];
  }

  setNextSortOption(optionId) {
    // set the next sort option for the given optionId, the next option will foller the order of `isAsc = [null, true, false]`
    for (const entry of this.setting.sortOptions.sortOrder) {
      if (entry.type === optionId) {
        if (entry.isAsc === null) {
          entry.isAsc = true;
        } else if (entry.isAsc === true) {
          entry.isAsc = false;
        } else {
          entry.isAsc = null;
        }
      }
    }
  }

  swapSortOrder(optionIdA, optionIdB) {
    const sortOrder = [...this.setting.sortOptions.sortOrder];
    const indexA = sortOrder.findIndex((entry) => entry.type === optionIdA);
    const indexB = sortOrder.findIndex((entry) => entry.type === optionIdB);

    if (indexA === -1 || indexB === -1 || indexA === indexB) {
      return;
    }

    const [moved] = sortOrder.splice(indexA, 1);
    sortOrder.splice(indexB, 0, moved);
    this.setting.sortOptions.sortOrder = sortOrder;
  }
}


function FilterOptionToggleButton({ label, state, onClick }) {
  const cnNull = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnTrue = "bg-green-700 hover:bg-green-500 text-white border-gray-300";
  const cnFalse = "bg-red-700 hover:bg-red-500 text-white border-gray-300";
  return (
    <button 
      className={`mr-2 px-2 py-1 border rounded ${state === null ? cnNull : state ? cnTrue : cnFalse}`}
      onClick={onClick}>
        {label}
    </button>
  );
}

function FilterBar({organizer, setOrganizer}) {
  if (Object.keys(organizer.filterOptions).length === 0) {
    return null;
  }

  const handleFilterChange = useCallback((categoryId, optionId) => {
    setOrganizer((prev) => {
      const newOrganizer = new Organizer(organizer.filterOptions, organizer.sortOptions);
      newOrganizer.setting = prev.copySetting();
      newOrganizer.setNextFilterOption(categoryId, optionId);
      return newOrganizer;
    })
  }, [setOrganizer]);

  return (<>
    {
      organizer.filterOptions.map((category, idx) => (
        <div key={idx} className="flex font-mono my-1">
          <p className="mr-2 py-1 text-white text-lg">{category.categoryName}: </p>
          {
            category.filterOptions.map((filterOption) => (
              <FilterOptionToggleButton
                key={category.categoryId + '__' + filterOption.optionId}
                label={filterOption.optionName}
                state={organizer.setting.filterOptions[category.categoryId + '__' + filterOption.optionId]}
                onClick={() => handleFilterChange(category.categoryId, filterOption.optionId)}
              />
            ))
          }
        </div>
      ))
    }
  </>);
}

function SortOptionToggleButton({ label, state, onClick, draggable, onDragStart, onDragOver, onDrop }) {
  // state: null, true (isAsc), false (!isAsc)
  const cnUnselected = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnSelected = "bg-gray-100 hover:bg-gray-300 text-black border-gray-300";
  return (
    <button 
      className={`mr-2 px-2 py-1 border rounded ${state === null ? cnUnselected : cnSelected}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}>
        {label}{state === null ? "" : state ? ' ▲' : ' ▼'}
    </button>
  );
}

function SortBar({organizer, setOrganizer}) {
  const [draggedKey, setDraggedKey] = useState(null);

  if (Object.keys(organizer.sortOptions).length === 0) {
    return null;
  }

  const handleSortChange = useCallback((optionId) => {
    setOrganizer((prev) => {
      const newOrganizer = new Organizer(organizer.filterOptions, organizer.sortOptions);
      newOrganizer.setting = prev.copySetting();
      newOrganizer.setNextSortOption(optionId);
      return newOrganizer;
    })
  }, [setOrganizer]);

  const handleDropSortKey = useCallback((dropKey) => {
    if (!draggedKey || draggedKey === dropKey) {
      setDraggedKey(null);
      return;
    }

    setOrganizer((prev) => {
      const newOrganizer = new Organizer(organizer.filterOptions, organizer.sortOptions);
      newOrganizer.setting = prev.copySetting();
      newOrganizer.swapSortOrder(draggedKey, dropKey);
      return newOrganizer;
    });

    setDraggedKey(null);
  }, [draggedKey, setOrganizer]);

  return (<>
    <div className="flex font-mono my-1">
      <p className="mr-2 py-1 text-white text-lg">Sort by: </p>
      {
        organizer.setting.sortOptions.sortOrder.map(({type, name, isAsc}, idx) => (
          <div key={idx}>
            <SortOptionToggleButton
              label={name}
              state={isAsc}
              onClick={() => handleSortChange(type)}
              draggable
              onDragStart={() => setDraggedKey(type)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropSortKey(type)}
            />
          </div>
        ))
      }
    </div>
  </>);
}

function OrganizeBar({organizer, setOrganizer}) {
  return (<>
    <FilterBar organizer={organizer} setOrganizer={setOrganizer} />
    <SortBar organizer={organizer} setOrganizer={setOrganizer} />
  </>);
}

// making filter callback function

export function makeFilterCallbackByKey(key, value) {
  return (info) => (info[key] === value);
}

export function makeSortCallbackByKey(key) {
  return (infoA, infoB) => (infoA[key] < infoB[key]);
}

export function GeneralBlockTable({
    blockInfos,
    searchText,
    renderBlockCallback,
    filterOptions,
    sortOptions
}) {
    /*
        - blockInfos: a list of Info. Info is a dict with self-defined keys.
        - searchText: a string, the text to search for. will be searching `Info.searchString`. 
                      if null, then no search filter is applied
        - renderBlockCallback: a function to render a block. (Info) => ReactNode
        - filterOptions: provides filtering. can be null for no filtering. the structure looks like:
            [
                {
                    categoryId: str,    // the id of category, can be any string, should be unique in the list. do not use '__' in the id
                    categoryName: str,  // the text on the left
                    choiceType: 'single' | 'multiple',  // single choice or multiple choice
                    booleanType: 'all' | 'true'   // if 'all', there will be 3 options: [not chosen, true, false], if 'true', there will be 2 options: [not chosen, true]
                    filterOptions: [
                        {   
                            optionId: str,    // the id of the option, can be any string, should be unique in the list. do not use '__' in the id
                            optionName: str,  // the text in the box
                            filterCallback: (Info) => boolean  // the function to filter the Info
                        },
                        ...
                    ]
                },
                ...  // multiple lines, all conditions are AND-ed together
            ]
        - sortOptions: provide sorting. can be null for no sorting. the structure looks like:
            [
                {
                    optionId: str,    // the id of the sorting condition, can be any string, should be unique in the list
                    optionName: str,  // the text on the left
                    sortCallback: (InfoA, InfoB) => number  // the function to sort the Info. return (InfoA < InfoB) ? True : False (i.e. std::less<Info>)
                },
                ...  // multiple sorting conditions can be applied in any order by dragging the choice blocks.
                     // the condition will be applied from left to right
            ]
    */
  const [organizer, setOrganizer] = useState(new Organizer(filterOptions, sortOptions));

  console.log('organizer', organizer);

  const organizedBlockInfos = useMemo(() => {
    return organizer.organizeBlockInfo(blockInfos, searchText);
  }, [organizer, blockInfos, searchText]);

  return (<>
    <OrganizeBar organizer={organizer} setOrganizer={setOrganizer} />

    <div className="flex flex-row">
      <div className="grid gap-x-3 grid-cols-1 md:grid-cols-4 gap-y-3 w-full">
        {organizedBlockInfos.map((blockInfo, idx) => (
          <div key={idx}>
            {renderBlockCallback(blockInfo)}
          </div>
        ))}
      </div>
    </div>
  </>);
}