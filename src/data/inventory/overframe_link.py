# This file contains the link to the overframe webpack link.
# we need to bypass cloudflare protection to get it from overframe.gg,
# ref. overframe.md > Data > Data Fetching
# but we can't do that in github action, so we need to hardcode the link here.

# the update date of this file
OVERFRAME_LAST_UPDATE_DATE = "2026-09-17"

# look into any overframe.gg page and look for string "webpack"
# e.g., https://static.overframe.gg/_next/static/chunks/webpack-63dcaab58e4f702e.js -> "webpack-63dcaab58e4f702e.js"
OVERFRAME_WEBPACK_FILENAME = "webpack-63dcaab58e4f702e.js"