# INA-GEOPORTAL WEB APP REDESIGN V2.0
## Purwarupa Sistem Fungsional & WebGIS Indonesia (Functional Core Release)

Referensi Resmi: [Ina-Geoportal Tanah Air Indonesia (BIG)](https://tanahair.indonesia.go.id/portal-web/)

---

## 1. Ringkasan Eksekutif & Karakteristik Proyek

Aplikasi ini merupakan rekonstruksi arsitektur penuh (Full-Stack Redesign) dari **Ina-Geoportal Web App v2.0**, yang menyederhanakan alur kerja pencarian, visualisasi interaktif spasial OGC, katalog metadata geospasial terstandar ISO 19115, direktori simpul jaringan nasional, dan tata kelola unduh data (Public vs. Restricted).

Fokus pada tahap ini adalah **FUNCTIONAL SYSTEM DEVELOPMENT**. Seluruh logika bisnis, state management, REST API, WebGIS engine, otentikasi token, dan database telah diimplementasikan secara modular sehingga tampilan visual dapat diganti dengan komponen desain Figma di tahap berikutnya tanpa merombak logika inti.

---

## 2. Struktur Monorepo & Arsitektur Direktori

```
projek IMK/
├── client/                          # Frontend React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # Reusable UI (Badge, Modal, LoadingSpinner)
│   │   │   ├── layout/              # Navbar, Footer, AppLayout
│   │   │   ├── home/                # HeroSection, GlobalSearch (autocomplete), StatsSection, QuickAccess
│   │   │   ├── catalog/             # CatalogFilterBar, DatasetCard, DownloadModal, Pagination
│   │   │   ├── webmap/              # BasemapController, LayerStackController, LayerManagerDrawer,
│   │   │   │                        # BasemapSwitcher, SpatialTools, FeatureInfoDrawer, LegendDrawer, AddLayerModal
│   │   │   ├── nodes/               # NodeCard
│   │   │   └── profile/             # DownloadHistoryTable, BookmarksList
│   │   ├── pages/                   # HomePage, WebmapPage, CatalogPage, DatasetDetailPage,
│   │   │                            # NetworkNodesPage, NodeDetailPage, LoginPage, RegisterPage, UserProfilePage
│   │   ├── routes/                  # AppRoutes, ProtectedRoute
│   │   ├── store/                   # useAuthStore, useMapStore, useCatalogStore (Zustand)
│   │   ├── services/                # apiClient, datasetService, nodeService, statsService, authService, userService
│   │   ├── types/                   # dataset.ts, map.ts, auth.ts
│   │   ├── utils/                   # geoUtils (Turf.js & KML parser), formatters
│   │   └── constants/demoGeojson/   # Fixture GeoJSON 6 dataset Indonesia
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── server/                          # Backend Express REST API
│   ├── src/
│   │   ├── controllers/             # authController, datasetController, nodeController, searchController, statsController, userController
│   │   ├── middleware/              # authMiddleware (JWT), errorHandler
│   │   ├── routes/                  # statsRoutes, searchRoutes, datasetRoutes, categoryRoutes, nodeRoutes, authRoutes, userRoutes
│   │   ├── fixtures/geojson/        # Realistic GeoJSON files for 6 demo layers
│   │   ├── config/                  # db (Prisma client), env config
│   │   ├── utils/                   # jwt, password (bcryptjs), responseFormatter
│   │   └── index.ts                 # Express server bootstrap & rate-limiting
│   ├── prisma/
│   │   ├── schema.prisma            # SQLite database schema (User, Dataset, NetworkNode, Category, Bookmark, DownloadHistory)
│   │   ├── seed.ts                  # Seeder script
│   │   └── dev.db                   # SQLite active database
│   └── package.json
│
├── docs/                            # Spesifikasi & Dokumentasi Arsitektur Lengkap
│   ├── PRD.md                       # Product Requirement Document
│   ├── ARCHITECTURE.md              # Software & State Architecture Specification
│   ├── API_INVENTORY.md             # Inventory Layanan OGC & REST
│   ├── API_DOCUMENTATION.md         # Dokumentasi Kontrak JSON API v1
│   ├── DATA_SOURCES.md              # Registri Sumber Data Spasial & Basemap
│   └── IMPLEMENTATION_STATUS.md     # Lembar Verifikasi Status Tahapan
│
├── .env.example
├── package.json                     # Root workspace runner
└── README.md
```

---

## 3. Persyaratan Sistem & Instalasi

### Prasyarat
- **Node.js**: Versi `>= 18.x` (Direkomendasikan Node.js v20+ atau v24.x).
- **npm**: Versi `>= 9.x` (Menggunakan npm workspaces).

### Langkah Instalasi Cepat

1. **Clone atau Buka Direktori Proyek**:
   ```bash
   cd "projek IMK"
   ```

2. **Instal Dependensi Workspace**:
   ```bash
   npm install
   ```

3. **Inisialisasi & Migrasi Database Lokal (Prisma SQLite)**:
   ```bash
   cd server
   npx prisma db push
   npx tsx prisma/seed.ts
   cd ..
   ```
   *Langkah ini membuat basis data `server/prisma/dev.db` dan mengisinya dengan 6 Kategori Tematik, 11 Simpul Jaringan, 6 Dataset Nasional, dan 1 Akun Pengguna Demo.*

---

## 4. Cara Menjalankan Aplikasi

### Opsi A: Menjalankan Bersamaan (Full-Stack Dev Mode)
Jalankan satu perintah dari root folder:
```bash
npm run dev
```
Perintah ini akan menyalakan:
- Backend REST API pada: `http://localhost:5000`
- Frontend React SPA pada: `http://localhost:5173`

### Opsi B: Menjalankan Secara Terpisah
- **Terminal 1 (Backend Server)**:
  ```bash
  npm run dev --workspace=server
  ```
- **Terminal 2 (Frontend Client)**:
  ```bash
  npm run dev --workspace=client
  ```

---

## 5. Konfigurasi Environment Variable

File `.env` di root dan masing-masing workspace telah dikonfigurasi secara default untuk lingkungan lokal:

### `server/.env`
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="<GENERATE_A_RANDOM_64_BYTE_BASE64_SECRET>"
CORS_ORIGIN="http://localhost:5173"
```

> `JWT_SECRET` wajib diisi dengan nilai acak minimal 32 karakter. Server
> menolak start jika kosong, terlalu pendek, atau masih memakai nilai default
> lama. Lihat `.env.example` untuk daftar variabel lengkap.

### `client/.env`
```env
VITE_API_URL="/api/v1"
```
*(Proxy otomatis telah dikonfigurasi di `client/vite.config.ts` untuk meneruskan request `/api` ke `http://localhost:5000`)*.

---

## 6. Akun Pengguna Demo

Aplikasi menyediakan akun pengguna awal yang telah terdaftar di database untuk menguji alur autentikasi dan pengunduhan **Restricted Dataset**:
- **Email**: `demo@inageoportal.go.id`
- **Kata Sandi**: `Password123!`
- **Nama**: Peneliti Geospasial Demo
- **Institusi**: Pusat Riset Geospasial BRIN

*(Tersedia tombol satu-klik **"Gunakan Akun Demo"** di halaman login).*

---

## 7. Cakupan Fitur & Alur Kerja yang Telah Selesai (100% Functional)

### Modul 1: Beranda & Global Search
- **Overview Statistics Asinkron**: Mengambil metrik total simpul, total dataset, total aktivitas unduhan, dan kategori tematik populer. Dilengkapi status loading, error retry, dan badge `DEMO`.
- **Autocomplete Global Search**: Pencarian cerdas instan dengan debouncing (250ms) yang mengindeks dataset, kategori, dan simpul jaringan.
- **Topik Populer & Quick Access**: Tombol pintas navigasi tematik yang mengarahkan langsung ke katalog data dengan parameter URL yang terenkapsulasi.

### Modul 2: Webmap Interactive Spatial Viewer
- **Inisialisasi Peta**: Leaflet berpusat di koordinat kepulauan Indonesia `[-2.5489, 118.0149]` pada zoom level 5.
- **Basemap Switcher**: Dukungan 4 basemap:
  1. *OpenStreetMap Standard*
  2. *Citra Satelit ESRI World Imagery*
  3. *OpenTopoMap (Topografi)*
  4. *CartoDB Dark Matter*
  *Mengganti basemap tidak mereset layer spasial yang sedang aktif.*
- **Active Layer Stack & Z-Index Sync**:
  - Tambah layer langsung dari katalog.
  - Sembunyikan/tampilkan layer (*visibility toggle*).
  - Slider transparansi *opacity* 0–100%.
  - Urutkan layer ke atas atau ke bawah (*reorder stack*) dengan kalkulasi z-index otomatis.
  - Hapus layer dari stack.
- **Interaktivitas Spasial (GetFeatureInfo & Vector Inspection)**:
  - Klik objek vektor menampilkan popup tooltip dan data atribut lengkap pada panel bawah.
  - Klik pada layer WMS mengirim request GetFeatureInfo sesuai standar OGC WMS 1.1.1/1.3.0 dengan penanganan koordinat fallback.
  - Opsi salin atribut fitur ke format JSON.
- **Alat Ukur Geospasial (Spatial Tools Turf.js)**:
  - *Ukur Jarak (Measure Distance)*: Menghitung jarak geodesic antar titik dalam satuan kilometer.
  - *Ukur Luas Poligon (Measure Area)*: Menghitung luas wilayah tertutup dalam satuan km² menggunakan formula Turf.js.
  - *Cari Koordinat (Coordinate Search & Fly-To)*: Input lintang (latitude) & bujur (longitude) dengan animasi transisi kamera.
  - *Unggah Data Lokal (Client-Side Vector Upload)*: Dukungan berkas `.geojson` dan `.kml`. Dilakukan validasi format dan ukuran (maks 10MB) tanpa mengirim data pribadi ke server.
- **Dukungan Deep Linking**:
  - `/webmap?addLayer=ds-batas-kabkot`
  - `/webmap?layerId=ds-jalan-nasional`
  Secara otomatis mengunduh metadata dan merender layer pada peta saat dibuka.

### Modul 3: Katalog & Unduh Data
- **Multi-Filter Sinkron dengan URL Query**:
  - Filter pencarian teks bebas (`q`).
  - Filter kategori tematik (`category`).
  - Filter instansi wali data (`node`).
  - Filter format (`shp`, `geojson`, `kml`, `wms`, `wfs`).
  - Filter tahun produksi (`year`).
  - Filter tipe akses (`public`, `restricted`).
  - Pengurutan data (`sort`: Terbaru, Populer, Alfabetis).
  - Paginasi data (`page`).
  *Filter tetap bertahan saat halaman dimuat ulang (refresh) atau dibagikan melalui URL.*
- **Halaman Detail Dataset (ISO 19115 Compliant)**:
  - Metadata lengkap: ID, Judul, Abstrak, Deskripsi, Wali Data, Tahun, Tanggal Terbit/Update, CRS, EPSG, Skala, BBOX Extent, Kontak.
  - Pratinjau spasial interaktif mini (*Mini Preview Map*).
  - OGC Web Services Copy Box: Menyalin endpoint WMS/WFS lengkap dengan nama layer dan instruksi koneksi QGIS.
- **Sistem Unduh Data 3 Kondisi**:
  - **Condition A (Public Dataset)**: Langsung mengunduh berkas format yang dipilih (SHP/GeoJSON/KML) tanpa hambatan.
  - **Condition B (Restricted Dataset)**: Memvalidasi sesi login. Jika pengguna belum masuk, sistem mengarahkan ke halaman login. Pengguna wajib mengisi formulir tujuan permohonan data (minimal 5 karakter). Permohonan divalidasi dan dicatat ke dalam audit trail riwayat unduhan di database.
  - **Condition C (Web Service Integration)**: Menyediakan URL GetMap / GetFeature serta panduan koneksi perangkat lunak desktop GIS.

### Modul 4: Direktori Simpul Jaringan
- Pengelompokan instansi: Kementerian/Lembaga, Pemerintah Provinsi, Pemerintah Kabupaten/Kota.
- Indikator status jaringan: `ONLINE`, `SYNCED`, `OFFLINE`, `UNKNOWN`.
- Pencarian dan filter status simpul.
- Halaman profil simpul (`/simpul/:nodeId`): Menampilkan wali data, kontak resmi, alamat, situs web, serta daftar seluruh dataset yang dipublikasikan oleh simpul tersebut.

### Modul 5: Autentikasi & Profil Pengguna
- Registrasi akun baru dengan hash kata sandi aman (bcryptjs).
- Login berbasis JSON Web Token (JWT) dengan durasi masa berlaku 7 hari.
- Protected route untuk halaman profil `/profile`.
- Riwayat unduhan dataset: Tabel audit pencatatan tanggal unduh, format, tujuan penggunaan, dan status permohonan.
- Sistem Bookmark: Menandai/menyimpan dataset favorit dari kartu katalog atau halaman detail, serta opsi buka langsung di webmap.

---

## 8. Verifikasi Pengujian & Tes Fungsional

Aplikasi telah dilengkapi unit test dan integration test menyeluruh menggunakan **Vitest** dan **Supertest**:

```bash
# Menjalankan seluruh pengujian (Server API + Client Store & Utilities)
npm test
```

### Hasil Uji Nyata (Test Suite Report):
1. **Server API Tests (`server/src/__tests__/api.test.ts`)**:
   - `GET /health` → 200 OK
   - `GET /api/v1/stats/overview` → 200 OK (Memverifikasi total dataset & kategori)
   - `GET /api/v1/search/suggest?q=batas` → 200 OK (Memverifikasi autocomplete)
   - `GET /api/v1/datasets?page=1&limit=5` → 200 OK (Memverifikasi paginasi)
   - `GET /api/v1/datasets/ds-batas-kabkot` → 200 OK (Memverifikasi relasi node & kategori)
   - `GET /api/v1/datasets/ds-batas-kabkot/geojson` → 200 OK (Validasi RFC 7946 FeatureCollection)
   - `POST /api/v1/datasets/ds-rawan-gempa/download` (Unauthenticated) → 401 Unauthorized (Menolak unduh restricted tanpa token)
   - `POST /api/v1/auth/login` → 200 OK (Otentikasi token berhasil)
   - `POST /api/v1/datasets/ds-rawan-gempa/download` (Authenticated + Purpose) → 200 OK (Permohonan disetujui & dicatat di database)
   *Hasil: 8 passed (100%).*

2. **Client Tests (`client/src/__tests__/workflow.test.ts`)**:
   - Kalkulasi jarak geodesik Turf.js (`calculateDistanceKm`)
   - Kalkulasi luas area poligon Turf.js (`calculatePolygonAreaSqKm`)
   - Validasi dan parsing format GeoJSON RFC 7946
   - Parser KML placemark ke GeoJSON FeatureCollection
   - Formatter tanggal Indonesia & angka ribuan
   - Manajemen `useMapStore`: pencegahan duplikasi layer, toggle visibility, update opacity, reorder stack z-index, switch basemap.
   - Manajemen `useCatalogStore`: query persistence, reset paginasi, multi-kategori toggle.
   *Hasil: 12 passed (100%).*

### Verifikasi Build Produksi
```bash
npm run build
```
- Server build (`tsc`) → Berhasil tanpa error tipe.
- Client build (`tsc && vite build`) → Berhasil membundel seluruh modul, aset CSS, dan chunk JS.

---

## 9. Registri 6 Dataset Demo Indonesia & Sumber Cadangan

| ID Dataset | Nama Dataset | Wali Data | EPSG | Tipe Akses | Format Tersedia | WMS Layer Name |
|---|---|---|---|---|---|---|
| `ds-batas-kabkot` | Batas Administrasi Kabupaten/Kota Indonesia | Badan Informasi Geospasial (BIG) | EPSG:4326 | Public | GeoJSON, SHP, KML, WMS | `tanahair:batas_kabupaten` |
| `ds-jalan-nasional` | Jaringan Jalan Nasional Lintas Pulau | Kementerian PUPR - Ditjen Bina Marga | EPSG:4326 | Public | GeoJSON, SHP, WMS | `pupr:jalan_nasional` |
| `ds-rawan-gempa` | Kawasan Rawan Bencana Gempa Bumi & Sesar Aktif | Badan Nasional Penanggulangan Bencana (BNPB) / PVMBG | EPSG:4326 | Restricted | GeoJSON, SHP, WMS, WFS | `bnpb:rawan_bencana_gempa` |
| `ds-tutupan-lahan` | Peta Penutupan Lahan Nasional (Land Cover) | Kementerian Lingkungan Hidup dan Kehutanan (KLHK) | EPSG:4326 | Public | GeoJSON, SHP, WMS | `klhk:tutupan_lahan_2023` |
| `ds-faskes` | Sebaran Titik Fasilitas Kesehatan & RS Rujukan | Kementerian Kesehatan RI | EPSG:4326 | Public | GeoJSON, KML, WFS | `kemenkes:titik_faskes` |
| `ds-rbi` | Peta Rupa Bumi Indonesia (RBI) Skala 1:25.000 / 1:50.000 | Badan Informasi Geospasial (BIG) | EPSG:32748 | Restricted | GeoJSON, SHP, WMS, WFS | `tanahair:rbi_topografi` |

*Catatan Ketahanan (Resilience)*: Seluruh dataset di atas memiliki salinan GeoJSON lokal valid yang disematkan langsung di `client/src/constants/demoGeojson/` dan `server/src/fixtures/geojson/`. Apabila server eksternal geoserver pemerintah sedang mengalami kendala CORS atau downtime, aplikasi secara otomatis menggunakan fixture lokal dengan penanda visual `DEMO`.

---

## 10. Panduan Integrasi Desain Figma (Handoff Guide)

Arsitektur aplikasi dirancang dengan pemisahan tegas antara **Presentation Layer (UI)** dan **Business Logic / State Layer**. Hal ini memastikan bahwa pada fase integrasi Figma berikutnya, desainer dan frontend engineer dapat mengganti markup presentasional tanpa perlu merombak logika aplikasi:

1. **Bagian yang Dapat Diganti dengan Desain Figma**:
   - `client/src/components/common/*`: Ganti styling `Badge`, `Modal`, dan `LoadingSpinner` sesuai Design System / UI Kit Figma.
   - `client/src/components/layout/*`: Ganti komponen `Navbar` dan `Footer` sesuai header/footer hasil rancangan Figma.
   - `client/src/components/home/*`: Ganti visual `HeroSection`, kartu statistik, dan card akses cepat. Komponen pencarian (`GlobalSearch.tsx`) cukup diadaptasi container visualnya.
   - `client/src/components/catalog/*`: Ganti tata letak filter bar, dropdown, dan kartu `DatasetCard.tsx`.
   - `client/src/components/nodes/*`: Ganti visual kartu `NodeCard.tsx`.
   - `client/src/components/webmap/*`: Ganti layout kontrol floating drawer, panel legenda, panel atribut fitur, dan tombol alat ukur dengan visual Figma.

2. **Bagian yang Tetap Dipertahankan (Do Not Modify Core Logic)**:
   - `client/src/store/*`: `useAuthStore`, `useMapStore`, `useCatalogStore` telah teruji mengelola state global, z-index stack, filter synchronization, dan otentikasi.
   - `client/src/services/*`: Seluruh fungsi integrasi API backend dan OGC services.
   - `client/src/types/*`: Kontrak antarmuka TypeScript ISO 19115 dan geo-entities.
   - `client/src/utils/*`: Logika kalkulasi geodesik Turf.js dan parser KML.
   - `client/src/routes/*`: Definisi path routing dan middleware proteksi rute.
   - `server/*`: Kontrak backend REST API Express dan Prisma ORM.

---

## 11. Lisensi & Atribusi Data

- Peta Dasar: &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) kontributor, Tiles &copy; [Esri](https://www.esri.com/), &copy; [OpenTopoMap](https://opentopomap.org/), &copy; [CARTO](https://carto.com/).
- Atribusi Geospasial Resmi: Badan Informasi Geospasial (BIG), Kementerian PUPR, BNPB, KLHK, Kementerian Kesehatan Republik Indonesia.
