# DEPLOYMENT READINESS REPORT
## INA-GEOPORTAL WEB APP REDESIGN v2.0

**Tanggal Audit:** 17 November 2026
**Target Deployment:** GitHub + Vercel
**Metode:** Audit statis menyeluruh terhadap repository aktual
**Status Akhir:** 🔴 **BELUM SIAP PRODUCTION** (beberapa blocker kritis)

> **Catatan:** Laporan ini dibuat tanpa menampilkan nilai secret apa pun. Seluruh `.env` hanya diperiksa nama key-nya, bukan nilainya.

---

## RINGKASAN EKSEKUTIF

| Kategori | Skor Kesiapan | Status |
|---|---|---|
| Repository & Version Control | 1/10 | 🔴 Blocker |
| Frontend (React + Vite) | 7/10 | 🟡 Perlu perbaikan |
| Backend (Express) | 3/10 | 🔴 Blocker |
| Database (SQLite + Prisma) | 2/10 | 🔴 Blocker |
| File Storage | 3/10 | 🔴 Blocker |
| Environment Variables | 3/10 | 🔴 Blocker |
| **TOTAL** | **≈ 3.2/10** | **🔴 BELUM SIAP** |

**Kesimpulan singkat:** Aplikasi secara fungsional berjalan baik di local (90/90 test lulus, build bersih), namun **belum layak deploy ke Vercel dalam kondisi saat ini**. Terdapat **6 blocker kritis** yang harus diselesaikan lebih dulu. Estimasi pekerjaan perbaikan: **2–4 hari kerja**.

---

## 1. KONDISI REPOSITORY

### 1.1 Struktur Folder

```
projek IMK/
├── client/                  # Frontend React SPA
├── server/                  # Backend Express REST API
├── docs/                    # 14 dokumen spesifikasi (+ figma-screens)
├── scripts/                 # 2 skrip inspeksi Figma (tidak dipakai produksi)
├── node_modules/            # ⚠️ ikut terdeteksi
├── .env                     # ⚠️ ADA, tidak terlindungi
├── .env.example
├── package.json             # npm workspaces root
├── package-lock.json
├── PHASE_11_BUGFIX_REPORT.md
├── PHASE_12_DOCUMENT_ACCESS_REPORT.md
├── PHASE_13_FIGMA_FIDELITY_REPORT.md
└── README.md
```

**Tipe project:** ✅ npm Monorepo dengan Workspaces (`server` + `client`) — konfigurasi sudah benar, `package-lock.json` tunggal di root.

### 1.2 Build Scripts

**Root `package.json`:**
```json
"scripts": {
  "dev":   "concurrently \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"",
  "build": "npm run build --workspace=server && npm run build --workspace=client",
  "lint":  "npm run lint --workspace=client",
  "test":  "npm run test --workspace=server && npm run test --workspace=client"
}
```

**Client:** `build: "tsc && vite build"` ✅
**Server:** `build: "tsc"`, `start: "node dist/index.js"` ✅

---

### 🔴 BLOCKER #1 — TIDAK ADA `.gitignore` SAMA SEKALI

Hasil pencarian `glob **/.gitignore` → **0 file ditemukan** di seluruh project.

**Konsekuensi jika `git init` + `git add .` dilakukan sekarang:**

| File/Folder | Ukuran | Risiko |
|---|---|---|
| `.env` (root) | 142 bytes | 🔴 **SECRET BOCOR** — DB URL, JWT secret, CORS origin |
| `client/.env` | 23 bytes | 🟡 Bocor API base URL |
| `server/.env` | 128 bytes | 🔴 **SECRET BOCOR** — duplikat secret backend |
| `server/prisma/dev.db` | 110 KB | 🔴 **DATA USER BOCOR** — email, bcrypt hash, bookmark, riwayat unduh |
| `server/prisma/server/prisma/dev.db` | 73 KB | 🔴 Duplikat DB nyasar |
| `node_modules/` (root + 2 workspace) | ~328 paket | 🔴 Repo membengkak ratusan MB |
| `client/dist/` | 4,08 MB | 🟡 Artefak build tidak perlu |
| `server/dist/` | 0,11 MB | 🟡 Artefak build tidak perlu |

**Tindakan wajib:** Buat `.gitignore` di root **SEBELUM** `git init`.

---

### 1.3 File yang Tidak Perlu Masuk GitHub

| Path | Alasan |
|---|---|
| `.env`, `client/.env`, `server/.env` | Secret |
| `node_modules/` (semua level) | Dependency, di-install ulang |
| `client/dist/`, `server/dist/` | Build artifact |
| `server/prisma/dev.db` | Database lokal berisi data user |
| `server/prisma/server/` | 🔴 **Stray artifact** — nested duplicate `prisma/server/prisma/dev.db` |
| `scripts/inspect-figma.mjs`, `scripts/deep-inspect.mjs` | Tooling Figma internal (bukan bagian aplikasi) |
| `*.log`, `npm-debug.log*` | Log |
| `.DS_Store`, `Thumbs.db` | OS metadata |
| `.vercel/`, `.turbo/`, `.vite/` | Tool cache |
| File coverage (`coverage/`) | Test artifact |

### 1.4 Temuan Tambahan Repository

- 🔴 **Tidak ada Git repository** — `git status` → `fatal: not a git repository`. Belum pernah di-init.
- 🟡 **Tidak ada folder `server/prisma/migrations/`** — Prisma memakai pola `db push`, bukan migration. Tidak bisa di-deploy reproducible.
- 🟡 **Tidak ada `vercel.json`** di mana pun.
- 🟡 **Duplikasi aset 2,44 MB** — `real_batas_kabupaten.json` ada di `client/src/constants/demoGeojson/` **dan** `server/src/fixtures/geojson/`. Ikut ter-bundle ke frontend.
- 🟡 **3 file laporan Phase** (11, 12, 13) di root — tidak masalah, tapi bisa dipindah ke `docs/`.

