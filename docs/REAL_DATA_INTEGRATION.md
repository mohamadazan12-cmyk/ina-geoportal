# Dokumentasi Integrasi Data Geospasial Asli Indonesia (Phase 10)
# INA-GEOPORTAL WEB APP REDESIGN V2.0

## 1. Ringkasan Eksekutif

Pada Phase 10 (Real Data Integration), aplikasi Web Ina-Geoportal Redesign v2.0 ditingkatkan dari ketergantungan semata-mata pada data simulasi menjadi sistem hibrida yang terhubung langsung dengan sumber-sumber geospasial resmi Pemerintah Republik Indonesia.

Prinsip Utama:
1. **Preservasi Absolut Desain UI/UX Figma**: Tidak ada perombakan visual, layout, warna, atau kontrol peta. Data asli disalurkan ke komponen yang sudah teruji.
2. **Kebenaran Asal Usul (Data Provenance)**: Setiap dataset memiliki catatan instansi wali data, status verifikasi, batasan penggunaan (disclaimer), dan URL metadata resmi yang dapat diaudit.
3. **Graceful Fallback & Ketahanan Offline**: Jika server penyedia data pemerintah sedang dalam pemeliharaan (maintenance), mengalami throttling, atau membatasi akses melalui token tertutup, aplikasi secara otomatis menyajikan fallback data lokal terverifikasi dengan label transparansi `FALLBACK` / `PENDING_AUTHORIZATION`.
4. **Preservasi Test Suite**: Seluruh 24 automated tests lama tetap 100% lulus, dan ditambahkan 9 pengujian baru sehingga total menjadi 33 passing tests (19 frontend + 14 backend).

---

## 2. Status Integrasi 6 Dataset Inti (Phase 10.9 Validated)

| ID Dataset | Nama Dataset | Wali Data Resmi | Sumber Integrasi Real | Status Data | Status Verifikasi | Fitur / Rekor Aktual |
|---|---|---|---|---|---|---|
| `ds-batas-kabkot` | Batas Administrasi Kabupaten/Kota Indonesia | Badan Informasi Geospasial (BIG) | BIG RBI Feature Layer 0 (`BATAS_KABKOTA_AR`) | **REAL_VERIFIED** | **VERIFIED** | 541 Poligon (514 Kab/Kota Kemendagri, 6 duplikat kepulauan, 21 segmen terluar, 38 Provinsi) |
| `ds-jalan-nasional` | Jaringan Jalan Nasional Lintas Pulau | Kementerian PUPR (Ditjen Bina Marga) | PUPR Public GEOAPI (`sigi.pu.go.id/geoapi`) | **PENDING_AUTHORIZATION** | **PENDING_AUTHORIZATION** | 3.306 Ruas (Metadata Terhubung, Akses Vektor Butuh Token PUSDATIN) |
| `ds-rawan-gempa` | Kawasan Rawan Bencana Gempa Bumi & Sesar Aktif | BNPB / InaRISK | InaRISK ArcGIS MapServer (`gis.bnpb.go.id`) | **FALLBACK** | **CONNECTED** | Upstream MapServer 7 layers aktif -> Vektor disajikan fallback dengan disclaimer SNI ketat |
| `ds-tutupan-lahan` | Peta Penutupan Lahan Nasional | Badan Informasi Geospasial (BIG) | BIG RBI Feature Layer 226 (`Penutupan Lahan`) | **REAL_PARTIAL_COVERAGE** | **PARTIAL** | 200 Poligon Sampel Berpaginasi (dari 97.002 total poligon nasional) |
| `ds-faskes` | Sebaran Fasilitas Kesehatan & Rumah Sakit | Badan Informasi Geospasial (BIG) | BIG RBI Feature Layer 102 (`Rumah Sakit`) & 94 (`Puskesmas`) | **REAL_PARTIAL_COVERAGE** | **PARTIAL** | 102 Titik Faskes Sampel (35 RS, 67 Puskesmas pada 4 lembar survei RBI) |
| `ds-rbi` | Peta Rupa Bumi Indonesia (RBI Topografi) | Badan Informasi Geospasial (BIG) | BIG GeoServices BASEMAP MapServer | **REAL_PARTIAL_COVERAGE** | **VERIFIED** | 890 Layer MapServer (Dipisahkan dari citra Sentinel-2 L2A Piksel WMS) |

