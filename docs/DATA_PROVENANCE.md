# Data Provenance Registry
# INA-GEOPORTAL WEB APP REDESIGN V2.0
# Phase 10.10 — Data Quality, Geographic Coverage & Boundary Validation Matrix

Dokumen ini memuat catatan asal-usul (provenance) resmi untuk setiap dataset yang terpasang pada Ina-Geoportal Redesign v2.0 setelah melalui audit mutu data, rekonsiliasi kode wilayah administrasi Kemendagri, verifikasi cakupan spasial, pemisahan konseptual layer dasar vs citra satelit, validasi pagination dan CRS, serta ekspansi adapter live service Phase 10.10.

---

## 1. Klasifikasi Status Data Resmi (Phase 10.9 Standard)

Setiap dataset diklasifikasikan ke dalam salah satu dari 5 status baku:
- **`REAL_VERIFIED`**: Data vektor/fitur resmi pemerintah yang terverifikasi penuh dengan cakupan spasial lengkap secara nasional (contoh: batas kabupaten/kota 38 provinsi).
- **`REAL_PARTIAL_COVERAGE`**: Data resmi pemerintah terverifikasi yang merepresentasikan sampel survei parsial atau subset representatif berpaginasi (tidak diklaim sebagai cakupan nasional penuh).
- **`PENDING_AUTHORIZATION`**: Metadata layanan resmi online dan terverifikasi, namun streaming geometri vektor membutuhkan izin/token permanen dari wali data instansi (contoh: PUSDATIN PUPR).
- **`FALLBACK`**: Layanan menggunakan data lokal terverifikasi dengan pemantauan upstream live probe aktif dan disclaimer legal ketat.
- **`UNAVAILABLE`**: Layanan upstream atau data lokal tidak dapat diakses atau sedang mengalami masa henti total.

---

## 2. Dataset Provenance Matrix

### 1. Batas Administrasi Kabupaten/Kota Indonesia (`ds-batas-kabkot`)
- **Dataset ID**: `ds-batas-kabkot`
- **Judul Resmi Sumber**: Area Batas Wilayah Administrasi Kabupaten/Kota (AR)
- **Instansi Wali Data**: Badan Informasi Geospasial (BIG)
- **Unit Kerja Produsen**: Pusat Pemetaan Batas Wilayah BIG
- **URL Layanan**: `https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0`
- **Tipe Layanan**: ArcGIS REST Feature Layer
- **Tipe Geometri**: MultiPolygon / Polygon
- **Sistem Koordinat (CRS)**: WGS 84 / Geographic (EPSG:4326), `urn:ogc:def:crs:OGC:1.3:CRS84`
- **Skala Representasi**: 1:50.000
- **Cakupan Wilayah**: Seluruh 38 Provinsi di Indonesia (100% provinsi terwakili, termasuk 4 DOB Papua)
- **Status Data**: **`REAL_VERIFIED`**
- **Status Verifikasi**: **`VERIFIED`**
- **Jumlah Fitur Vektor**: **541 poligon**
- **Rekonsiliasi Wilayah Administratif**:
  - **514 Kabupaten/Kota Unik**: Sesuai referensi resmi Kepmendagri No 050-145 / Kepmendagri 100.1.1-6117 (416 Kabupaten + 98 Kota) dengan kode `KDPKAB` unik.
  - **6 Poligon Duplikat Kode (Sulawesi Tenggara)**: Merupakan poligon terpisah untuk wilayah kepulauan/enklave administratif yang terfragmentasi pada layer ArcGIS BIG:
    1. Konawe (`74.02`): 2 poligon
    2. Konawe Selatan (`74.05`): 2 poligon
    3. Muna Barat (`74.13`): 2 poligon
    4. Muna (`74.03`): 2 poligon
    5. Wakatobi (`74.07`): 2 poligon (gugusan pulau terluar)
    6. Buton (`74.04`): 2 poligon
  - **21 Segmen Pulau Luar / Teritori Tak Bertuan**: Poligon pulau kecil terluar yang memiliki atribut provinsi (`WADMPR`) namun kode kabupaten (`KDPKAB`/`WADMKK`) belum teralokasi pada digitasi BIG (Maluku, Malut, Jatim, Sumbar, Kaltim, Kepri, Sulsel, Sulut, Sumut).
  - **Formula Rekonsiliasi**: `514 (unik) + 6 (duplikat kepulauan) + 21 (segmen terluar) = 541 Total Poligon`. Sesuai kaidah geospasial, seluruh 541 poligon dipertahankan tanpa penghapusan paksa.
