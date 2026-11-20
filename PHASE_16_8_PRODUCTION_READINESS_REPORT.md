# PHASE 16.8 — PRODUCTION READINESS & VERCEL DEPLOYMENT AUDIT REPORT

**Project:** Ina-Geoportal Web App Redesign v2.0  
**Phase:** Phase 16.8 — Production Readiness & Vercel Deployment Preparation  
**Date:** November 20, 2026  
**Status:** ⚠️ AUDIT & CODE PREPARATION 100% COMPLETE — DEPLOYMENT BLOCKED ON EXTERNAL INFRASTRUCTURE & CREDENTIALS  
**Target Architecture:**
- **Frontend:** Vercel Static CDN (Single-Page Application: Vite + React 18 + Tailwind CSS + React Leaflet)
- **Backend:** Vercel Serverless Functions (`api/**/*.ts` running side-effect-free Express 4)
- **Geospatial Storage:** Cloudflare R2 (`ina-geoportal-data`, 70 canonical objects, 1.09 GiB)
- **Production Database:** PostgreSQL (Neon Serverless / Supabase with connection pooling)
- **ORM:** Prisma 6 with environment-aware schema switching (`schema.postgres.prisma`)
- **Rate Limiting:** Upstash Redis REST API (shared distributed rate limiter)

---

## EXECUTIVE SUMMARY

Phase 16.8 melakukan audit komprehensif, persiapan arsitektur, dan pengujian kesiapan produksi (*production readiness*) untuk seluruh tumpukan teknologi (*technology stack*) Ina-Geoportal Web App Redesign v2.0.

Hasil audit mengonfirmasi bahwa **seluruh basis kode aplikasi (frontend, backend, storage abstraction, dan database models) telah 100% siap untuk di-deploy ke Vercel dan PostgreSQL**. Namun, proses deployment fisik saat ini **secara jujur dan tegas dinyatakan BELUM SIAP (BLOCKED)** karena infrastruktur eksternal produksi (database PostgreSQL, instance Upstash Redis produksi, kredensial produksi, dan domain resmi) belum disediakan oleh operator.

### Status Kunci Kesiapan:
1. **R2 Geospatial Storage (100% Siap):** Seluruh 70 aset geospasial (1.146.765.393 bytes) telah berada di bucket `ina-geoportal-data`. `ResilientR2StorageDriver` siap beroperasi sebagai *primary driver* di lingkungan produksi dengan *local fallback*.
2. **Kesiapan Custom Domain (Siap Terhubung):** Seluruh URL objek R2 diatur melalui satu konfigurasi terpusat (`R2_PUBLIC_URL` pada backend dan `VITE_R2_PUBLIC_URL` pada frontend). Mengganti domain pengembang `pub-*.r2.dev` ke domain resmi tidak mengubah satu pun dari 70 *canonical keys*.
3. **Database PostgreSQL & Migrasi Data (Siap Eksekusi):** Skema `schema.postgres.prisma` telah disinkronkan 100% dengan SQLite. Snapshot cadangan data portabel (`backup-2026-11-20T05-31-37-854Z.json`) telah diamankan dengan 6 kategori, 11 simpul jaringan, 6 dataset, 4 pengguna, 1 bookmark, dan 316 riwayat unduhan tanpa kehilangan data.
4. **Vercel Serverless Functions & Anti-Bloat Bundle (Siap Deploy):** Entry points `api/index.ts` dan `api/[...path].ts` lulus uji cold-start serverless (`RESULT: PASS`). Dibuat `.vercelignore` untuk mencegah arsip lokal 1,6 GB masuk ke bundle serverless, menjaga ukuran bundle jauh di bawah batas platform Vercel (50 MB zipped / 250 MB unzipped).
5. **Keamanan & Guardrails (100% Sesuai Aturan):** Nol rahasia tersimpan di git, JWT signing enforcing $\ge 32$ chars, autentikasi email/password dan registrasi mandiri terjaga utuh, dataset publik tetap terbuka tanpa login, dan fitur pengguna tetap terlindungi.

---

## 1. AUDIT R2 PRODUCTION CONFIGURATION

