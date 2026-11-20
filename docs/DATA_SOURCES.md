# Data Sources & OGC Geospatial Registry
# INA-GEOPORTAL WEB APP REDESIGN V2.0
# Phase 16.3 — National Data Integrity & Storage Readiness

Dokumen ini memuat daftar resmi sumber data geospasial, registri OGC, endpoint API, layer ID, format, EPSG, volume data, dan arsitektur pengiriman data untuk seluruh dataset nasional Ina-Geoportal Redesign v2.0 setelah penyelesaian audit integritas dan kesiapan penyimpanan Phase 16.3.

---

## 1. Verified Official Datasets, Upstream Services & Providers (Phase 16.2)

### 1. Batas Administrasi Kabupaten/Kota Indonesia (`ds-batas-kabkot`)
- **Category**: Batas Wilayah
- **Responsible Institution (Wali Data)**: Badan Informasi Geospasial (BIG)
- **Producer Unit**: Pusat Pemetaan Batas Wilayah BIG
- **CRS / EPSG**: EPSG:4326 (WGS 84), `urn:ogc:def:crs:OGC:1.3:CRS84`
- **Access Type**: Public
- **Format**: GeoJSON, SHP, ArcGIS REST Feature Layer
- **Official Upstream Service (Satu Peta KSP)**: `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/BATAS_WILAYAH/MapServer/2` (Peta Wilayah Administrasi Kabupaten/Kota Area, 548 fitur upstream)
- **Legal Reference**: Keputusan Menteri Dalam Negeri No. 050-145 Tahun 2022
- **Status Data**: **`REAL_COMPLETE`** (Rekonsiliasi penuh 548 fitur upstream) / **`REAL_VERIFIED`** (541 poligon lokal terverifikasi)
- **Volume & Features Breakdown**:
  - Upstream Total: **548 fitur poligon**
  - Kemendagri Unique Entities: **514 kabupaten/kota** (100% dari seluruh 38 provinsi di Indonesia)
  - Fitur ber-KDPKAB: **521 fitur** (514 kode unik + 7 split poligon kepulauan/batas wilayah)
  - Segmen tanpa KDPKAB: **27 fitur** (21 pulau terluar/maritim + 4 fragmen batas Danau Moat Minahasa/Boltim, Pulau Karimata, Selat Malaka, Natuna Utara + 2 fragmen perairan)
- **Data Fixtures on Disk**:
  - Full National Reconciliation: `server/src/fixtures/geojson/real_batas_kabupaten_548.json` (292.02 MB, 548 fitur)
  - Ingestion Chunks: `server/src/fixtures/geojson/chunks_batas/` (22 chunk files, 25 fitur/chunk)
  - Web-Optimized Interactive Fixture: `server/src/fixtures/geojson/real_batas_kabupaten.json` (2.56 MB, 541 fitur WGS84)
- **Adapter**: `server/src/services/adapters/bigBatasWilayahAdapter.ts` (`fetchBatasKabkot`, `fetchBatasKabkotReconciliation`)

---

### 2. Jaringan Jalan Nasional Lintas Pulau (`ds-jalan-nasional`)
- **Category**: Transportasi
- **Responsible Institution (Wali Data)**: Ditjen Bina Marga Kementerian PUPR & Badan Informasi Geospasial (BIG)
- **CRS / EPSG**: EPSG:4326 (WGS 84)
- **Access Type**: Public Vector Geometries (BIG KSP) / Restricted Vector Stream (PUSDATIN PUPR)
- **Format**: GeoJSON Polyline, REST API, ISO 19115-3 XML
- **Primary Open Vector Source (BIG Satu Peta KSP)**:
  - Non-Tol (Layer 13): `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SARANA_PRASARANA/MapServer/13` (3.197 ruas polylines, ObjectIDs 1..3197)
  - Jalan Tol (Layer 14): `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SARANA_PRASARANA/MapServer/14` (180 ruas polylines, ObjectIDs 1..180 upstream direkonsiliasi menjadi 4001..4180 dengan `LAYER_OBJECTID` asli dipelihara)
  - Total Ruas: **3.377 segmen polylines jalan nasional (100% terakuisisi dengan 3.377 ObjectID unik tanpa tabrakan)**
- **Secondary Restricted Source (KemenPUPR SIGI GEOAPI)**:
  - Portal: `https://sigi.pu.go.id/geoapi/`
  - Table: `ast_bm_jalan_nasional_iri_v3` (3.306 rekor)
  - Metadata ISO 19115-3 XML: `https://sigi.pu.go.id/geoapi/metadata/ast_bm_jalan_nasional_iri_v3.xml`
- **Status Data**: **`REAL_COMPLETE`** (3.377 segmen jalan nasional lengkap dan unik)
- **Volume & Attributes**:
  - Total Ruas: **3.377 ruas jalan nasional** (3.197 Non-Tol + 180 Jalan Tol)
  - Atribut Resmi Terverifikasi: `OBJECTID`, `NAMOBJ`, `nm_inf`, `kd_ruas`, `fungsi`, `pjg_datar`, `status: 'N'`, `thn_data`, `tipe_jalan`, `JENIS`, `LAYER_OBJECTID`
