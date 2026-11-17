# Data Sources & OGC Geospatial Registry
# INA-GEOPORTAL WEB APP REDESIGN V2.0

## 1. Verified Official Baseline Datasets & Live Services (Phase 10.10)

To ensure absolute reliability in offline, sandboxed, or restricted network environments, the application embeds standard Indonesian datasets in GeoJSON with full provenance metadata, backed by live official government GIS endpoints and 5 standardized status levels:

### 1. Batas Administrasi Kabupaten/Kota Indonesia (`ds-batas-kabkot`)
- **Category**: Batas Wilayah
- **Responsible Institution (Wali Data)**: Badan Informasi Geospasial (BIG)
- **EPSG**: EPSG:4326 (WGS 84), `urn:ogc:def:crs:OGC:1.3:CRS84`
- **Access Type**: Public
- **Format**: GeoJSON, SHP, ArcGIS REST
- **Official Live Service**: `https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0`
- **Status**: **REAL_VERIFIED** (Reconciled 541 Kab/Kota polygons across 38 provinces: 514 Kemendagri unique codes + 6 island duplicates + 21 unassigned outer island polygons)

### 2. Jaringan Jalan Nasional Lintas Pulau (`ds-jalan-nasional`)
- **Category**: Transportasi
- **Responsible Institution (Wali Data)**: Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR) - Ditjen Bina Marga / PUSDATIN
- **EPSG**: EPSG:4326 (WGS 84)
- **Access Type**: Public Metadata / Restricted Vector Stream
- **Format**: GeoJSON, SHP, REST API
- **Official Live Portal**: `https://sigi.pu.go.id/geoapi/` (Table: `jalan_nasional`, 3.306 linestring records)
- **Status**: **PENDING_AUTHORIZATION** (Live metadata probe connected HTTP 200; vector stream requires official email & token whitelist; complete request guide available in `docs/PUPR_ACCESS_REQUEST.md`)

### 3. Kawasan Rawan Bencana Gempa Bumi & Sesar Aktif (`ds-rawan-gempa`)
- **Category**: Kebencanaan
- **Responsible Institution (Wali Data)**: Badan Nasional Penanggulangan Bencana (BNPB) / PVMBG Badan Geologi
- **EPSG**: EPSG:4326 (WGS 84)
- **Access Type**: Restricted (Requires Research / Government Declaration Purpose)
- **Format**: GeoJSON, SHP, ArcGIS REST MapServer
- **Official Live Portal**: `https://inarisk.bnpb.go.id/webgis/` & `https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer`
- **Status**: **FALLBACK** (Discovered 7 fault sublayers: Megathrust, Java, Kalimantan, Maluku, Banda, Sulawesi, Sumatera; safe verified local fallback active with strict SNI Gempa 1726 civil engineering disclaimer)

### 4. Peta Penutupan Lahan Nasional (`ds-tutupan-lahan`)
- **Category**: Lingkungan
- **Responsible Institution (Wali Data)**: Badan Informasi Geospasial (BIG) - Peta Rupabumi Indonesia
- **EPSG**: EPSG:4326 (WGS 84)
- **Access Type**: Public
- **Format**: GeoJSON, SHP, ArcGIS REST
- **Official Live Service**: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/226`
- **Status**: **REAL_PARTIAL_COVERAGE** (200 representative polygons sampled from 97.002 upstream features; supports GeoJSON pagination `?page=1&limit=50` and BBOX spatial query)

### 5. Sebaran Titik Fasilitas Kesehatan & Rumah Sakit Rujukan (`ds-faskes`)
- **Category**: Kesehatan
- **Responsible Institution (Wali Data)**: Badan Informasi Geospasial (BIG) & Ditjen Yankes Kemenkes RI
- **EPSG**: EPSG:4326 (WGS 84)
- **Access Type**: Public
- **Format**: GeoJSON, KML, ArcGIS REST
- **Official Live Service**: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/102` (Rumah Sakit) & `94` (Puskesmas)
- **Status**: **REAL_PARTIAL_COVERAGE** (Verified 102 public health facility points: 35 RS, 67 Puskesmas across 4 RBI map sheets; strictly zero personal health data)

### 6. Peta Rupa Bumi Indonesia (RBI) Skala 1:25.000 / 1:50.000 (`ds-rbi`)
- **Category**: Topografi
- **Responsible Institution (Wali Data)**: Badan Informasi Geospasial (BIG)
- **EPSG**: EPSG:4326 / EPSG:32748
- **Access Type**: Restricted (SNI Geospasial compliance)
- **Format**: OGC WMS, ArcGIS REST, GeoJSON
- **Official Live Service**: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer` (890 Topographic layers) & separate Sentinel-2 L2A WMS at `https://ows.piksel.big.go.id/wms`
- **Status**: **REAL_PARTIAL_COVERAGE** (Topographic Basemap verified; conceptual separation from satellite imagery preserved)

---

## 2. Basemap Providers & Licensing

1. **OpenStreetMap Standard**:
   - URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
   - Attribution: `© OpenStreetMap contributors`
   - Policy: Conforms to OSM Tile Usage Policy (custom User-Agent client headers).

2. **ESRI World Imagery (Satellite)**:
   - URL: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
   - Attribution: `Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community`

3. **OpenTopoMap**:
   - URL: `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`
   - Attribution: `Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)`

4. **CartoDB Dark Matter**:
   - URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`
   - Attribution: `© OpenStreetMap contributors © CARTO`