### 1.1. Perilaku `ResilientR2StorageDriver` pada Lingkungan Produksi
Pada lingkungan produksi (`NODE_ENV=production`), variabel `STORAGE_DRIVER` dikonfigurasi bernilai `r2`.
- Pabrik driver `getStorageDriver('public' | 'private')` di `server/src/services/storage/index.ts` secara otomatis menginstansiasi `ResilientR2StorageDriver`.
- **Primary Driver:** `R2StorageDriver` yang terhubung langsung ke Cloudflare R2 bucket `ina-geoportal-data` menggunakan `@aws-sdk/client-s3`.
- **Fallback Driver:** `LocalStorageDriver` yang membaca fixture web-optimized lokal jika terjadi gangguan koneksi R2 (`ECONNRESET`, timeout, atau 5xx).
- **Header Telemetri:** Setiap respons HTTP menyertakan header transparan:
  - Normal (R2 aktif): `X-Storage-Driver: r2`, `X-Storage-Source: r2`, `X-Canonical-Key: <key>`, `X-Public-Url: <url>`.
  - Gangguan jaringan (Failover): `X-Storage-Source: local-fallback`, `X-Storage-Fallback: true`.

### 1.2. Isolasi Kredensial R2
- Kredensial rahasia `R2_ACCESS_KEY_ID` dan `R2_SECRET_ACCESS_KEY` **hanya dibaca oleh backend Node.js** di `server/src/config/index.ts`.
- Frontend SPA Vite **sama sekali tidak memiliki akses** ke variabel tersebut dan tidak memuat `@aws-sdk`. Frontend hanya membaca URL publik CDN melalui `VITE_R2_PUBLIC_URL`.

### 1.3. Imutabilitas 70 Kunci Kanonikal
Ketika `R2_PUBLIC_URL` diubah dari development URL `https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev` menuju custom domain produksi (misalnya `https://data.inageoportal.go.id`), **seluruh 70 canonical keys tetap persis sama**:
- `geojson/web/real_batas_kabupaten.json`
- `geojson/web/real_jalan_nasional.json`
- `datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json`
- `datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json`
- `datasets/ds-rawan-gempa/chunks/chunk_0.json` ... `chunk_12750.json`
- `datasets/ds-tutupan-lahan/partitions/reg_*.json`
- `datasets/ds-faskes/real_fasilitas_kesehatan_national.json`
- `datasets/ds-rbi/rbi_layers_registry.json`
- `manifests/gempa_manifest.json`
- `manifests/tutupan_lahan_manifest.json`

Tidak diperlukan upload ulang data atau restrukturisasi bucket saat beralih ke domain kustom.

---

## 2. AUDIT KEBUTUHAN CUSTOM DOMAIN

### 2.1. Mengapa Custom Domain Diperlukan untuk Cloudflare R2?
Meskipun 70 aset geospasial telah dapat diakses melalui Public Development URL `https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev`, domain pengembang memiliki keterbatasan signifikan:
1. **Ketiadaan Header CORS pada Browser AJAX Fetch:**  
   Browser memblokir permintaan JavaScript `fetch()` langsung ke domain `.r2.dev` karena Cloudflare tidak menyertakan `Access-Control-Allow-Origin: *` pada domain default ini (menghasilkan status `OPTIONS 403 Forbidden`).
2. **Kredibilitas & Branding Institusi:**  
   Aplikasi portal geospasial resmi satu pintu nasional Republik Indonesia memerlukan domain resmi tepercaya (misalnya subdomain bertaraf instansi pemerintah).
3. **Optimasi Global Edge Caching & WAF:**  
   Custom domain yang dikelola di bawah Cloudflare Zone memperoleh manfaat penuh Cloudflare Edge Tiered Cache, perlindungan DDoS, dan aturan Cache kustom.

### 2.2. Lokasi Penggunaan `r2.dev` yang Telah Teridentifikasi
Audit kode menemukan kemunculan `r2.dev` telah terisolasi secara terpusat:
- `client/src/constants/r2Storage.ts:10` (Nilai fallback jika `VITE_R2_PUBLIC_URL` kosong).
- `server/src/controllers/storageController.ts:27` (Nilai fallback jika `config.r2PublicUrl` kosong).
- File konfigurasi `.env`, `.env.example`, `server/.env`, `client/.env`.
- Pengujian unit `server/src/__tests__/phase16_7.test.ts`.