- **Data Fixtures on Disk**:
  - Full National Road Network: `server/src/fixtures/geojson/real_jalan_nasional_full.json` (126.80 MB, 3.377 segmen, diabaikan Git karena batas 100 MiB)
  - Overview Primary Corridors: `server/src/fixtures/geojson/real_jalan_nasional.json` (442 KB, 60 koridor utama)
- **Adapter**: `server/src/services/adapters/bigJalanNasionalAdapter.ts` (`fetchJalanNasional`, `fetchFullNationalRoads`)

---

### 3. Kawasan Rawan Bencana Gempa Bumi & Sesar Aktif (`ds-rawan-gempa`)
- **Category**: Kebencanaan
- **Responsible Institution (Wali Data)**: Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG - Badan Geologi) & BNPB
- **CRS / EPSG**: EPSG:4326 (WGS 84)
- **Access Type**: Public Reference
- **Format**: GeoJSON MultiPolygon / Polygon, ArcGIS REST Feature Layer
- **Primary Vector Hazard Zone Source (BIG Satu Peta KSP / PVMBG)**:
  - Service: `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/12`
  - Total Fitur Upstream: **11.439 poligon zona bahaya gempa (100% terakuisisi)**
  - Distribusi 4 Kelas Bahaya:
    - Kawasan Rawan Bencana Gempabumi Tinggi: **2.408 poligon**
    - Kawasan Rawan Bencana Gempabumi Menengah: **4.530 poligon**
    - Kawasan Rawan Bencana Gempabumi Rendah: **3.829 poligon**
    - Kawasan Rawan Bencana Gempabumi Sangat Rendah: **672 poligon**
- **Secondary Disaster Source (BNPB InaRISK)**:
  - Patahan Sesar Aktif: `https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer` (7 sublayer garis sesar aktif PusGen)
  - Peta Bahaya Raster: `https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_gempabumi/MapServer/0`
- **Status Data**: **`REAL_COMPLETE`** (11.439 poligon zona bahaya PVMBG)
- **Pemisahan Konseptual Ketat**:
  1. *Poligon Zona Bahaya Gempa PVMBG* (vektor area kerentanan guncangan)
  2. *Garis Sesar Aktif PusGen* (vektor garis diskontinuitas geologi aktif)
  3. *Peta Indeks Risiko Bencana BNPB* (raster grid paparan populasi/kerugian)
- **Disclaimer Hukum Ketat**: *Bukan untuk perancangan teknik sipil atau perhitungan kekuatan struktur bangunan (SNI Gempa 1726).*
- **Data Fixtures on Disk**:
  - Full National Harvest Chunks: `server/src/fixtures/geojson/chunks_gempa/` (52 chunk files, 11.439 poligon)
  - Spatial Manifest: `server/src/fixtures/geojson/gempa_manifest.json` (metadata & 4 kelas bahaya)
  - Overview Map Fixture: `server/src/fixtures/geojson/real_rawan_bencana_gempa.json` (134 KB, 47 poligon)
- **Adapter**: `server/src/services/adapters/bigKrbGempaAdapter.ts` (`fetchKrbGempa`, `fetchFullKrbGempa`)

---

### 4. Peta Penutupan Lahan Nasional (`ds-tutupan-lahan`)
- **Category**: Lingkungan
- **Responsible Institution (Wali Data)**: Badan Informasi Geospasial (BIG)
- **CRS / EPSG**: EPSG:4326 (WGS 84)
- **Access Type**: Public
- **Format**: GeoJSON Polygon, ArcGIS REST Feature Layer
- **Master Upstream Source (BIG Satu Peta KSP)**:
  - Service: `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/0`
  - Total Upstream Features: **1.284.804 poligon** di seluruh Indonesia
- **Status Data**: **`REAL_COMPLETE_SERVICE`** (Arsitektur partisi regional makro + live BBOX query proxy)
- **Arsitektur Skala Besar (Large-Scale Architecture)**:
  - Partisi Makro Regional: 8 region geografis Indonesia (`tutupan_lahan_partitions/`), termasuk ekspansi Kawasan IKN Nusantara (`reg_kalimantan_ikn.json`) dengan 250 fitur poligon terverifikasi (total partisi: **1.999 fitur**)
  - Manifest Integritas: `tutupan_lahan_manifest.json` dengan hash SHA256 per partisi teruji 100% cocok
  - Live BBOX Query Proxy: Evaluasi interseksi poligon secara dinamis pada viewport peta
  - Klasifikasi SNI: Hutan Lahan Kering Primer, Hutan Mangrove, Perkebunan, Permukiman, Sawah, Tubuh Air, Semak Belukar, dsb.
- **Data Fixtures on Disk**:
  - Regional Partitions: `server/src/fixtures/geojson/tutupan_lahan_partitions/` (8 files, 1.999 poligon regional)
  - Master Manifest: `server/src/fixtures/geojson/tutupan_lahan_manifest.json`
  - Web Overview Sample: `server/src/fixtures/geojson/real_tutupan_lahan.json` (142 KB, 200 poligon)
