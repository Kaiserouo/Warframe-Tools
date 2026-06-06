# TODO

- Actual proper logging for debugging purposes
  - every single request sent, etc
- Best Trade: Categorize
  - Add a "Categorize" toggle button on the page. It will categorize everything instead of just listing them like that
  - There should be at least those categories
    - Mod, Arcane: trivial
    - Prime: for everything that's not mod, not arcane, and has the word "prime" in there, categorize them by what prime they belong to
  - e.g., if my list is "Serration + Primed Cryo Rounds + Molt Augmented + Akvasto Prime Blueprint + Akvasto Prime Link + Euphona Prime Receiver", then the list should look like
    - Mods: Serration, Primed Cryo Rounds
    - Arcanes: Molt Augmented
    - Primes:  // NOTE: the item order is based on lexicographical order ascending 
      - Akvasto Prime: Akvasto Prime Blueprint + Akvasto Prime Link   // NOTE: items are listed on the same row
      - Euphona Prime: Euphona Prime Receiver