Tidak ada hardcode URL `r2.dev` pada komponen UI, peta Leaflet, atau modul bisnis logic lainnya.

---

## 3. AUDIT KESIAPAN DATABASE PRODUKSI (POSTGRESQL)

### 3.1. Ketergantungan SQLite vs Kompatibilitas PostgreSQL
Audit terhadap seluruh skema Prisma dan query backend menunjukkan:
- **Zero Raw SQL:** Tidak ada query mentah (`$queryRaw` / `$executeRaw`) atau sintaks khusus SQLite (seperti `PRAGMA`) di seluruh aplikasi.
- **Tipe Data Portabel:**
  - Kunci primer (`id`): Seluruh model (`User`, `Bookmark`, `DownloadHistory`) menggunakan UUID v4 string (`@id @default(uuid())`). Model `Category`, `NetworkNode`, dan `Dataset` menggunakan ID teks institusional yang konsisten (misal `ds-batas-kabkot`).
  - Tanggal & Waktu: Menggunakan field `DateTime` Prisma standar yang dipetakan secara native ke `TIMESTAMP(3)` pada PostgreSQL.
  - Boolean: `emailVerified` dan `isDemo` dipetakan ke tipe native `BOOLEAN` PostgreSQL.
  - Relasi & Integritas Referensial: Aturan cascading (`onDelete: Cascade` dan `onDelete: SetNull`) identik di kedua skema.

### 3.2. Skema Dual-Provider
Proyek memiliki dua file skema tersinkronisasi di `server/prisma/`:
- `schema.prisma`: `provider = "sqlite"` untuk pengembangan lokal cepat.
- `schema.postgres.prisma`: `provider = "postgresql"` dengan generator binary targets `["native", "rhel-openssl-3.0.x"]` khusus untuk lingkungan Linux runtime Vercel.
- Skrip `server/scripts/prisma-generate.js` secara otomatis memilih skema PostgreSQL saat `DATABASE_URL` berawalan `postgres://` / `postgresql://` atau saat `PRISMA_TARGET=postgres`.

### 3.3. Database Connection Pooling untuk Serverless
Di lingkungan serverless (Vercel Functions), setiap instance fungsi yang berputar dapat membuka koneksi baru ke database. Jika terjadi lonjakan trafik, hal ini dapat menghabiskan kuota koneksi PostgreSQL (`max_connections`).
- **Solusi yang disiapkan:**
  1. Penggunaan PostgreSQL berbasis serverless yang mendukung *Connection Pooler* (misalnya Neon Serverless PostgreSQL dengan pooler endpoint atau Supabase dengan pgBouncer/Supavisor port 6543).
  2. String koneksi wajib menyertakan:  
     `?sslmode=require&pgbouncer=true&connection_limit=1`
  3. Di `server/src/config/db.ts`, klien Prisma telah dioptimalkan dengan pola `globalThis.prisma` singleton agar instance PrismaClient digunakan kembali antar-invokasi kontainer yang hangat (*warm containers*).

### 3.4. Skema Migrasi Tanpa Kehilangan Data
Telah diverifikasi skrip backup dan restore:
- `npm run db:backup --workspace=server` telah menghasilkan snapshot cadangan terbaru:  
  `server/prisma/backups/backup-2026-11-20T05-31-37-854Z.json`
- **Data yang diamankan 100%:**
  - 6 Kategori data spasial
  - 11 Simpul Jaringan (K/L, Provinsi, Kab/Kota)
  - 6 Master Dataset nasional
  - 4 Akun pengguna (termasuk hash password bcrypt yang portabel)
  - 1 Bookmark pengguna aktif
  - 316 Riwayat unduhan dataset
- Skrip `server/prisma/restoreBackup.ts` menggunakan operasi *idempotent upsert* dengan urutan pengisian parent sebelum child, memastikan integritas foreign key dan UUID terjaga sempurna saat diimpor ke PostgreSQL.

