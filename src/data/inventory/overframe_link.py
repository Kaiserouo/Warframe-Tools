# This file contains the link to the overframe webpack link.
# we need to bypass cloudflare protection to get it from overframe.gg,
# (ref. overframe.md > Data > Data Fetching)
# but we can't do that in github action, so we need to hardcode the link here.

# the update date of this file
OVERFRAME_LAST_UPDATE_DATE = "2026-09-30"

# Steps:
# 1. Load into the overframe.gg page: https://overframe.gg/
# 2. press F12 and search for string "webpack" in the Element tab
# 3. you should see something like:
#   <script src="https://static.overframe.gg/_next/static/chunks/webpack-9aa2dfa61a7e83d1.js" defer=""></script>
# 4. paste the "webpack-63dcaab58e4f702e.js" part below (you may see a different hash, simply copy whatever you see)
# 5. update the OVERFRAME_LAST_UPDATE_DATE to today
OVERFRAME_WEBPACK_FILENAME = "webpack-9aa2dfa61a7e83d1.js"