# API Inventory & Service Registry
# INA-GEOPORTAL WEB APP REDESIGN V2.0

## Official Government Geospatial API Inventory (Phase 10)

| Provider | Dataset | Endpoint | Protocol | Format | Auth | Coverage | Status |
|---|---|---|---|---|---|---|---|
| **Badan Informasi Geospasial (BIG)** | Batas Administrasi Kabupaten/Kota (`ds-batas-kabkot`) | `https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0` | ArcGIS REST Feature Layer | GeoJSON / JSON / SHP | None (Public) | Nasional (514 Kemendagri Kab/Kota + 6 pulau terpisah + 21 segmen luar = 541 Poligon, 38 Provinsi) | **REAL_VERIFIED** |
| **Badan Informasi Geospasial (BIG)** | Batas Garis Wilayah (`BATAS_KABKOTA_LN`) | `https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_LN/MapServer/0` | ArcGIS REST MapServer | GeoJSON / JSON | None (Public) | Nasional (160.236 Linestring) | **CONNECTED** |
| **Kementerian PUPR (Bina Marga)** | Jaringan Jalan Nasional (`ds-jalan-nasional`) | `https://sigi.pu.go.id/geoapi/api/v1/dataset-meta/jalan_nasional` | REST API (Metadata Discovery) | JSON | None (Public Meta) | Nasional (3.306 Ruas Jalan) | **CONNECTED** |
| **Kementerian PUPR (Bina Marga)** | Jaringan Jalan Nasional Vektor (`ds-jalan-nasional`) | `https://sigi.pu.go.id/geoapi/api/v1/jalan_nasional` | REST API (Data Vector Stream) | GeoJSON / CSV | Email & Token Whitelist PUSDATIN (Lihat `docs/PUPR_ACCESS_REQUEST.md`) | Nasional (3.306 Ruas Jalan) | **PENDING_AUTHORIZATION** |
| **Badan Nasional Penanggulangan Bencana (BNPB)** | Kawasan Bahaya Gempa Bumi & Sesar (`ds-rawan-gempa`) | `https://inarisk.bnpb.go.id/webgis/` | WebGIS Portal / ArcServer | HTML / WMS | None (Public Portal) | Nasional | **CONNECTED** |
| **Badan Nasional Penanggulangan Bencana (BNPB)** | Sesar Aktif & Bahaya Gempa MapServer (`ds-rawan-gempa`) | `https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer` | ArcGIS REST MapServer | JSON / Export Map | None (Public) | Nasional (7 Sublayer Patahan Aktif & Megathrust) | **CONNECTED / FALLBACK** |
| **Badan Informasi Geospasial (BIG)** | Penutupan Lahan RBI Layer 226 (`ds-tutupan-lahan`) | `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/226` | ArcGIS REST Feature Layer | GeoJSON / JSON | None (Public) | Sampel Representatif Berpaginasi (dari 97.002 Poligon Nasional) | **REAL_PARTIAL_COVERAGE** |
| **Kementerian LHK (KLHK)** | Penutupan Lahan SIMDAS / SIPPEG | `https://dbgis.menlhk.go.id/server/rest/services/SIMDAS/LK/MapServer` | ArcGIS REST MapServer | JSON / WMS | None | Nasional | **UNAVAILABLE** (DNS Lookup Fail -> Menggunakan Sumber Resmi BIG RBI) |
| **Badan Informasi Geospasial (BIG)** | Sebaran Rumah Sakit Layer 102 (`ds-faskes`) | `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/102` | ArcGIS REST Feature Layer | GeoJSON / JSON | None (Public) | Sampel 4 Lembar RBI (35 Titik RS Terdaftar) | **REAL_PARTIAL_COVERAGE** |
| **Badan Informasi Geospasial (BIG)** | Sebaran Puskesmas Layer 94 (`ds-faskes`) | `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/94` | ArcGIS REST Feature Layer | GeoJSON / JSON | None (Public) | Sampel 4 Lembar RBI (67 Titik Puskesmas) | **REAL_PARTIAL_COVERAGE** |
| **Kementerian Kesehatan RI (Kemenkes)** | Direktori Fasyankes Online (DFO) | `https://dfo.kemkes.go.id/v2` | Web Portal / SATUSEHAT | HTML / JSON | SATUSEHAT OAuth2 (Internal Kemenkes) | Nasional | **PENDING_AUTHORIZATION** |
| **Badan Informasi Geospasial (BIG)** | Peta Rupa Bumi Indonesia MapServer (`ds-rbi`) | `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer` | ArcGIS REST MapServer | JSON / Export Map | None (Public) | Nasional (890 Layer Dasar RBI Topografi) | **REAL_PARTIAL_COVERAGE** |
| **Badan Informasi Geospasial (BIG)** | DE Indonesia (Piksel) Sentinel-2 WMS (`ds-rbi-satellite`) | `https://ows.piksel.big.go.id/wms` | OGC WMS 1.1.1 / 1.3.0 | PNG / JPEG / XML | None (Public) | Nasional (10 Layer Resolusi Tinggi) | **VERIFIED (SEPARATE)** |