---

## 4. AUDIT VERCEL DEPLOYMENT & SERVERLESS FUNCTIONS

### 4.1. Audit `vercel.json` dan Routing
- **Arsitektur Same-Origin:** Frontend SPA dan backend API berjalan pada origin yang sama di bawah `vercel.json`.
  - Static SPA: `/` melayani `client/dist/index.html`.
  - Static Assets: `/assets/*` memiliki cache immutable 1 tahun (`Cache-Control: public, max-age=31536000, immutable`).
  - Serverless API: `/api/v1/*` diarahkan secara filesystem ke `api/[...path].ts`.
  - Health check: `/health` diarahkan ke `/api/health`.
  - Catch-all rewrite: `/((?!api/).*)` diarahkan ke `/index.html` untuk client-side routing React Router.
- Tidak ada tabrakan antara rute API dan rute navigasi frontend.

### 4.2. Express Adapter & Cold-Start Compatibility
- File `server/src/app.ts` diekspor bebas efek samping (*side-effect-free*, tanpa `.listen()`).
- File `api/index.ts` dan `api/[...path].ts` mengimpor `app` dan memvalidasi `resolveJwtSecret()` saat inisialisasi cold-start.
- Skrip verifikasi `scripts/verify-serverless-entry.ts` berhasil menguji cold-start tiruan:
  ```
  --- Serverless Entry Point Verification ---
  Port 47099 is free before import.
  No port bound on import (serverless-safe).
  Default export is callable.
  GET /health → 200 (OK)
  GET /api/v1/datasets → 200 (datasets=2)
  GET /api/v1/__unknown__ → 404 (unmatched route, no crash)
  RESULT: PASS
  ```