---

## 2. KESIAPAN FRONTEND

### ✅ Yang Sudah Baik

| Aspek | Status | Detail |
|---|---|---|
| Vite config | ✅ | `@vitejs/plugin-react`, port 5173, proxy `/api` → `localhost:5000` untuk dev |
| Build production | ✅ | `tsc && vite build` berhasil, output 4,08 MB, 2136 modul |
| React Router | ✅ | `BrowserRouter` + 16 route terdaftar lengkap |
| Protected route | ✅ | `/profile` dibungkus `ProtectedRoute`, redirect ke `/login` dengan `state.from` |
| API base URL | ✅ | `import.meta.env.VITE_API_URL \|\| '/api/v1'` — **tidak ada `localhost` hardcoded** |
| Leaflet CSS | ✅ | Diimpor di `main.tsx` (`import 'leaflet/dist/leaflet.css'`) — aman untuk bundling |
| Token handling | ✅ | Axios interceptor menambahkan `Authorization: Bearer` otomatis |
| Error interceptor | ✅ | Response `.data` di-unwrap konsisten |
| `localhost` di `client/src` | ✅ | **0 match** — bersih |

### 🟡 Temuan yang Perlu Perbaikan

| # | Temuan | Dampak |
|---|---|---|
| F1 | `client/public/` **tidak ada**, namun `index.html` memanggil `/logo.svg` | Favicon 404 di production |
| F2 | `index.html` masih memuat `<script src="https://accounts.google.com/gsi/client">` | Script GIS tidak terpakai pasca-Phase 13, menambah request eksternal + CSP risk |
| F3 | `index.html` memuat Leaflet CSS dari `unpkg.com` **DAN** `main.tsx` mengimpor `leaflet.css` lokal | Double-load, inkonsistensi versi, dependency pada CDN eksternal |
| F4 | `vite.config.ts` `proxy` hanya aktif di dev; production butuh `VITE_API_URL` absolut | Jika lupa set, frontend memanggil `/api/v1` relatif → 404 |
| F5 | Duplikasi GeoJSON 2,44 MB di `client/src/constants/demoGeojson/` | Bundle membengkak (JS chunk 3,28 MB) |
| F6 | Tidak ada `build` output chunking/splitting; JS utama 3,28 MB | Load awal lambat di mobile 3G/4G |
| F7 | `client/.env` berisi `VITE_API_URL` (23 bytes) | Perlu dipastikan bukan `localhost` — **terverifikasi: tidak mengandung `localhost`** ✅ |

---

## 3. KESIAPAN BACKEND

### ✅ Yang Sudah Baik

| Aspek | Status |
|---|---|
| Express 4.21 + TypeScript strict | ✅ |
| Struktur route modular (9 router) | ✅ |
| Health check `/health` | ✅ |
| Rate limiting (500 req / 15 menit) | ✅ |
| Central error handler | ✅ |
| JWT auth middleware + optional auth | ✅ |
| Zod validation pada auth | ✅ |
| bcrypt password hashing | ✅ |
| Path traversal protection pada download (`path.basename`) | ✅ |
| Token via query param untuk `<a download>` | ✅ |
| Download history tracking | ✅ |

### API Routes Terverifikasi

```
/api/v1/stats          → GET /overview
/api/v1/search         → GET /suggest
/api/v1/datasets       → GET /, GET /:id, GET /:id/geojson,
                         POST /:id/download, GET /:id/download-file,
                         GET /:id/live-status
/api/v1/documents      → GET /, GET /:id, GET /:id/download
/api/v1/categories     → GET /
/api/v1/nodes          → GET /, GET /:id
/api/v1/auth           → POST /register, POST /login, POST /google, GET /me
/api/v1/user           → GET /bookmarks, GET /downloads, POST/DELETE bookmark
```

### 🔴 BLOCKER #2 — Entry Point Tidak Kompatibel Vercel Functions

`server/src/index.ts`:
```ts
let server: any = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, ...);   // ← memanggil listen() saat import
}
export default app;
```

**Masalah:** Vercel Serverless Function **tidak boleh** memanggil `.listen()`. Handler harus di-export sebagai fungsi. Saat ini `app.listen()` akan dieksekusi saat modul di-import, menyebabkan error/timeout di Vercel.

**Selain itu, `__dirname` berbasis fixture path:**
```ts
// documentController.ts:116
const docsDir = path.join(__dirname, '../fixtures/documents');
// realGeospatialService.ts:215
const fixturesDir = path.join(__dirname, '../fixtures/geojson');
```
Pada Vercel, filesystem bersifat **read-only** kecuali `/tmp`. Path relatif ke `dist/` akan gagal karena folder `fixtures/` **tidak ikut ter-compile**.

### 🔴 BLOCKER #3 — Fixtures Tidak Ikut Build (Runtime Failure)

**Terverifikasi:**
```
server/dist/  → hanya berisi: config, controllers, middleware,
                 routes, services, utils, __tests__
server/dist/fixtures/  → TIDAK ADA
```

`tsc` tidak menyalin file non-`.ts`. Artinya:
- `npm run build` → sukses (TypeScript lolos)
- `npm start` (production) → **semua endpoint GeoJSON gagal** dengan error `"Berkas data fisik ... tidak ditemukan"`
- Semua unduhan dataset → 404
- Semua unduhan dokumen → 404

Ini adalah **latent production bug** yang tidak terdeteksi karena test berjalan lewat `tsx` (source langsung), bukan `node dist/`.

### 🟡 BLOCKER #4 — CORS Wildcard di Production

```ts
// server/src/index.ts
app.use(cors({ origin: '*', methods: [...], allowedHeaders: [...] }));
```