---

## Service Classification Matrix

| Group | Service Name | Provider / Host | Endpoint / Pattern | Function | Auth / API Key | Pricing | Status |
|---|---|---|---|---|---|---|---|
| **A. Public Basemaps** | OpenStreetMap Standard | OpenStreetMap Foundation | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Default OSM Basemap | None (User-Agent header required) | FREE | ACTIVE |
| **A. Public Basemaps** | ESRI World Imagery | ESRI ArcGIS Online | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | High-res satellite tiles | None | FREE (Public) | ACTIVE |
| **A. Public Basemaps** | OpenTopoMap | OpenTopoMap / OSM | `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png` | Elevation & contours | None | FREE | ACTIVE |
| **A. Public Basemaps** | CartoDB Dark Matter | CARTO / OSM | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png` | Dark theme basemap | None | FREE | ACTIVE |
| **B. OGC & REST Services** | BIG Geoservices MapServer | Badan Informasi Geospasial (BIG) | `https://geoservices.big.go.id/rbi/rest/services/` | Batas Wilayah, Penutupan Lahan, Faskes, RBI | None (Public REST) | FREE | VERIFIED |
| **B. OGC & REST Services** | BIG Piksel WMS | Badan Informasi Geospasial (BIG) | `https://ows.piksel.big.go.id/wms` | Citra Sentinel-2 L2A & Muka Peta | None (Public OGC) | FREE | VERIFIED |
| **B. OGC & REST Services** | PUPR Public GEOAPI | Kementerian PUPR | `https://sigi.pu.go.id/geoapi/` | Metadata & Jaringan Jalan Nasional | Email & Token Whitelist | FREE | PENDING_AUTHORIZATION |
| **B. OGC & REST Services** | InaRISK BNPB Portal | BNPB / PVMBG | `https://inarisk.bnpb.go.id/webgis/` | Peta Rawan Bencana | None (Portal Online) | FREE | FALLBACK_ACTIVE |
| **C. Internal Backend API** | Overview Stats | Local Backend | `GET /api/v1/stats/overview` | Homepage counter & stats | None | FREE | ACTIVE |
| **C. Internal Backend API** | Autocomplete Search | Local Backend | `GET /api/v1/search/suggest` | Search suggest by title/tag/node | None | FREE | ACTIVE |
| **C. Internal Backend API** | Datasets List | Local Backend | `GET /api/v1/datasets` | Multi-filter & pagination | None | FREE | ACTIVE |
| **C. Internal Backend API** | Dataset Detail | Local Backend | `GET /api/v1/datasets/:id` | Full ISO 19115 metadata & provenance | None | FREE | ACTIVE |
| **C. Internal Backend API** | Dataset GeoJSON | Local Backend | `GET /api/v1/datasets/:id/geojson` | Real / demo spatial vector data (Supports ?page=X&limit=Y&bbox=minX,minY,maxX,maxY) | None | FREE | ACTIVE |
| **C. Internal Backend API** | Live Service Health | Local Backend | `GET /api/v1/datasets/:id/live-status` | Probe upstream government service with rich telemetry & fault/auth details | None | FREE | ACTIVE |
| **C. Internal Backend API** | Dataset Download | Local Backend | `POST /api/v1/datasets/:id/download` | Public or restricted download handler | Optional JWT (Required for restricted) | FREE | ACTIVE |
| **C. Internal Backend API** | Categories List | Local Backend | `GET /api/v1/categories` | Catalog category list | None | FREE | ACTIVE |
| **C. Internal Backend API** | Network Nodes List | Local Backend | `GET /api/v1/nodes` | List K/L and Pemda nodes | None | FREE | ACTIVE |
| **C. Internal Backend API** | Network Node Detail | Local Backend | `GET /api/v1/nodes/:nodeId` | Node profile & datasets | None | FREE | ACTIVE |
| **D. Authentication Services** | User Register | Local Backend | `POST /api/v1/auth/register` | Create user account | None | FREE | ACTIVE |
| **D. Authentication Services** | User Login | Local Backend | `POST /api/v1/auth/login` | JWT token generation | None | FREE | ACTIVE |
| **D. Authentication Services** | User Profile & Data | Local Backend | `GET /api/v1/user/profile` | Logged-in user information | JWT Required | FREE | ACTIVE |
| **D. Authentication Services** | User Downloads | Local Backend | `GET /api/v1/user/downloads` | Audit trail of downloads | JWT Required | FREE | ACTIVE |
| **D. Authentication Services** | User Bookmarks | Local Backend | `GET/POST /api/v1/user/bookmarks` | Saved dataset management | JWT Required | FREE | ACTIVE |
