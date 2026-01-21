
import BackspaceSvg from '../asset/backspace.svg?react';
import EnterSvg from '../asset/enter.svg?react';

export default function SearchBar({
    placeholder,
    items,
    nameKey,
    searchMode,
    setSearchText,
}) {
  // placeholder: str, placeholder text for the search input
  // items: list[dict | str], list of items for search suggestions, each item is a dict
  // nameKey: str, key in each item dict to use as the display name
  //     if items is a list of strings, set nameKey to null
  // searchMode: str, mode of search, determines whether an item would be shown, one of ['prefix', 'contains', 'each_word_starts_with']
  //   define the query string as Q, and item[nameKey] as I
  //   - prefix: Q must be I's prefix
  //   - contains: Q must be a substring of I
  //   - each_word_starts_with: split Q by spaces into words [q1, q2, ...], and I into [i1, i2, ...]
  //      then for each qj, there must exist an ik that starts with qj
  // setSearchText: function(str or null), called when the user presses Enter to initialize search

  // return (<div className="border border-gray-600">(Search Bar)</div>);
  return (
    <div className="max-w-md flex border border-gray-600 rounded">
      <input
        type="text"
        className="w-full px-4 py-2  bg-[#393E46] text-white"
        placeholder={placeholder}
        list="search-suggestions"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const value = e.target.value.trim();
            setSearchText(value.length > 0 ? value : null);
          }
        }}
      />
      <datalist id="search-suggestions">
        {items.map((item, index) => (
          <option key={index} value={nameKey === null ? item : item[nameKey]} />
        ))}
      </datalist>
      <button
        onClick={() => {
          const input = document.querySelector('input[list="search-suggestions"]');
          input.value = '';
          setSearchText(null);
        }}
        className="px-4 py-2 text-white hover:bg-gray-700"
      >
        <BackspaceSvg className="w-6 h-6" />
      </button> 
      <button
        onClick={() => {
          const input = document.querySelector('input[list="search-suggestions"]');
          setSearchText(input.value);
        }}
        className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700"
      >
        <EnterSvg className="w-6 h-6" />
      </button> 
    </div>
  );
}