**Masalah:** Nilai `config.corsOrigin` (yang dibaca dari env `CORS_ORIGIN`) **didefinisikan tapi tidak pernah digunakan**. CORS di-hardcode `*`.

**Dampak:** Siapa pun bisa memanggil API dari domain mana pun. Untuk API publik ini sebagian dapat diterima, namun kombinasi dengan JWT via `localStorage` memperbesar risiko penyalahgunaan.

### 🟡 BLOCKER #5 — Rate Limiter In-Memory

`express-rate-limit` default memakai store memori. Pada Vercel serverless, setiap instance punya memori sendiri → **rate limit tidak efektif** (tiap request bisa kena instance berbeda). Bukan blocker fungsional, tapi kontrol keamanan tidak berjalan sebagaimana niat.

### 🟡 Temuan Lain Backend

| # | Temuan | Lokasi | Dampak |
|---|---|---|---|
| B1 | Pesan error masih menyebut "akun Google" | `datasetController.ts:293`, `documentController.ts:170` | Inkonsistensi dengan Phase 13 (kontradiksi UI) |
| B2 | `fixtures/documents/` **KOSONG** | `server/src/fixtures/documents/` | Semua 8 dokumen standar → `FILE_NOT_FOUND` (404) permanen |
| B3 | Hardcoded JWT fallback | `config/index.ts:6` | Lihat bagian 6 |
| B4 | `express.json({ limit: '10mb' })` | `index.ts` | Risiko memory di serverless (batas Vercel 4,5 MB body) |
| B5 | `morgan('dev')` aktif di production | `index.ts` | Log verbose, tidak perlu |
| B6 | Tidak ada `helmet` | `index.ts` | Header keamanan HTTP belum diset |
| B7 | Tidak ada handling `trust proxy` | `index.ts` | Rate limit & IP detection salah di belakang Vercel proxy |

---

## 4. KONDISI DATABASE

### 4.1 Konfigurasi Saat Ini

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

```
DATABASE_URL = "file:./dev.db"   (root .env & server/.env)
```

| Aspek | Status |
|---|---|
| Model | 6: `User`, `Category`, `NetworkNode`, `Dataset`, `Bookmark`, `DownloadHistory` |
| Relasi & cascade | ✅ Lengkap (`onDelete: Cascade` / `SetNull`) |
| Unique constraint | ✅ `User.email`, `User.googleId`, `Bookmark(userId, datasetId)` |
| Migration folder | 🔴 **TIDAK ADA** — pakai `prisma db push` |
| Seed | ✅ `prisma/seed.ts` (504 baris), idempotent via `upsert` |
| DB file aktif | `server/prisma/dev.db` (110 KB) |

### 4.2 Isi Database (dari audit file)

- 6 kategori
- 11 simpul jaringan (5 KL, 4 provinsi, 2 kab/kota)
- 6 dataset
- 1 akun demo (`demo@inageoportal.gov.go.id`-style) + bookmark + riwayat unduh

### 🔴 BLOCKER #6 — SQLite Tidak Kompatibel Vercel

| Karakteristik | SQLite | Kebutuhan Vercel |
|---|---|---|
| Penyimpanan | File lokal | Ephemeral & read-only (kecuali `/tmp`) |
| Persistensi | Permanen di disk | **Hilang setiap cold start** |
| Multi-instance | Single writer | Perlu konkurensi |
| Connection pooling | Tidak ada | Diperlukan |

**Kesimpulan:** SQLite **wajib** diganti PostgreSQL sebelum deploy. Data pada `dev.db` akan hilang total jika dipaksa deploy.

### 4.3 ⚠️ Anomali Data — `provider` Default Salah

```prisma
provider  String  @default("google")   // ← nilai default
```

Fungsi `register()` pada `authController.ts` **tidak mengeset** field `provider`. Akibatnya:

- User yang mendaftar via **email/password** akan tersimpan dengan `provider = "google"`
- `UserProfilePage.tsx` menampilkan badge **"Google Verified"** untuk user email/password
- Ini bug integritas data, bukan sekadar kosmetik

**Dampak migrasi:** Saat pindah ke Postgres, semua baris existing akan membawa nilai `provider` yang salah. Perlu koreksi data (`UPDATE ... SET provider='local' WHERE password IS NOT NULL`).

### 4.4 Kebutuhan Migrasi ke PostgreSQL — **TIDAK DILAKUKAN SEKARANG**

Sesuai batasan, migrasi **tidak dieksekusi**. Berikut rencana yang disiapkan:

| Langkah | Detail |
|---|---|
| 1 | Ubah `provider = "sqlite"` → `"postgresql"` di `schema.prisma` |
| 2 | Tambah `binaryTargets = ["native", "rhel-openssl-3.0.x"]` pada generator |
| 3 | Set `DATABASE_URL` ke connection string Postgres (dengan `?sslmode=require`) |
| 4 | Buat baseline migration: `prisma migrate dev --name init` (lokal, terhadap Postgres dev) |
| 5 | Deploy: `prisma migrate deploy` (bukan `db push`) |
| 6 | Seed: `npm run prisma:seed` (perlu `tsx` tersedia, atau kompilasi seed) |

### 4.5 Jaminan Retensi Data User

| Data | Dapat Dipertahankan? | Cara |
|---|---|---|
| Akun user (email, nama, institusi) | ✅ Ya | Ekspor `User` table → upsert ke Postgres |
| Password hash (bcrypt) | ✅ Ya — **hash portable** | Copy string hash apa adanya; bcryptjs kompatibel lintas DB |
| Bookmark | ✅ Ya | Copy `Bookmark` dengan `userId` + `datasetId` |
| Riwayat unduh | ✅ Ya | Copy `DownloadHistory` |
| Google metadata (`googleId`, `avatarUrl`) | ✅ Ya | Field nullable, aman |
| Role & `emailVerified` | ✅ Ya | Copy apa adanya |