---

## 3. Rincian Teknis & Temuan Validasi Phase 10.9

### 3.1. Dataset 1: Batas Administrasi Kabupaten/Kota (`ds-batas-kabkot`)
- **Endpoint Upstream**: `https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0`
- **CRS**: WGS 84 (EPSG:4326), `urn:ogc:def:crs:OGC:1.3:CRS84`
- **Tipe Geometri**: Polygon / MultiPolygon
- **Hasil Audit & Rekonsiliasi Kemendagri**:
  - Total fitur geospasial: **541 poligon**.
  - Total kode `KDPKAB` unik: **514 kode**, tepat mencakup 514 kabupaten dan kota di Indonesia sesuai referensi resmi Kementerian Dalam Negeri (Kepmendagri No 050-145 tahun 2022 / Kepmendagri 100.1.1-6117 Tahun 2022).
  - Terdapat **6 kode duplikat** di Provinsi Sulawesi Tenggara (Konawe 74.02, Konawe Selatan 74.05, Muna Barat 74.13, Muna 74.03, Wakatobi 74.07, Buton 74.04) yang merepresentasikan pulau-pulau/enklave terpisah dalam satu wilayah administratif.
  - Terdapat **21 fitur poligon pulau kecil terluar** yang memiliki nama provinsi (`WADMPR`) namun belum memiliki atribut kabupaten (`KDPKAB`/`WADMKK` kosong) pada layer upstream BIG.
  - Cakupan provinsi: **100% lengkap (38 provinsi)**, mencakup 4 provinsi Daerah Otonomi Baru di Papua (Papua Barat Daya, Papua Pegunungan, Papua Selatan, Papua Tengah).
  - Prinsip preservasi: Seluruh 541 fitur dipertahankan secara utuh tanpa pemotongan paksa.
- **Simbologi**: Poligon hijau emerald (`#10b981`), stroke 2px, fillOpacity 0.18.

### 3.2. Dataset 2: Jaringan Jalan Nasional (`ds-jalan-nasional`)
- **Endpoint Upstream**:
  - Metadata Live: `https://sigi.pu.go.id/geoapi/api/v1/dataset-meta/jalan_nasional` (Status HTTP 200, 3.306 rekor)
  - Vektor Stream: `https://sigi.pu.go.id/geoapi/api/v1/jalan_nasional` (Status HTTP 401: `Parameter 'email' dan 'token' wajib diisi`)
- **Status Akses**:
  - `PENDING_AUTHORIZATION`. Tidak ada bypass autentikasi. Fallback koridor arteri dan kolektor primer tetap aktif.
  - Prosedur pengajuan akses permanen telah didokumentasikan melalui PUSDATIN Kementerian PUPR.

### 3.3. Dataset 3: Kawasan Rawan Gempa Bumi (`ds-rawan-gempa`)
- **Hasil Audit Endpoint InaRISK**:
  - Portal Web Publik: `https://inarisk.bnpb.go.id/webgis/` (Aktif)
  - Layanan ArcGIS REST: `https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer` (Aktif HTTP 200, 7 layer: Megathrust [15 fitur], Java_Fault [35 fitur], Kalimantan, Maluku, Banda, Sulawesi, Sumatera).
- **Status Penanganan**:
  - Ditandai sebagai `FALLBACK` / `CONNECTED`.
  - Data lokal disajikan dengan fallback terverifikasi (Sesar Lembang, Palu-Koro, Semangko) dengan disclaimer hukum ketat: Bukan untuk perancangan teknik sipil atau perhitungan kekuatan struktur bangunan (SNI Gempa).

### 3.4. Dataset 4: Penutupan Lahan Nasional (`ds-tutupan-lahan`)
- **Sumber**: Badan Informasi Geospasial (BIG) Rupabumi Indonesia Layer 226.
- **Total Rekor Server**: 97.002 poligon.
- **Mekanisme Paginasi & Pengiriman Data**:
  - MaxRecordCount pada server upstream adalah 1.000 fitur.
  - Agar peramban pengguna tidak mengalami pembekuan memori, sistem menyajikan 200 poligon sampel representatif dengan dukungan paginasi `?page=1&limit=50`.
  - Ditandai secara transparan sebagai `REAL_PARTIAL_COVERAGE`.
  - Simbologi mencakup kode FTYPE resmi: Hutan Rimba (`FC004000`), Mangrove/Gambut (`FD002000`), Sawit/Kebun (`FA002000`), Sawah (`FA006000`), Tanah Kosong/Gundul (`FF002000`).

