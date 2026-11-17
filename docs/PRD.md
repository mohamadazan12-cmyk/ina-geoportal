# Product Requirements Document (PRD)
# INA-GEOPORTAL WEB APP REDESIGN V2.0
## Functional System Specification

## 1. Executive Summary & Objective
Ina-Geoportal Web App Redesign v2.0 is a modern Single Page Application (SPA) WebGIS platform built to simplify, integrate, and modernize geospatial data discovery, visualization, download, and management across Indonesia's network nodes (Simpul Jaringan K/L/D).
The reference platform is the official Ina-Geoportal portal (https://tanahair.indonesia.go.id/portal-web/).
Current development focuses strictly on functional architecture, robust state management, resilient OGC integration, and clean separation of concerns prior to final Figma UI implementation.

## 2. Core Functional Modules
1. **Beranda (Landing Page & Global Search)**:
   - Dynamic real-time statistics (Simpul Jaringan, Total Dataset, Top Categories) with DEMO/Verified indicators.
   - Global autocomplete search indexing datasets, institutions, categories, and metadata keywords.
   - Quick navigation routes to Webmap, Catalog, and Network Nodes.
2. **Webmap (Interactive Spatial Viewer)**:
   - Leaflet / React Leaflet core centered at Indonesia `[-2.5489, 118.0149]`, default zoom 5.
   - Basemap switcher (OpenStreetMap, Satellite, Topographic, Dark Map) with availability status check and layer preservation.
   - Active Layer Stack management: visibility toggle, opacity slider (0–100%), reordering, delete, zoom to extent.
   - Layer format support: WMS (GetMap, GetFeatureInfo, GetLegendGraphic), WFS (GeoJSON), client GeoJSON, and KML.
   - Spatial tools: Measure distance & area (Turf.js), coordinate search (Lat/Lng), fly-to, client-side local file upload (GeoJSON/KML) with client-only parsing.
   - Deep-linking & catalog integration: supports `/webmap?layerId=xyz` and `/webmap?addLayer=xyz`.
3. **Katalog & Unduh Data (Data Repository)**:
   - Multi-filter catalog: categories, network nodes (K/L vs Pemda Prov/Kab/Kota), formats (Shapefile, GeoJSON, KML, WMS, WFS), production year, and access type (Public vs Restricted).
   - Bi-directional URL synchronization (query params reflect state and persist across refresh).
   - Dataset detail page (`/katalog/:datasetId`) with ISO 19115 compliant metadata display, mini preview map, OGC endpoint copy instructions (QGIS/ArcGIS).
   - Multi-tier download workflow:
     - Public: Instant download with audit logging.
     - Restricted: Requires authentication, purpose declaration, validation, and request status tracking.
     - Web Services: OGC WMS/WFS connection strings and documentation.
4. **Simpul Jaringan (Network Nodes Directory)**:
   - Institutional directory with category tabs (Kementerian/Lembaga, Pemda Provinsi, Pemda Kabupaten/Kota).
   - Node status tracking (Online, Synced, Offline, Unknown).
   - Institution detail page (`/simpul/:nodeId`) with metadata, wali data contact, and associated published datasets.
5. **Autentikasi & Profil Pengguna**:
   - Secure authentication: Register, Login (JWT/Bearer), Session management, Protected Routes (`/profile`).
   - Profile management, download activity history, and dataset bookmarking.

## 3. Route Map
- `/` → HomePage
- `/webmap` → WebmapPage (Query params: `layerId`, `addLayer`)
- `/katalog` → CatalogPage (Query params: `q`, `category`, `node`, `format`, `year`, `page`, `limit`, `sort`)
- `/katalog/:datasetId` → DatasetDetailPage
- `/simpul` → NetworkNodesPage
- `/simpul/:nodeId` → NodeDetailPage
- `/login` → LoginPage
- `/register` → RegisterPage
- `/profile` → UserProfilePage (Protected)
