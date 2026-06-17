# TableOnline Maps

Chrome Extension that embeds an interactive map on [TableOnline.fi](https://www.tableonline.fi/en/search) search result pages, showing restaurant locations using OpenStreetMap.


<img width="1537" height="1196" alt="tableonline2" src="https://github.com/user-attachments/assets/35689349-29d6-4b78-a380-4b613fc88337" />


## Install

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked** and select the `tableonlinemaps` folder
4. The extension is now active

## Test

1. Go to a search results page, e.g.:
   ```
   https://www.tableonline.fi/en/search?city=Helsinki&date=2026-06-17&period=dinner&availability=1
   ```
2. A map with restaurant markers appears above the restaurant list
3. Click a marker to see the restaurant name
4. Change filters (date, city, period) — the map updates automatically

## Known behavior

- During the availability search, the map will keep refreshing as TableOnline loads results in chunks. Wait for the search to finish — the map stabilizes once all results are loaded.
- Click a marker to see the restaurant name, address, and a link to its page.

## Structure

```
tableonlinemaps/
├── manifest.json
├── content.js
├── lib/
│   ├── leaflet.js
│   └── leaflet.css
└── images/
    ├── marker-icon.png
    ├── marker-icon-2x.png
    └── marker-shadow.png
```