- **Lisensi**: Lisensi Terbuka Data Pemerintah Republik Indonesia / BIG
- **Atribusi**: *Badan Informasi Geospasial (BIG) - Republik Indonesia*
- **Disclaimer**: Data batas wilayah administrasi ini bersumber dari penetapan resmi BIG untuk keperluan referensi geospasial nasional standar.

---

### 2. Sebaran Titik Fasilitas Kesehatan & Rumah Sakit (`ds-faskes`)
- **Dataset ID**: `ds-faskes`
- **Judul Resmi Sumber**: Rumah Sakit & Fasilitas Kesehatan (Rupabumi Indonesia Layer 102 & 94)
- **Instansi Wali Data**: Badan Informasi Geospasial (BIG) & Kementerian Kesehatan RI
- **Unit Kerja Produsen**: Pusat Pemetaan Rupabumi dan Toponim BIG
- **URL Layanan**: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/102`
- **Tipe Layanan**: ArcGIS REST Feature Layer
- **Tipe Geometri**: Point
- **Sistem Koordinat (CRS)**: WGS 84 (EPSG:4326), `urn:ogc:def:crs:OGC:1.3:CRS84`
- **Status Data**: **`REAL_PARTIAL_COVERAGE`**
- **Status Verifikasi**: **`PARTIAL`**
- **Jumlah Fitur Aktual**: **102 titik terverifikasi**
  - **Rumah Sakit (RS Umum & Khusus)**: 35 titik (simbologi merah)
  - **Puskesmas / Pustu / Poskesdes**: 67 titik (simbologi biru)
- **Cakupan Geografis Aktual**:
  - Bounding Box: `[106.735° E, -6.682° S] s.d. [127.661° E, 0.867° N]`
  - Lembar Peta RBI Terwakili (4 Provinsi):
    1. Lembar Bogor (`RBI500020161216BOGOR`): 69 titik (Jawa Barat: Kab. Bogor & Kota Depok)
    2. Lembar Sofifi (`RBI500020161115SOFIFI`): 31 titik (Maluku Utara: Sofifi & Halmahera Barat)
    3. Lembar Entikong (`RBI500020181116ENTIKONG`): 1 titik (Kalimantan Barat: Perbatasan Entikong)
    4. Lembar Tanjung Kelayang (`RBI500020181119TANJUNGKELAYANG`): 1 titik (Kepulauan Bangka Belitung)
  - **Wilayah Belum Tercakup**: 34 Provinsi lainnya belum terpetakan dalam sampel lembar RBI ini.
- **Klaim Cakupan**: Ditegaskan secara transparan sebagai **Cakupan Sampel Parsial** (bukan nasional lengkap).
- **Lisensi**: Data Terbuka Geospasial Fasilitas Publik
- **Atribusi**: *Badan Informasi Geospasial (BIG) & Kemenkes RI*
- **Disclaimer**: Titik fasilitas kesehatan diverifikasi dari basis data geospasial Rupabumi Indonesia BIG. Menyajikan 102 titik sampel pada 4 lembar survei RBI.

---

### 3. Peta Penutupan Lahan Nasional (`ds-tutupan-lahan`)
- **Dataset ID**: `ds-tutupan-lahan`
- **Judul Resmi Sumber**: Penutupan Lahan (Rupabumi Indonesia Layer 226)
- **Instansi Wali Data**: Badan Informasi Geospasial (BIG)
- **Unit Kerja Produsen**: Pusat Pemetaan Rupabumi dan Toponim BIG
- **URL Layanan**: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/226`
- **Tipe Layanan**: ArcGIS REST Feature Layer
- **Tipe Geometri**: Polygon / MultiPolygon
- **Sistem Koordinat (CRS)**: WGS 84 (EPSG:4326), `urn:ogc:def:crs:OGC:1.3:CRS84`
- **Total Rekor Sumber Upstream**: **97.002 poligon tutupan lahan**
- **MaxRecordCount ArcGIS Server**: 1.000 fitur per permintaan query
- **Strategi Pengiriman Data (Data Delivery)**:
  - Menyajikan **200 poligon sampel representatif** berpaginasi untuk mencegah kelebihan memori pada peramban web pengguna (*browser crash prevention*).
  - API mendukung paginasi dinamis via `GET /api/v1/datasets/ds-tutupan-lahan/geojson?page=1&limit=50`.
  - Header respon menyertakan `X-Page`, `X-Total-Pages`, `X-Total-Count: 200`, dan `X-Data-Source: REAL_PARTIAL_COVERAGE`.