**Catatan penting:** `User.id` bertipe `String @default(uuid())` — **bukan auto-increment**. Ini kabar baik: ID stabil dan bisa dipindah tanpa remapping relasi.

**Skrip ekspor yang disarankan (belum dijalankan):**
```bash
# 1. Ekspor dari SQLite
npx prisma db execute --file export.sql --schema=prisma/schema.prisma
# 2. Transformasi tipe (SQLite DateTime → Postgres timestamptz)
# 3. Import ke Postgres via psql COPY
```

**Jangan jalankan `prisma db push --force-reset`** pada database tujuan — akan menghapus data.

---

## 5. KONDISI FILE STORAGE

### 5.1 Inventaris Storage Aktual

| Lokasi | Isi | Ukuran | Dipakai Untuk |
|---|---|---|---|
| `server/src/fixtures/geojson/` | 9 file GeoJSON | **2,79 MB** | Sumber data layer peta & unduhan dataset |
| `server/src/fixtures/documents/` | **KOSONG** | 0 B | Unduhan dokumen PDF |
| `client/src/assets/figma/` | 10 PNG | 1,37 MB | Aset visual UI (ter-bundle Vite) |
| `client/src/constants/demoGeojson/` | 10 JSON | 2,79 MB | **Duplikat** fixture server |

**File GeoJSON terbesar:** `real_batas_kabupaten.json` = **2.562.034 bytes (2,44 MB)** — berisi 541 poligon kab/kota.

### 🔴 BLOCKER #7 — Ketergantungan Filesystem Lokal

Semua akses file memakai `fs.existsSync` / `fs.readFileSync` / `fs.createReadStream` dengan `path.join(__dirname, '../fixtures/...')`.

