# Interaction Mapping
## INA-Geoportal Web App Redesign v2.0

Comprehensive inventory of all interactive elements across the application based on Figma prototypes and functional specifications.

| Page | Element | Expected Action | Existing Handler / API | Test Status |
|---|---|---|---|---|
| Global (All Pages) | Bottom Nav: Beranda | Navigate to `/` | `navigate('/')`, active state blue icon & label | Tested |
| Global (All Pages) | Bottom Nav: Katalog | Navigate to `/katalog` | `navigate('/katalog')`, active state blue icon & label | Tested |
| Global (All Pages) | Bottom Nav: Peta | Navigate to `/webmap` | `navigate('/webmap')`, active state blue icon & label | Tested |
| Global (All Pages) | Bottom Nav: Unduh | Navigate to `/unduh` | `navigate('/unduh')`, active state blue icon & label | Tested |
| Global (All Pages) | Bottom Nav: Lainnya | Navigate to `/lainnya` | `navigate('/lainnya')`, active state blue icon & label | Tested |
| Global Header | Logo BIG / Garuda | Navigate to `/` | `navigate('/')` | Tested |
| Global Header | User Profile Button | If logged in navigate to `/profile`, if guest open `/login` | `useAuthStore.isAuthenticated ? navigate('/profile') : navigate('/login')` | Tested |
| Beranda | Tab "Pencarian Data" | Activates dataset search mode | Local state `activeTab === 'data'` | Tested |
| Beranda | Tab "Info Simpul Jaringan" | Activates network node search mode / navigates to `/simpul` | Local state `activeTab === 'simpul'` / `navigate('/simpul')` | Tested |
| Beranda | Global Search Input | Text input with debounced autocomplete query suggestions | Autocomplete suggestions dropdown, pressing enter redirects to `/katalog?q=...` | Tested |
| Beranda | Search Submit Button (Glass icon) | Executes search with entered keyword | Form submit -> `navigate('/katalog?q=' + encodeURIComponent(keyword))` | Tested |
| Beranda | Stat Card: Simpul Jaringan (476) | Shows total nodes, clicking opens `/simpul` | `navigate('/simpul')` | Tested |
| Beranda | Stat Card: Dataset Tersedia (16.329) | Shows total datasets, clicking opens `/katalog` | `navigate('/katalog')` | Tested |
| Katalog | Search Bar | Filters catalog by text query | Updates URL `?q=...` and queries `datasetApi.getAll()` | Tested |
| Katalog | Category Filters | Filters by Tematik, Batas Wilayah, Kebencanaan, dll. | Updates URL `?category=...` | Tested |
| Katalog | Dataset Card "Lihat Peta ↗" | Directly opens `/webmap?layerId={id}` and loads WMS/GeoJSON layer | `navigate('/webmap?layerId=' + dataset.id)` | Tested |
| Katalog | Dataset Card "Detail" / Click Card | Opens dataset ISO 19115 detail view modal or page | `navigate('/katalog/' + dataset.id)` or opens detail drawer | Tested |
| Webmap | Floating Search Bar | Searches geographic locations or datasets with fly-to | Fly to coordinates `[lat, lng]` via Leaflet `map.flyTo()` | Tested |
| Webmap | Map Control `+` (Zoom In) | Increments map zoom level | Leaflet `map.zoomIn()` | Tested |
| Webmap | Map Control `-` (Zoom Out) | Decrements map zoom level | Leaflet `map.zoomOut()` | Tested |
| Webmap | Map Control GPS / Location | Re-centers map to Indonesia default `[-2.5489, 118.0149]` zoom 5 | Leaflet `map.flyTo([-2.5489, 118.0149], 5)` | Tested |
| Webmap | Map Control Basemap Switcher (Grid) | Toggles basemap selector drawer/modal (OSM, Satellite ESRI, Topo, Dark) | `useMapStore.setBasemap(id)` | Tested |
| Webmap | Map Control Layers (Stacked) | Toggles active layer management drawer (opacity slider, visibility eye, reorder) | `useMapStore.toggleLayerVisibility()`, `setLayerOpacity()` | Tested |
| Webmap | Map Control Tools / Legend (List) | Toggles spatial measurement tools (distance, area) & dynamic legend | `useMapStore.setMeasurementMode()`, Legend drawer | Tested |
| Webmap | Layer Stack: Add Layer Button | Opens layer selection modal to add new layers to map | `useMapStore.addLayer(layer)` | Tested |
| Webmap | Layer Stack: Opacity Slider | Adjusts layer transparency in real-time | Leaflet layer `setOpacity(val)` | Tested |
| Webmap | Layer Stack: Visibility Toggle | Shows/hides layer on Leaflet canvas | `useMapStore.toggleLayerVisibility(id)` | Tested |
| Webmap | Layer Stack: Delete Layer Button | Removes layer from map stack | `useMapStore.removeLayer(id)` | Tested |
| Webmap | Map Canvas Click | Runs GetFeatureInfo / GeoJSON hit-test and displays attribute drawer | `useMapStore.setSelectedFeature(feature)` | Tested |
| Unduh Data | Dataset Download Button "Unduh Data" | Opens download dialog with access verification | Public instant download, Restricted with purpose audit form, OGC WMS/WFS copy | Tested |
| Unduh Data | Format Option (Shapefile, GeoJSON, KML) | Selects target export format | Initiates download with format specifier | Tested |
| Unduh Data | Purpose Form Submit (Restricted) | Submits purpose reason and generates audit record | `datasetApi.download(id, { purpose })` | Tested |
| Unduh Data | OGC Endpoint Copy Button | Copies WMS/WFS URL to system clipboard | `navigator.clipboard.writeText(url)` with toast feedback | Tested |
| Lainnya | Standar Data Menu Item | Navigates to Standar Data Geospasial page | `navigate('/standar-data')` | Tested |
| Lainnya | Tools GIS Menu Item | Navigates to Tools GIS page | `navigate('/tools')` | Tested |
| Lainnya | Bantuan Menu Item | Navigates to Bantuan & Panduan page | `navigate('/bantuan')` | Tested |
| Lainnya | Kontak Kami Menu Item | Navigates to Kontak Kami page | `navigate('/kontak')` | Tested |
| Standar Data | Back Button (`<`) | Navigates back to previous page / Lainnya | `navigate(-1)` | Tested |
| Standar Data | Search Input | Filters standard documents by title / code | Filters local document list | Tested |
| Standar Data | Tab "Semua (60)" | Displays all documents | Local filter `filter = 'all'` | Tested |
| Standar Data | Tab "Data Prioritas (50)" | Displays only priority standards | Local filter `filter = 'prioritas'` | Tested |
| Standar Data | Tab "Data Non Prioritas (10)" | Displays non-priority standards | Local filter `filter = 'non-prioritas'` | Tested |
| Standar Data | View Toggle Grid (4 squares) | Switches view to Grid view cards | Local state `viewMode = 'grid'` | Tested |
| Standar Data | View Toggle List (Horizontal lines) | Switches view to compact List view items | Local state `viewMode = 'list'` | Tested |
| Standar Data | Document "Lihat Detail ↗" | Opens document reader modal or downloads PDF | Opens document info modal / external PDF link | Tested |
| Bantuan | Guide Item Chevron (`>`) | Expands handbook / triggers PDF download | Opens modal / guide download | Tested |
| Kontak Kami | Social Media Icons (FB, IG, X, YT) | Links to official BIG social channels | External links with `rel="noreferrer"` | Tested |
| Kontak Kami | Email Address | Initiates `mailto:info@big.go.id` | `href="mailto:info@big.go.id"` | Tested |
| User Profile | Logout Button | Clears auth token and resets user session | `useAuthStore.logout()`, redirects to `/` | Tested |
| User Profile | Bookmarks List | Allows removing saved dataset bookmarks | `datasetApi.toggleBookmark(id)` | Tested |
| User Profile | Download History Table | Shows audit trail of past downloaded datasets | Fetches user audit trail | Tested |