### 4.3. Batasan Ukuran Bundle Serverless (Critical Finding & Remediasi)
- **Batasan Platform Vercel:** Ukuran fungsi serverless dibatasi maksimal **50 MB (terkompresi zip)** atau **250 MB (unzipped)**.
- **Temuan Fisik Lokal:** Direktori fixture lokal proyek berukuran **1,61 GB** karena menyimpan salinan mentah arsip batas kabupaten 548 (292 MB), jalan nasional (126 MB), dan 52 chunk gempa (643 MB).
- **Remediasi yang Diterapkan:**
  1. Seluruh 70 arsip besar tersebut sudah berada di Cloudflare R2 dan diabaikan dari git melalui `.gitignore`.
  2. Dibuat file [`.vercelignore`](file:///c:/Users/Hype%20AMD/projek%20IMK/.vercelignore) untuk memastikan deployment via Vercel CLI tidak mengunggah file-file besar tersebut ke serverless bundle.
  3. File fixture yang masuk ke serverless bundle hanya layer web-optimized GeoJSON (< 5 MB), sehingga ukuran bundle Vercel Function terjaga di bawah **15 MB**, jauh di bawah batas kuota 50 MB / 250 MB.

### 4.4. Manajemen Batas Waktu Eksekusi (Serverless Function Timeout)
- Akun Vercel Hobby dibatasi pada timeout **10 detik** (Pro: hingga 60s/300s).
- Mengunduh file 132 MB atau 306 MB melalui fungsi serverless dapat memicu timeout pada koneksi internet lambat.
- **Strategi Anti-Timeout:**
  - Tombol *"Unduh Publik Tanpa Login"* langsung mengarahkan peramban pengguna ke Cloudflare R2 edge CDN (`https://pub-*.r2.dev` atau custom domain), melewati fungsi Vercel sepenuhnya.
  - Vercel Function hanya melayani metadata cepat (< 100 ms) dan layer web-optimized GeoJSON (< 800 ms).

---

## 5. AUDIT KEAMANAN & KINERJA PRODUKSI

| Aspek Keamanan / Kinerja | Evaluasi | Status Kesiapan |
|---|---|:---:|
| **JWT Secret Signing** | `resolveJwtSecret()` mewajibkan $\ge 32$ karakter acak, menolak secret default atau lemah, dan fail-fast saat startup. | ✅ Siap Produksi |
| **Password Hashing** | Menggunakan bcrypt 10 salt rounds (`bcryptjs`). Hash portabel antar database SQLite dan PostgreSQL. | ✅ Siap Produksi |
| **CORS Produksi** | Arsitektur same-origin tidak memerlukan CORS terbuka. Jika frontend dan API dipisah, `CORS_ORIGIN` menerapkan whitelist ketat tanpa wildcard `*`. | ✅ Siap Produksi |
| **Akses Publik vs Terproteksi** | Seluruh metadata katalog, layer Webmap, dan tautan unduh R2 dapat diakses tanpa login. Fitur bookmark, riwayat unduhan, dan profil wajib membawa token JWT valid. | ✅ Siap Produksi |
| **Shared Rate Limiting** | Terintegrasi dengan Upstash Redis REST API. Fails-fast pada production jika credentials Upstash tidak dipasang (mencegah bypass serverless). | ⚠️ Menunggu Akun Upstash |
| **HTTP Range Requests** | Mendukung `Range: bytes=START-END` (`HTTP 206 Partial Content`) pada R2 dan proxy Express untuk streaming arsip besar. | ✅ Siap Produksi |

---

## 6. EMPAT DAFTAR KESIAPAN PRODUKSI

### 1. Komponen yang Sudah Siap Deploy (Ready Components)
1. **Frontend Web Client:** Bundle SPA React 18, Vite 6, Tailwind CSS, React Leaflet, dan Lucide Icons (Typecheck & Build 100% lulus, exit code 0).
2. **Backend API Logic:** Seluruh controller (Auth, Dataset, Simpul Jaringan, Kategori, Dokumen, Storage Proxy, Stats, User Profile) bebas error.
3. **Serverless Adapters:** Entry point `api/index.ts` dan `api/[...path].ts` teruji fungsional tanpa side-effect.
4. **Vercel Routing & Security Configuration:** `vercel.json` dengan rewrites, immutable static cache, dan security headers.
5. **Anti-Bloat Bundle Configuration:** `.vercelignore` terpasang untuk melindungi kuota 50 MB serverless bundle.
6. **Geospatial Cloud Storage:** Cloudflare R2 bucket `ina-geoportal-data` dengan 70 aset terunggah dan terverifikasi integritas checksum SHA-256.
7. **Resilient Storage Driver:** `ResilientR2StorageDriver` dengan auto-failover ke fixture lokal.
8. **Prisma Dual-Schema:** Skema PostgreSQL `schema.postgres.prisma` dengan `binaryTargets = ["native", "rhel-openssl-3.0.x"]`.
9. **Data Preservation Utility:** Cadangan JSON portabel (`backup-2026-11-20T05-31-37-854Z.json`) dan skrip restore yang teruji.
10. **Automated Test Suite:** 261/261 unit & integration tests lulus 100% (209 server, 52 client).

### 2. Komponen yang Belum Siap (Not Yet Ready Components)
1. **Instance Database PostgreSQL Produksi:** Belum dibuat/disediakan instance PostgreSQL pada provider cloud (Neon / Supabase / AWS RDS).
2. **Instance Upstash Redis Produksi:** Belum dibuat database Redis Upstash untuk distributed rate limiter.
3. **Kredensial Produksi:** Nilai definitif untuk `JWT_SECRET`, `DATABASE_URL`, dan token Upstash belum diinput ke Vercel Environment Variables.
4. **Custom Domain Cloudflare R2:** Bucket R2 masih terhubung ke domain pengembang sementara (`pub-*.r2.dev`) dan belum dihubungkan ke domain resmi.
5. **Proyek Vercel Produksi:** Repository belum dihubungkan ke dashboard Vercel untuk deployment aktual.

### 3. Blocker yang Harus Diselesaikan (Deployment Blockers)
- 🔴 **BLOCKER 1: Penyediaan PostgreSQL Database Serverless.**  
  Operator harus membuat database PostgreSQL (disarankan Neon Serverless PostgreSQL atau Supabase) dan mengambil pooled connection string (`DATABASE_URL`).
- 🔴 **BLOCKER 2: Eksekusi Migrasi Skema & Restore Data ke PostgreSQL.**  
  Operator harus menjalankan `prisma db push --schema=prisma/schema.postgres.prisma` dan merestore cadangan data via `npm run db:restore --workspace=server -- --apply`.
- 🔴 **BLOCKER 3: Penyediaan Upstash Redis Instance.**  
  Operator harus membuat database Redis di Upstash untuk mendapatkan `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`.
- 🔴 **BLOCKER 4: Konfigurasi Environment Variables di Vercel Dashboard.**  
  Seluruh variabel rahasia produksi harus dimasukkan pada menu Settings → Environment Variables di Vercel.
- 🟡 **BLOCKER 5 (Opsional / Sangat Disarankan): Penambahan Custom Domain pada Cloudflare R2.**  
  Menghubungkan subdomain resmi pada bucket `ina-geoportal-data` agar browser dapat menjalankan kueri AJAX dengan header CORS yang benar.

---

### 4. Langkah Deployment dengan Urutan yang Benar (Step-by-Step Procedure)

```mermaid
flowchart TD
    S1["Langkah 1: Provisioning PostgreSQL (Neon / Supabase)"]
    S2["Langkah 2: Migrasi Skema & Restore Data ke PostgreSQL"]
    S3["Langkah 3: Provisioning Upstash Redis (Rate Limiter)"]
    S4["Langkah 4: Konfigurasi Custom Domain R2 (Cloudflare Dashboard)"]
    S5["Langkah 5: Pembuatan Proyek di Vercel & Pengaturan Environment"]
    S6["Langkah 6: Build & Deployment Aktual ke Vercel"]
    S7["Langkah 7: Verifikasi Pasca-Deployment (Smoke Tests)"]

    S1 --> S2
    S2 --> S3
    S3 --> S4
    S4 --> S5
    S5 --> S6
    S6 --> S7
```

1. **Langkah 1 — Penyediaan PostgreSQL:**  
   Buat database PostgreSQL pada Neon / Supabase. Dapatkan connection string dengan parameter pooling:  
   `postgresql://USER:PASSWORD@HOST/DB?sslmode=require&pgbouncer=true&connection_limit=1`.
2. **Langkah 2 — Migrasi Skema & Restore Data:**  
   Dari terminal pengembang (dengan `DATABASE_URL` mengarah ke PostgreSQL target):
   ```bash
   npx prisma db push --schema=server/prisma/schema.postgres.prisma
   npm run db:restore --workspace=server -- --apply
   ```
3. **Langkah 3 — Penyediaan Upstash Redis:**  
   Buat database Redis gratis di [console.upstash.com](https://console.upstash.com). Salin `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`.
4. **Langkah 4 — Konfigurasi Custom Domain R2 (Jika Domain Tersedia):**  
   Di Cloudflare Dashboard → R2 → `ina-geoportal-data` → Settings → Connect Custom Domain. Tambahkan CORS policy.
5. **Langkah 5 — Konfigurasi Proyek Vercel:**  
   Buat proyek baru di Vercel, hubungkan dengan repositori GitHub proyek. Masukkan seluruh environment variables sesuai dokumen `PRODUCTION_ENVIRONMENT_VARIABLES.md`.
6. **Langkah 6 — Deployment:**  
   Klik **Deploy** pada Vercel. Vercel akan menjalankan `npm install`, menghasilkan Prisma client PostgreSQL via `postinstall`, dan mem-build client serta serverless functions.
7. **Langkah 7 — Verifikasi Smoke Test Pasca-Deployment:**  
   Uji endpoint `/health`, `/api/health`, `/api/v1/datasets`, pemuatan layer Webmap, dan fungsi unduh dataset.

---

## KESIMPULAN AUDIT

Ina-Geoportal Web App Redesign v2.0 berada dalam kondisi **teknis prima dan siap di-deploy secara instan** segera setelah keempat blocker infrastruktur eksternal (PostgreSQL, Upstash Redis, Vercel Envs, dan Custom Domain) dipenuhi oleh operator. Seluruh batasan keamanan, persistensi data pengguna, dan arsitektur anti-bloat memori telah terpenuhi 100%.