- **Status Data**: **`REAL_PARTIAL_COVERAGE`**
- **Status Verifikasi**: **`PARTIAL`**
- **Kode Kelas Penutupan Lahan (FTYPE)**:
  - Tanah Kosong / Gundul (`FF002000` / `FF004000`): Poligon cokelat amber
  - Hutan Rimba (`FC004000`): Hijau primer gelap
  - Hutan Mangrove & Hutan Rawa Gambut (`FD002000` / `FD002002`): Hijau zamrud
  - Perkebunan (`FA002000`): Kuning keemasan
  - Sawah (`FA006000`): Hijau muda limau
- **Lisensi**: Data Terbuka Geospasial BIG
- **Atribusi**: *Badan Informasi Geospasial (BIG) - Peta Rupabumi Indonesia*
- **Disclaimer**: Dataset penutupan lahan bersumber dari Layer 226 Rupabumi Indonesia BIG (total 97.002 poligon). Aplikasi WebGIS menampilkan 200 poligon representatif dengan API paginasi untuk performa peramban yang optimal.

---

### 4. Peta Rupa Bumi Indonesia / RBI Topografi (`ds-rbi`)
- **Dataset ID**: `ds-rbi`
- **Judul Resmi Sumber**: Basemap Rupabumi Indonesia (Topografi & Morfologi Daratan)
- **Instansi Wali Data**: Badan Informasi Geospasial (BIG)
- **Unit Kerja Produsen**: Pusat Pemetaan Rupabumi dan Toponim BIG
- **URL MapServer**: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer`
- **URL WMS OGC**: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/WMSServer`
- **Tipe Layanan**: ArcGIS REST MapServer & OGC WMS (Layer `0` / `Rupabumi_Indonesia`)
- **Tipe Geometri**: Raster Basemap & Vector Sheet Index
- **Jumlah Layer Kartografi**: 890 layer tematik
- **Sistem Koordinat (CRS)**: EPSG:4326 / EPSG:3857 & UTM Zona 48S/49S/50S (EPSG:32748)
- **Pemisahan Konseptual dari Citra Satelit**:
  - **Peta Dasar RBI**: Menyajikan unsur hipsografi, garis kontur elevasi, toponimi resmi, hidrografi, batas, dan relief daratan berstandar SNI ISO 19115.
  - **Citra Satelit Sentinel-2 L2A**: Merupakan layanan penginderaan jauh optik mandiri yang di-host di Data Cube Indonesia (Piksel BIG: `https://ows.piksel.big.go.id/wms`, layer `s2_l2a`), terpisah secara tegas dari metadata, atribusi, legenda, dan layer name RBI Topografi.
- **Aksesibilitas**: **RESTRICTED** (Unduh lembar cetak beresolusi tinggi memerlukan akun terverifikasi)
- **Status Data**: **`REAL_PARTIAL_COVERAGE`** (untuk indeks lembar vektor) / **`VERIFIED`** (untuk MapServer Basemap)
- **Status Verifikasi**: **`VERIFIED`**
- **Lisensi**: Data Terbuka Geospasial Nasional BIG
- **Atribusi**: *Badan Informasi Geospasial (BIG) - Pusat Pemetaan Rupabumi dan Toponim*
- **Disclaimer**: Layanan resmi peta dasar topografi nasional menyajikan unsur hipsografi, toponimi, perairan, dan relief daratan berstandar SNI ISO 19115. Terpisah secara mandiri dari citra satelit optik Sentinel-2.

---

### 5. Jaringan Jalan Nasional Lintas Pulau (`ds-jalan-nasional`)
- **Dataset ID**: `ds-jalan-nasional`
- **Judul Resmi Sumber**: Jalan Nasional (Bina Marga)
- **Instansi Wali Data**: Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR)
- **Unit Kerja Produsen**: Subdit Data & Pengembangan Sistem Ditjen Bina Marga / Pusdatin PUPR
- **URL Portal**: `https://sigi.pu.go.id/geoapi/`
- **URL Metadata Live**: `https://sigi.pu.go.id/geoapi/api/v1/dataset-meta/jalan_nasional`
- **URL Layanan Vektor**: `https://sigi.pu.go.id/geoapi/api/v1/jalan_nasional`
- **Status Respon Live Probe**:
  - Metadata: **HTTP 200 OK** (3.306 rekor terdaftar, Unor Bina Marga, update harian).
  - Vektor Stream: **HTTP 401 Unauthorized** (`{"detail":{"error":"ACCESS_DENIED","message":"Parameter 'email' dan 'token' wajib diisi."}}`).