### 3.5. Dataset 5: Fasilitas Kesehatan (`ds-faskes`)
- **Sumber**: Badan Informasi Geospasial (BIG) Rupabumi Indonesia Layer 102 & Layer 94.
- **Total Rekor Aktual**: 102 titik terverifikasi (35 Rumah Sakit + 67 Puskesmas/Klinik).
- **Cakupan Spasial Aktual**:
  - Meliputi 4 lembar survei RBI: Lembar Bogor (Jabar), Lembar Sofifi (Maluku Utara), Lembar Entikong (Kalbar), Lembar Tanjung Kelayang (Bangka Belitung).
  - Sebanyak 34 provinsi belum tercakup dalam sampel ini.
  - Diberikan status transparan `REAL_PARTIAL_COVERAGE` (bukan cakupan nasional lengkap).

### 3.6. Dataset 6: Peta Rupa Bumi Indonesia (`ds-rbi`)
- **Pemisahan Konseptual**:
  - **Peta Dasar Topografi RBI**: Dilayani melalui MapServer Rupabumi Indonesia (`geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer`) dengan 890 layer kartografi.
  - **Citra Satelit Penginderaan Jauh**: Sentinel-2 L2A dilayani terpisah melalui OGC WMS Piksel BIG (`ows.piksel.big.go.id/wms`, layer `s2_l2a`).
  - Metadata, atribusi, layer name, dan legenda topografi kini terpisah tegas dari citra satelit optik.

---

## 4. Arsitektur Adapter Backend, Paginasi & BBOX Query (Phase 10.10 Expansion)

Struktur endpoint internal yang diakses frontend tetap konsisten:
- `GET /api/v1/datasets`: Menyajikan daftar dataset dengan metadata `dataSourceStatus`, `verificationStatus`, `sourceAgency`, `realFeatureCount`.
- `GET /api/v1/datasets/:id`: Menyajikan detail lengkap ISO 19115 beserta blok data provenance.
- `GET /api/v1/datasets/:id/geojson`: Mendukung parameter paginasi opsional (`page` dan `limit`) serta filter spasial bounding box (`bbox=minX,minY,maxX,maxY`) dengan HTTP header penanda (`X-Data-Source`, `X-Is-Demo`, `X-Source-Agency`, `X-Feature-Count`, `X-Total-Count`, `X-Page`, `X-Total-Pages`, `X-Filter-Bbox`).
- `GET /api/v1/datasets/:id/live-status`: Melakukan health-check upstream langsung ke server pemerintah dengan timeout 5 detik dan telemetri kaya (auth status, request portal, fault sublayers, total source records, legal disclaimers).
- `GET /api/v1/datasets/:id/download-file`: Mengunduh berkas data geospasial real/demo sesuai parameter.
- **PUPR Adapter (`fetchPuprLiveJalanNasional`)**: Mendukung pembacaan kredensial dinamis via environment variable (`PUPR_GEOAPI_EMAIL`, `PUPR_GEOAPI_TOKEN`) dan fallback aman ke data koridor primer tanpa membypass otentikasi.
- **BNPB Discovery (`fetchBnpbFaultLayers`)**: Mengidentifikasi 7 sublayer patahan aktif (Megathrust, Java, Kalimantan, Maluku, Banda, Sulawesi, Sumatera) dengan disclaimer SNI Gempa 1726.
- **Upstream Land Cover BBOX Proxy (`fetchUpstreamLandCoverBbox`)**: Mendukung query spasial langsung ke Layer 226 BIG dengan timeout aman dan fallback ke sampel lokal.

---

## 5. Ringkasan Pengujian Kualitas (Phase 10.10 Verified)

- **Server Integration & Validation Tests**: 26/26 passed (`npm test` in `server`)
- **Client Workflow & Symbology Tests**: 25/25 passed (`npm test` in `client`)
- **Total Passing Automated Tests**: **51/51 passed** (0 errors, 0 warnings).
- **Frontend Build**: `npm run build` sukses (TypeScript clean + Vite production bundle).
- **Backend Build**: `npm run build` sukses (`tsc` compiles cleanly).
