# To-do

- Add section "Preset"
    - e.g., 
        - "All Bonds" should be able to search all bond mods, etc.
- Add logging for backend
    - more specifically, every single call to the 
- Add filtering for Type in ItemTable
    - when clicking "Type", it sorts ascending or descending
    - when clicking something in "Type" (e.g., "Mod"), it will hide everything else, change the "Type" text to "Type (Mod)"
        - it still can be sorted by other attributes (e.g., Volume) in this state
        - when clicking "Type (Mod)", it will go back to normal (more specifically, set to sort by Type ascending etc.)
    - more technically, for every filterable_string type it should do that