- **Status Data**: **`PENDING_AUTHORIZATION`**
- **Status Verifikasi**: **`PENDING_AUTHORIZATION`**
- **Status Geometri Live**: Menggunakan data fallback koridor primer nasional (Jalur Pantura, Lintas Tengah Jawa, Lintas Sumatera, Trans Sulawesi). Tidak ada klaim bahwa 3.306 ruas jalan telah dialirkan secara live sebelum token diperoleh.
- **Prosedur Pengajuan Whitelist dan Token Permanen**:
  - Panduan lengkap dan formulir permohonan resmi didokumentasikan pada: [`docs/PUPR_ACCESS_REQUEST.md`](./PUPR_ACCESS_REQUEST.md).
  - Meliputi: nama instansi tujuan (PUSDATIN Kementerian PUPR), dasar kebutuhan integrasi, data teknis (IP/domain server pemohon), format nomor referensi (`GEOAPI-YYYYMM-XXXXXX`), serta mekanisme whitelist tanpa kedaluwarsa sesi token.
  - Adapter otomatis tersedia di backend (`server/src/services/realGeospatialService.ts:fetchPuprLiveJalanNasional`) yang dapat langsung mengalirkan data vektor begitu variabel lingkungan `PUPR_GEOAPI_EMAIL` dan `PUPR_GEOAPI_TOKEN` diset.
- **Lisensi**: Data Terbuka Infrastruktur PUPR
- **Atribusi**: *Kementerian Pekerjaan Umum dan Perumahan Rakyat - Bina Marga (SIGI PUPR)*
- **Disclaimer**: Akses streaming vektor linestring 3.306 ruas Jalan Nasional memerlukan registrasi resmi email dan whitelist token permanen melalui PUSDATIN PUPR. WebGIS saat ini menampilkan data fallback koridor primer. Dokumen permohonan tersedia di `docs/PUPR_ACCESS_REQUEST.md`.

---

### 6. Kawasan Rawan Bencana Gempa Bumi & Sesar Aktif (`ds-rawan-gempa`)
- **Dataset ID**: `ds-rawan-gempa`
- **Judul Resmi Sumber**: Peta Bahaya Gempa Bumi & Sesar Aktif InaRISK
- **Instansi Wali Data**: Badan Nasional Penanggulangan Bencana (BNPB) & PVMBG Badan Geologi
- **Unit Kerja Produsen**: Direktorat Pemetaan dan Evaluasi Risiko Bencana / InaRISK
- **URL Portal WebGIS**: `https://inarisk.bnpb.go.id/webgis/` (Portal web publik)
- **URL Layanan ArcGIS REST**: `https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer`
- **Status Respon Live Probe**:
  - **HTTP 200 OK**: MapServer aktif dengan 7 sublayer tematik:
    - Layer 0: `Megathrust` (15 fitur poligon)
    - Layer 1: `Java_Fault` (35 fitur garis patahan)
    - Layer 2 s.d. 6: `Kalimantan_Fault`, `N_Maluku_Fault`, `NT_Banda_Fault`, `Sulawesi_Fault`, `Sumatera_Fault`.
- **Status Data**: **`FALLBACK`**
- **Status Verifikasi**: **`CONNECTED`**
- **Justifikasi Fallback**: Layanan vektor lokal disajikan menggunakan fallback zonasi sesar terverifikasi (Sesar Lembang dsk.) untuk memastikan stabilitas visualisasi di sisi peramban serta mematuhi batasan hukum kebencanaan.
- **Disclaimer Hukum Ketat**:
  *Data diperuntukkan untuk analisis risiko bencana, edukasi publik, dan kesiapsiagaan darurat. BUKAN UNTUK PERANCANGAN TEKNIK SIPIL ATAU PERHITUNGAN KEKUATAN STRUKTUR BANGUNAN (SNI GEMPA 1726).*
- **Lisensi**: Data Kebencanaan Terbatas / BNPB
- **Atribusi**: *BNPB & Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG - Badan Geologi)*