- **Adapter**: `server/src/services/adapters/bigTutupanLahanAdapter.ts` (`fetchTutupanLahan`, `fetchTutupanLahanManifest`)

---

### 5. Sebaran Titik Fasilitas Kesehatan Nasional (`ds-faskes`)
- **Category**: Kesehatan
- **Responsible Institution (Wali Data)**: Badan Informasi Geospasial (BIG) & Ditjen Pelayanan Kesehatan Kemenkes RI
- **CRS / EPSG**: EPSG:4326 (WGS 84)
- **Access Type**: Public
- **Format**: GeoJSON Point, REST API
- **Official Point Sources (BIG Rupabumi Indonesia MapServer)**:
  - Layer 474: Rumah Sakit (**1.021 titik terverifikasi - 100% terakuisisi dari upstream**: 833 RS Umum + 188 RS Khusus)
  - Layer 475: Puskesmas (**2.000 titik terverifikasi** dari 14.150 fitur upstream)
  - Layer 476: Sarana Layanan Kesehatan Komunitas: Poliklinik / Polindes / Posyandu (**1.000 titik terverifikasi** dari 4.671 fitur upstream; audit domain `WS12_TLK` field `TPLYST` bernilai 1 dengan REMARK `Poliklinik/Polindes/Posyandu`)
  - Total Fasilitas Terverifikasi: **4.021 fasilitas kesehatan resmi survei kartografis BIG RBI** (4.021 koordinat spasial unik, 0 duplikasi koordinat)
  - Batasan & Provenans Jujur: 4.021 titik merupakan data survei fisik lembar peta RBI 1:50.000 (konsentrasi tinggi di Sumatera, Bangka Belitung, Kalimantan), bukan total seluruh fasilitas aktif operasional registri Kemenkes (>3.176 RS aktif di Kemenkes SIRS dan >70.000 faskes di SATUSEHAT).
- **Secondary Live Registry (Kemenkes SATUSEHAT)**:
  - Service: `https://api-satusehat.dto.kemkes.go.id/masterdata/v1/mastersaranaindex/mastersarana`
  - Portal: `https://satusehat.kemkes.go.id/platform/docs/id/master-data/master-sarana-index/rest-api-msi/`
  - Autentikasi: OAuth 2.0 Bearer Token DTO Kemenkes RI
- **Status Data**: **`REAL_COMPLETE`** (4.021 fasilitas kesehatan nasional survei kartografis BIG RBI)
- **Data Fixtures on Disk**:
  - Full National Point Layer: `server/src/fixtures/geojson/real_fasilitas_kesehatan_national.json` (3.03 MB, 4.021 titik)
  - Client Sync Fixture: `client/src/constants/demoGeojson/real_fasilitas_kesehatan_national.json` (2.09 MB)
  - Surveyed Sheets Overview: `server/src/fixtures/geojson/real_fasilitas_kesehatan.json` (79 KB, 102 titik: 35 RS, 67 Puskesmas)
- **Adapter**: `server/src/services/adapters/kemenkesFaskesAdapter.ts` (`fetchFasilitasKesehatan`, `fetchNationalHealthFacilities`)

---

### 6. Peta Rupabumi Indonesia Toponimi & Batimetri (`ds-rbi`)
- **Category**: Topografi & Kartografi Dasar
- **Responsible Institution (Wali Data)**: Badan Informasi Geospasial (BIG)
- **CRS / EPSG**: EPSG:3857 (Web Mercator) / EPSG:4326 (WGS 84)
- **Access Type**: Public MapServer & WMS
- **Official Service**:
  - MapServer: `https://gis.big.go.id/arcgis/rest/services/Rupabumi_Indonesia/Peta_RBI_Toponimi/MapServer`
  - Export Service: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/export`
- **Total Layers Terindeks**: **890 layer kartografis**
  - Leaf Feature Layers: **802 layer**
  - Group Layers: **88 layer**
  - Kategori Tematik: **38 grup tema** (Batas Wilayah, Hidrografi, Hipsografi, Transportasi, Bangunan Fasilitas Umum, Utilitas, Penutup Lahan, Toponim, Batimetri)
  - Skala Kartografis: 8 level skala (`1:5.000`, `1:10.000`, `1:25.000`, `1:50.000`, `1:100.000`, `1:250.000`, `1:500.000`, `1:1.000.000` dan level `Nasional`)
- **Pemisahan Layanan Basemap vs Citra Satelit**:
  - Vektor Topografi RBI: BIG Rupabumi Indonesia MapServer (890 layers)
  - Basemap Standar: OpenStreetMap WGS84 tile server
  - Citra Satelit Optik: Sentinel-2 Cloudless L2A Mosaic WMS (`https://ows.piksel.big.go.id/wms`)
- **Status Data**: **`MAP_SERVICE_ONLY`**
- **Data Fixtures on Disk**:
  - Complete 890 Layer Registry: `server/src/fixtures/geojson/rbi_layers_registry.json` (623.9 KB)
- **Service Integration**: `server/src/services/realGeospatialService.ts` (`fetchRbiRegistry`)