**Pada Vercel:**
- Filesystem **read-only** — tidak bisa menulis
- `dist/fixtures/` **tidak ada** (lihat Blocker #3)
- `/tmp` hanya 512 MB dan **dihapus** setiap cold start
- Batas ukuran bundle function: **250 MB** (uncompressed)

**Dampak nyata di production:** Peta akan kosong, semua unduhan gagal.

### 5.2 Solusi Storage Production yang Direkomendasikan

| Jenis File | Ukuran | Rekomendasi | Alasan |
|---|---|---|---|
| **GeoJSON** (2,79 MB, 9 file) | Kecil, statis, jarang berubah | **Vercel Blob** atau **Cloudflare R2** | Gratis di tier awal; CDN; bisa di-cache agresif |
| **Dokumen PDF** (saat ini kosong) | Menengah, statis | **Cloudflare R2** / **Supabase Storage** / **Vercel Blob** | Perlu write API untuk upload admin |
| **File dataset unduhan** (SHP/KML/GeoTIFF) | Besar (puluhan MB–GB) | **Cloudflare R2** | Egress gratis ke Cloudflare; S3-compatible |
| **Aset UI** (PNG di `client/src/assets`) | 1,37 MB | **Tetap di bundle Vite** | Sudah optimal, tidak perlu storage eksternal |

**Rekomendasi utama untuk fase awal (biaya rendah):**

```
GeoJSON statis  → Vercel Blob (1 GB gratis)  → di-fetch via HTTPS, cache 1 tahun
PDF dokumen     → Supabase Storage (1 GB gratis) / Cloudflare R2 (10 GB gratis)
Dataset besar   → Cloudflare R2 (10 GB gratis, egress gratis)
```

**Perubahan kode yang diperlukan (belum dilakukan):**
- `realGeospatialService` membaca dari URL HTTPS, bukan `fs`
- `documentController` memakai `res.redirect()` ke signed URL, bukan `fs.createReadStream`
- Tambah lapisan cache (in-memory atau Redis) untuk GeoJSON 2,44 MB agar tidak fetch ulang tiap request

---

## 6. ENVIRONMENT VARIABLES

### 6.1 Daftar Lengkap Variabel yang Diperlukan

#### Backend (`server/`)

| Variable | Wajib Produksi | Contoh Placeholder | Keterangan |
|---|---|---|---|
| `NODE_ENV` | ✅ | `production` | Mode runtime |
| `PORT` | 🟡 | `5000` | Diabaikan Vercel (pakai `PORT` internal) |
| `DATABASE_URL` | ✅ | `postgresql://user:password@host:5432/db?sslmode=require` | Connection string Postgres |
| `JWT_SECRET` | ✅ | `<64-byte random string>` | **HARUS diganti** |
| `CORS_ORIGIN` | ✅ | `https://ina-geoportal.vercel.app` | Saat ini **diabaikan kode** |
| `GOOGLE_CLIENT_ID` | 🟡 | `xxx.apps.googleusercontent.com` | Opsional — hanya untuk `/auth/google` |
| `GOOGLE_CLIENT_SECRET` | 🟡 | `<secret>` | Opsional (backend tidak memakainya saat ini) |

#### Frontend (`client/`)

| Variable | Wajib Produksi | Contoh Placeholder |
|---|---|---|
| `VITE_API_URL` | ✅ | `https://ina-geoportal-api.vercel.app/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | 🟡 | `xxx.apps.googleusercontent.com` (tidak dipakai UI pasca-Phase 13) |

#### Storage (baru — belum ada)

| Variable | Wajib | Contoh Placeholder |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | ✅ (jika Vercel Blob) | `<vercel-blob-token>` |
| `R2_ACCOUNT_ID` | Alternatif | `<account-id>` |
| `R2_ACCESS_KEY_ID` | Alternatif | `<key-id>` |
| `R2_SECRET_ACCESS_KEY` | Alternatif | `<secret>` |
| `R2_BUCKET_NAME` | Alternatif | `ina-geoportal-assets` |

### 6.2 Audit Secret

| Temuan | Tingkat | Detail |
|---|---|---|
| 🔴 **JWT secret hardcoded sebagai fallback** | **KRITIS** | `config/index.ts` baris 6 memiliki nilai default literal 39 karakter. Jika env tidak diset, token dapat dipalsukan oleh siapa pun yang membaca source. |
| 🔴 **`.env.example` membocorkan secret yang sama** | **KRITIS** | Nilai `JWT_SECRET` pada `.env.example` **identik** dengan fallback hardcoded di source. Artinya "placeholder" bukan placeholder. |
| 🟡 **JWT secret aktif = nilai default** | **TINGGI** | Panjang `JWT_SECRET` di `.env` root = 39 karakter, konsisten dengan string hardcoded. Tidak ada bukti rotasi. |
| 🟡 **Duplikasi `.env`** | **SEDANG** | Ada 3 file `.env` (root, `client/`, `server/`) dengan key berbeda. Root & `server/` berisi key backend yang sama (duplikat). |
| ✅ **Tidak ada secret di kode controller** | **BAIK** | Tidak ditemukan API key / password literal di `controllers/`, `services/`, `routes/`. |
| ✅ **`.env.example` tidak memuat nilai nyata selain JWT** | **CUKUP** | Hanya `JWT_SECRET` yang bermasalah. |

### 6.3 Kepatuhan `.env.example`

| File | Status | Catatan |
|---|---|---|
| `server/.env.example` | 🟡 | Struktur baik, **tapi `JWT_SECRET` bukan placeholder** |
| `client/.env.example` | ✅ | Placeholder valid |
| `.env.example` (root) | 🟡 | Berisi key backend + frontend sekaligus (membingungkan); `JWT_SECRET` sama bermasalahnya |

### 6.4 Kebutuhan Tindakan

1. Hapus fallback hardcoded JWT; **fail-fast** jika `JWT_SECRET` absen.
2. Ganti nilai di `.env.example` menjadi `<generate-with-openssl-rand-base64-64>`.
3. Rotasi `JWT_SECRET` production → semua sesi lama invalidasi (dapat diterima saat launch).
4. Satukan `.env.example` di root; hapus duplikasi `client/.env.example` & `server/.env.example` **atau** dokumentasikan dengan jelas.

---

## 7. ARSITEKTUR DEPLOYMENT YANG DIREKOMENDASIKAN

### 7.1 Opsi A — Vercel + Neon (Direkomendasikan untuk Fase Awal)

```
┌──────────────────────────────────────────────────────────────┐
│                     GitHub Repository                         │
│                  (monorepo: client/ + server/)                │
└───────────────────────────┬──────────────────────────────────┘
                            │ push
                ┌───────────▼───────────┐
                │        Vercel         │
                ├───────────────────────┤
                │  Project 1: client    │  Static SPA (Vite)
                │  → ina-geoportal.app  │  CDN global
                ├───────────────────────┤
                │  Project 2: server    │  Serverless Functions
                │  → api.ina-geoportal  │  api/index.ts → Express
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Neon Postgres│   │ Vercel Blob   │   │ Cloudflare R2 │
│  0,5 GB free  │   │ 1 GB free     │   │ 10 GB free    │
│  GeoJSON ref  │   │ GeoJSON + PDF │   │ Dataset besar │
└───────────────┘   └───────────────┘   └───────────────┘
```

**Kelebihan:**
- Biaya awal **$0** (semua dalam free tier)
- Satu platform (Vercel) untuk frontend + backend
- Auto-deploy dari GitHub, preview per PR
- Neon: connection pooling built-in (penting untuk serverless)

**Kekurangan:**
- Cold start serverless (~200–800 ms)
- Vercel Hobby: limit 100 GB bandwidth/bulan, 100 jam function execution
- Butuh refactor entry point backend

### 7.2 Opsi B — Vercel + Railway/Fly.io (Backend Persistent)

```
Vercel (client)  →  Railway (Express persistent)  →  Neon Postgres
                                                 →  Cloudflare R2
```

**Kelebihan:** Tidak perlu refactor serverless; `fs` tetap bisa dipakai dengan volume; rate limiter in-memory berfungsi.
**Kekurangan:** Biaya ~$5/bulan untuk Railway; dua dashboard.

### 7.3 Opsi C — Full Vercel dengan `vercel.json` Monorepo (Paling Sederhana)

Menggunakan satu project Vercel dengan rewrites:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Kelebihan:** Satu project, satu domain, tidak ada CORS (same-origin), `VITE_API_URL=/api/v1`.
**Kekurangan:** `api/index.ts` tetap harus ada sebagai bridge Express → serverless.

### 7.4 Rekomendasi Final

> **Pilih Opsi C** (single Vercel project, same-origin) untuk peluncuran pertama.
> Alasan: menghilangkan seluruh masalah CORS, satu domain, `VITE_API_URL` tidak perlu dikonfigurasi, dan **biaya $0**. Jika cold-start jadi masalah, naik ke Opsi B.

**Komponen layanan:**

| Komponen | Layanan | Tier | Alasan |
|---|---|---|---|
| Frontend | Vercel | Hobby | Gratis, CDN, auto-deploy |
| Backend | Vercel Functions | Hobby | Satu platform, same-origin |
| Database | **Neon** Postgres | Free (0,5 GB) | Serverless-native, connection pooling, gratis |
| GeoJSON + PDF | **Vercel Blob** | Free (1 GB) | Integrasi native, CDN |
| Dataset besar | **Cloudflare R2** | Free (10 GB) | Egress gratis |
| DNS | Cloudflare | Free | DDoS protection, cache |
| Monitoring | Vercel Analytics | Hobby | Built-in |

---

## 8. RISIKO DEPLOYMENT

| # | Risiko | Probabilitas | Dampak | Mitigasi |
|---|---|---|---|---|
| R1 | **Secret `.env` ter-commit ke GitHub** | 🔴 **Sangat Tinggi** (tanpa `.gitignore`) | Kritis — DB & JWT bocor | Buat `.gitignore` **sebelum** `git init` |
| R2 | **Semua GeoJSON gagal load di production** (fixtures tidak di `dist/`) | 🔴 **Pasti** | Peta kosong, semua unduhan 404 | Pindah ke object storage + refactor service |
| R3 | **Database hilang setiap cold start** (SQLite di Vercel) | 🔴 **Pasti** | Semua user & riwayat hilang | Migrasi ke Postgres |
| R4 | **JWT dapat dipalsukan** (secret default diketahui publik) | 🔴 Tinggi | Full account takeover | Rotasi secret + hapus fallback |
| R5 | **Server crash saat cold start** (`app.listen()` di serverless) | 🔴 Pasti | API tidak merespons | Refactor entry point |
| R6 | **Favicon 404** | 🟡 Rendah | Kosmetik | Tambah `client/public/logo.svg` |
| R7 | **Preview deployment memanggil DB production** | 🟡 Sedang | Data testing bercampur | Pisah `DATABASE_URL` per environment |
| R8 | **Rate limit tidak efektif** | 🟡 Sedang | Abuse API | Pindah ke Vercel WAF / Upstash Redis |
| R9 | **Bundle JS 3,28 MB** | 🟡 Sedang | Load lambat mobile | Code splitting + hapus duplikasi GeoJSON |
| R10 | **Dokumen PDF selalu 404** | 🟢 Rendah (sudah diketahui) | Fitur unduh dokumen tidak berfungsi | Upload PDF ke storage saat tersedia |
| R11 | **`provider` user salah label** | 🟡 Sedang | Badge "Google Verified" salah | Koreksi data saat migrasi |
| R12 | **Tidak ada rollback plan** (belum ada Git history) | 🟡 Sedang | Sulit revert | Tag rilis di GitHub |

---

## 9. DAFTAR PERUBAHAN YANG DIPERLUKAN

> Semua item di bawah **BELUM dikerjakan** (audit-only). Diurutkan berdasarkan prioritas.

### 🔴 P0 — Blocker (wajib sebelum deploy)

| # | Perubahan | File | Estimasi |
|---|---|---|---|
| 1 | Buat `.gitignore` root (node_modules, .env, *.db, dist, .vercel) | `.gitignore` (baru) | 10 menit |
| 2 | Hapus fallback JWT hardcoded + fail-fast | `server/src/config/index.ts` | 15 menit |
| 3 | Ganti `JWT_SECRET` di `.env.example` jadi placeholder | `.env.example`, `server/.env.example` | 5 menit |
| 4 | Refactor entry point serverless | `server/src/index.ts` + `api/index.ts` (baru) | 2 jam |
| 5 | Tambah `vercel.json` (rewrites SPA + API) | `vercel.json` (baru) | 30 menit |
| 6 | Migrasi Prisma ke PostgreSQL | `schema.prisma` | 1 jam |
| 7 | Buat baseline migration Prisma | `prisma/migrations/` | 30 menit |
| 8 | Refactor storage: `fs` → HTTP/object storage | `realGeospatialService.ts`, `documentController.ts` | 6 jam |
| 9 | Hapus folder stray | `server/prisma/server/` | 2 menit |

### 🟡 P1 — Penting (sebelum launch publik)

| # | Perubahan | File | Estimasi |
|---|---|---|---|
| 10 | Gunakan `config.corsOrigin` (atau hapus CORS — same-origin) | `server/src/index.ts` | 15 menit |
| 11 | Perbaiki `provider` default `"google"` → `"local"` | `schema.prisma`, `authController.ts` | 30 menit |
| 12 | Hapus script Google GIS dari `index.html` | `client/index.html` | 5 menit |
| 13 | Hapus Leaflet CSS CDN (sudah ada di bundle) | `client/index.html` | 5 menit |
| 14 | Tambah `client/public/logo.svg` | `client/public/` (baru) | 10 menit |
| 15 | Bersihkan teks "akun Google" di pesan error | `datasetController.ts:293`, `documentController.ts:170` | 10 menit |
| 16 | Tambah `helmet` + `app.set('trust proxy', 1)` | `server/src/index.ts` | 20 menit |
| 17 | Matikan `morgan` di production | `server/src/index.ts` | 5 menit |
| 18 | Hapus duplikasi GeoJSON di client bundle | `client/src/constants/demoGeojson/` | 30 menit |
| 19 | Code splitting (`manualChunks`) untuk Leaflet/Turf | `client/vite.config.ts` | 1 jam |

### 🟢 P2 — Peningkatan (pasca-launch)

| # | Perubahan | Estimasi |
|---|---|---|
| 20 | Rate limiter ke Upstash Redis | 2 jam |
| 21 | Upload 8 dokumen PDF ke storage | menunggu konten |
| 22 | Siapkan test DB terpisah (Postgres CI) | 2 jam |
| 23 | Health check mendalam (`/health` cek DB + storage) | 1 jam |
| 24 | Sentry / error monitoring | 1 jam |
| 25 | Pindahkan laporan Phase ke `docs/` | 5 menit |
| 26 | Hapus `.env.example` duplikat (konsolidasi) | 15 menit |

**Total estimasi P0: ~10 jam · P0+P1: ~16 jam (≈ 2–4 hari kerja)**

---

## 10. ESTIMASI KOMPONEN LAYANAN DAN POTENSI BIAYA

### 10.1 Fase Awal (Launch) — Target $0/bulan

| Layanan | Tier | Batas Free | Estimasi Pemakaian | Biaya |
|---|---|---|---|---|
| **Vercel** (hosting + functions) | Hobby | 100 GB bandwidth, 100 jam function | ~5 GB, ~10 jam | **$0** |
| **Neon Postgres** | Free | 0,5 GB storage, 1 project | ~50 MB | **$0** |
| **Vercel Blob** | Free | 1 GB storage, 10 GB transfer | ~3 MB | **$0** |
| **Cloudflare R2** | Free | 10 GB storage, egress gratis | ~100 MB | **$0** |
| **Cloudflare DNS** | Free | Unlimited | — | **$0** |
| **GitHub** | Free | Unlimited public, 2000 min CI | — | **$0** |
| **Domain** (opsional) | — | `.vercel.app` gratis | — | **$0** (`ina-geoportal.vercel.app`) |
| **TOTAL** | | | | **$0/bulan** |

### 10.2 Fase Pertumbuhan (1.000–10.000 user/bulan)

| Layanan | Tier | Biaya |
|---|---|---|
| Vercel Pro | 1 seat | $20/bulan |
| Neon Scale | 10 GB | $19/bulan |
| Vercel Blob | 100 GB | ~$5/bulan |
| Cloudflare R2 | 100 GB | ~$1,50/bulan |
| Domain kustom | `.go.id` | ~Rp 250.000/tahun |
| **TOTAL** | | **~$45/bulan (≈ Rp 720.000)** |

### 10.3 Catatan Biaya Kritis

- ⚠️ **Bandwidth adalah biaya terbesar.** GeoJSON `real_batas_kabupaten.json` 2,44 MB — jika 1.000 user membuka peta, itu 2,4 GB transfer. **Wajib** aktifkan cache `Cache-Control: public, max-age=31536000, immutable` dan compresi gzip/brotli.
- ⚠️ **Egress Cloudflare R2 gratis** — ini alasan utama memilih R2 untuk file besar.
- ⚠️ **Vercel Function duration**: jika request lambat (GeoJSON 2,44 MB diparse tiap request), bisa menghabiskan kuota 100 jam. **Wajib** cache in-memory / Redis.

---

## 11. URUTAN DEPLOYMENT

### Tahap 1 — Persiapan Lokal (Hari 1)

```
1.1  Buat .gitignore root
1.2  Hapus folder stray server/prisma/server/
1.3  Bersihkan teks "akun Google" yang tersisa
1.4  Hapus Google GIS script + Leaflet CDN dari index.html
1.5  Tambah client/public/logo.svg
1.6  Verifikasi: npm test (harus tetap 90/90) + npm run build
```

### Tahap 2 — Refactor untuk Vercel (Hari 1–2)

```
2.1  Buat api/index.ts (bridge Express → serverless)
2.2  Modifikasi index.ts: jangan listen() saat diimport
2.3  Buat vercel.json (rewrites + output dir)
2.4  Perbaiki config JWT (fail-fast, tanpa fallback)
2.5  Gunakan config.corsOrigin atau hapus CORS
```

### Tahap 3 — Database PostgreSQL (Hari 2)

```
3.1  Buat project Neon (free tier) — JANGAN sentuh dev.db
3.2  Ubah schema.prisma: provider = "postgresql"
3.3  Tambah binaryTargets = ["native", "rhel-openssl-3.0.x"]
3.4  npx prisma migrate dev --name init  (terhadap Neon dev branch)
3.5  Ekspor data SQLite → transform → import ke Neon
      • User (pertahankan bcrypt hash apa adanya)
      • Category, NetworkNode, Dataset
      • Bookmark, DownloadHistory
3.6  Koreksi: UPDATE "User" SET provider='local' WHERE password IS NOT NULL
3.7  Verifikasi: jumlah user/bookmark/history sebelum vs sesudah
```

### Tahap 4 — Object Storage (Hari 3)

```
4.1  Upload 9 GeoJSON ke Vercel Blob / R2
4.2  Refactor realGeospatialService: fs → fetch(HTTPS) + cache
4.3  Refactor documentController: fs → res.redirect(signedUrl)
4.4  Set Cache-Control immutable pada objek statis
4.5  Verifikasi semua endpoint GeoJSON & download
```

### Tahap 5 — GitHub (Hari 3)

```
5.1  git init
5.2  git add .  → PERIKSA: .env, *.db, node_modules TIDAK ter-stage
5.3  git commit -m "chore: initial commit — Ina-Geoportal v2.0"
5.4  Buat repo GitHub (private)
5.5  git remote add origin ... && git push -u origin main
5.6  Buat branch develop + branch protection rules
5.7  Verifikasi tidak ada secret: git log --all --full-history -- .env
```

### Tahap 6 — Vercel Preview (Hari 4)

```
6.1  Import repo ke Vercel
6.2  Root Directory: .  (monorepo root)
6.3  Build Command: npm run build
6.4  Output: client/dist
6.5  Set env vars (Preview scope):
       DATABASE_URL      → Neon branch "preview"
       JWT_SECRET        → secret baru (Preview-only)
       NODE_ENV          → production
       BLOB_READ_WRITE_TOKEN
6.6  Deploy → dapat URL preview
6.7  Uji: login demo, buka peta, unduh GeoJSON, cek profil
6.8  Uji SPA routing: akses langsung /katalog/xxx (tidak boleh 404)
6.9  Uji CORS / same-origin
```

### Tahap 7 — Production (Hari 4)

```
7.1  Neon: buat production branch, jalankan migrate deploy
7.2  Seed production: npm run prisma:seed (kategori, simpul, dataset, demo user)
7.3  Set env vars (Production scope):
       DATABASE_URL  → Neon production
       JWT_SECRET    → secret baru, 64 byte random
7.4  Merge develop → main (trigger production deploy)
7.5  Verifikasi smoke test lengkap:
       ✓ 16 route dapat diakses
       ✓ Login email/password berfungsi
       ✓ Registrasi akun baru berfungsi
       ✓ Login demo 1-klik berfungsi
       ✓ Peta Leaflet render + 4 basemap
       ✓ Unduhan GeoJSON berhasil
       ✓ Bookmark tersimpan
       ✓ Riwayat unduh tercatat
       ✓ Redirect /profile saat belum login
7.6  Pasang custom domain (opsional)
7.7  Aktifkan Vercel Analytics
7.8  git tag v2.0.0 && git push --tags
```

### Tahap 8 — Pasca Launch

```
8.1  Monitor function duration & error rate (24 jam pertama)
8.2  Verifikasi cold start < 1 detik
8.3  Cek Neon connection count (tidak boleh habis)
8.4  Dokumentasikan rollback: vercel rollback <deployment-id>
```

---

## 12. STATUS KESIAPAN LAUNCHING

### 12.1 Matriks Kesiapan per Komponen

| Komponen | Siap? | Blocker |
|---|---|---|
| Kode aplikasi (fitur) | ✅ **SIAP** | 90/90 test lulus, build bersih, Phase 11–13 utuh |
| Struktur monorepo | ✅ **SIAP** | npm workspaces benar |
| Frontend build | ✅ **SIAP** | `tsc && vite build` sukses |
| React Router | ✅ **SIAP** | 16 route + protected route |
| API base URL | ✅ **SIAP** | Tidak ada localhost hardcoded |
| **Version control** | 🔴 **TIDAK SIAP** | Tidak ada git, tidak ada `.gitignore` |
| **Backend serverless** | 🔴 **TIDAK SIAP** | `app.listen()` di entry point |
| **Database** | 🔴 **TIDAK SIAP** | SQLite, tidak ada migration |
| **File storage** | 🔴 **TIDAK SIAP** | `fs` + fixtures tidak ikut build |
| **Secret management** | 🔴 **TIDAK SIAP** | JWT hardcoded + `.env` tidak terlindungi |
| CORS | 🟡 **PERLU PERBAIKAN** | Wildcard, config diabaikan |
| Aset statis (favicon) | 🟡 **PERLU PERBAIKAN** | `logo.svg` hilang |
| Performa bundle | 🟡 **PERLU PERBAIKAN** | 3,28 MB tanpa splitting |

### 12.2 Verdict

> ## 🔴 **BELUM SIAP LAUNCHING**
>
> Aplikasi **layak secara fungsional** — 90/90 test lulus, build bersih, seluruh fitur Phase 11/12/13 berjalan di local. Namun **7 blocker kritis** membuat deployment ke Vercel saat ini akan **gagal secara teknis** (bukan sekadar kurang optimal):
>
> 1. `.env` akan ter-commit → secret bocor permanen di Git history
> 2. Server crash saat cold start (`app.listen()`)
> 3. Database hilang setiap request (SQLite ephemeral)
> 4. Semua GeoJSON 404 (fixtures tidak di `dist/`)
> 5. Semua unduhan gagal (filesystem read-only)
> 6. JWT dapat dipalsukan (secret default publik)
> 7. SPA route 404 pada direct access (tidak ada `vercel.json`)

### 12.3 Estimasi Waktu Menuju Siap Launch

| Fase | Durasi | Hasil |
|---|---|---|
| P0 — Fix blocker | 2 hari | Deploy berhasil secara teknis |
| P1 — Perbaikan penting | 1 hari | Aman untuk publik |
| P2 — Peningkatan | 1 hari | Optimal |
| **Total** | **3–4 hari kerja** | **Siap production** |

### 12.4 Predikat Kesiapan

| Tahap | Predikat |
|---|---|
| **Saat ini** | 🔴 **Belum Siap** — 3,2/10 |
| Setelah P0 selesai | 🟡 **Siap Teknis** — dapat deploy, belum aman publik |
| Setelah P0 + P1 | 🟢 **Siap Production** — aman untuk peluncuran |
| Setelah P0 + P1 + P2 | 🟢 **Siap Skala** — optimal untuk pertumbuhan |

---

## LAMPIRAN A — Ringkasan Blocker Kritis

| ID | Blocker | File Terdampak | Dampak Jika Tidak Diperbaiki |
|---|---|---|---|
| B1 | Tidak ada `.gitignore` | root | Secret & database bocor permanen |
| B2 | Entry point memanggil `listen()` | `server/src/index.ts` | Server crash di Vercel |
| B3 | Fixtures tidak ikut `dist/` | `tsc` config | Peta kosong, unduhan 404 |
| B4 | CORS wildcard, config diabaikan | `server/src/index.ts` | Risiko keamanan |
| B5 | Rate limiter in-memory | `server/src/index.ts` | Tidak berfungsi serverless |
| B6 | SQLite | `schema.prisma` | Data hilang setiap cold start |
| B7 | `fs` lokal untuk storage | 2 controller + 1 service | Semua file 404 di Vercel |

---

## LAMPIRAN B — Catatan Kepatuhan Batasan

| Batasan | Dipatuhi |
|---|---|
| Audit only | ✅ Tidak ada file kode diubah |
| Tidak migrasi database | ✅ `schema.prisma` tidak disentuh |
| Tidak hapus file | ✅ Tidak ada file dihapus |
| Tidak `git push` | ✅ Tidak ada operasi Git |
| Tidak deploy | ✅ Tidak ada deployment |
| Tidak ubah Figma | ✅ Tidak ada akses Figma |
| Phase 11/12/13 tidak rusak | ✅ Tidak ada modifikasi |
| Tidak tampilkan `.env`/secret | ✅ Hanya nama key yang dilaporkan |

---

*Laporan ini dihasilkan dari inspeksi langsung terhadap repository pada 17 November 2026. Seluruh temuan dapat diverifikasi ulang dengan perintah yang tercantum pada masing-masing bagian.*
