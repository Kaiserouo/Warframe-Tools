# To-do

- Add logging for backend
  - more specifically, every single call to the 

# Abandoned

- analyze relics: see if there are one-off items (i.e., ALMOST becomes a proper set), or it is the one lacking (e.g., i have 2 neuroptics but 10 other items, neuroptics is the one lacking)
  - probably need set data from warframe.market or need to see the prime related recipe...
  - need all relic data...? probably already have that
  - need to see how to access the inventory
    - we need:
      - everything (items, bps, relics): uname to name
      - final product uname -> {requirement item uname: require count}
      - item uname -> [final product unames (may be more than 1)]
      - function lackingCount(item name): int, 0: this item is NOT lacking, positive number N: if we get N of this item, we can make N more sets of final product. note that we consider items that is required multiple amounts differently
        - e.g., if a product needs A:1, B:2, C:1, and we have A:3, B:3, C:4, then lackingCount(A) = 0, lackingCount(B) = 3, lackingCount(C) = 0 (note that each item only have one corresponding final product i.e., parent)
          - let minSetCount = min(have / requirement)
          - if minSetCount is unique (only 1 item has this minSetCount), then for all required item, return max(0, minSetCount * requirement - have)
          - if minSetCount is NOT unique (e.g., we have A:0, B:0, C:1), then return 0 for all, because we require multiple items to make a new set
    - for each relic we owned, we need the following info:
      - the items in this relic, with infobox saying about the final product
        - the final product should have information like: what items is needed, how much do we have and how much (e.g., Volt Prime Blueprint 2/1), also need a multi layer infobox for the item
      - the count of each relic
      - max(lackingCount for all items in this relic)