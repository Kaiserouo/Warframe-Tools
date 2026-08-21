import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'
import Riven from './riven.jsx';
import Baro from './baro.jsx';

let pageMap = {
  'riven': {
    'name': 'Riven',
    'factory': (setting) => (<Riven setting={setting} />)
  },
  'baro': {
    'name': 'Baro',
    'factory': (setting) => (<Baro setting={setting} />)
  }
};

export default function Inventory({setting}) {
  const [currentPage, setCurrentPage] = useState('riven');

  return (<>
    <div className="mx-4 my-4">
      <PageChoice 
        choices={Object.entries(pageMap).slice().map(([key, value]) => key)} 
        texts={Object.entries(pageMap).slice().reduce((acc, [key, value]) => {
          acc[key] = value.name;
          return acc;
        }, {})}
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
      />
    </div>
    {pageMap[currentPage] ? pageMap[currentPage].factory(setting) : (<p>Page not found</p>)}
  </>);
}

function PageChoice({choices, texts, currentPage, setCurrentPage}) {
  // make buttons for each choice
  function onClick(choice) {
    setCurrentPage(choice);
  }

  const cnUnselected = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnSelected = "bg-gray-100 hover:bg-gray-300 text-black border-gray-300";

  return (
    <div className="flex gap-2 my-2">
      {choices.map(choice => (
        <button
          key={choice}
          onClick={() => onClick(choice)}
          className={`px-4 py-2 rounded border ${
            currentPage === choice
              ? cnSelected
              : cnUnselected
          }`}
        >
          {texts[choice] || choice}
        </button>
      ))}
    </div>
  );
}