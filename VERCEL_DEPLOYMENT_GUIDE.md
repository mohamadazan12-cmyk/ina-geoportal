# PANDUAN DEPLOYMENT VERCEL LENGKAP
## INA-GEOPORTAL WEB APP REDESIGN V2.0

Panduan ini berisi instruksi terperinci untuk mendeploy aplikasi Ina-Geoportal Web App v2.0 ke platform **Vercel** dengan backend **Vercel Functions**, database **PostgreSQL**, dan penyimpanan geospasial **Cloudflare R2**.

---

## 1. IKHTISAR ARSITEKTUR SAME-ORIGIN VERCEL

Aplikasi di-deploy sebagai satu kesatuan proyek (*single-project same-origin architecture*) di Vercel:

```
https://<project-name>.vercel.app
├── /                           → client/dist/index.html   (Static SPA via Vercel Edge CDN)
├── /assets/*                   → client/dist/assets/*     (Immutable Cache: 1 tahun)
├── /((?!api/).*)               → client/dist/index.html   (Catch-all Client-side Routing)
├── /api/v1/*                   → api/[...path].ts         (Express Serverless Function)
├── /api                        → api/index.ts             (Express Serverless Function)
└── /health                     → Rewritten to /api/health (Express Serverless Function)
```

### Keuntungan Arsitektur Same-Origin:
1. **Bebas Masalah CORS:** Frontend dan Backend berbagi origin yang sama, sehingga browser tidak memerlukan preflight CORS untuk request internal (`/api/v1/*`).
2. **Koneksi Cookie & Auth Aman:** Header `Authorization: Bearer <token>` dikirimkan langsung sebagai first-party request.
3. **Efisiensi Biaya:** Frontend CDN dan serverless functions berada dalam satu tagihan dan satu manajemen dashboard.

---

## 2. PANDUAN KONFIGURASI CLOUDFLARE DASHBOARD (R2 CUSTOM DOMAIN & CORS)

> **PENTING:** Jangan mengubah DNS atau menghubungkan domain sebelum nama domain resmi diberikan oleh pemilik proyek. Gunakan langkah-langkah di bawah ini ketika domain resmi telah siap.

### 2.1. Menghubungkan Custom Domain ke Bucket R2
1. Buka [dash.cloudflare.com](https://dash.cloudflare.com) dan login ke akun Cloudflare Anda.
2. Di sidebar kiri, pilih menu **R2** → **Overview**.
3. Klik pada nama bucket: **`ina-geoportal-data`**.
4. Masuk ke tab **Settings**.
5. Gulir ke bawah ke bagian **Public Access** → temukan sub-bagian **Custom Domains**.
6. Klik tombol **Connect Domain**.
7. Masukkan subdomain resmi yang telah dialokasikan (misalnya: `data.<domain-resmi>`).
8. Cloudflare akan otomatis membuat sertifikat SSL/TLS dan menambahkan DNS CNAME record di Cloudflare DNS.
9. Klik **Continue** dan tunggu status domain berubah menjadi **Active** (biasanya 1–5 menit).

### 2.2. Mengatur CORS Policy pada Bucket R2
Agar browser dapat melakukan kueri AJAX langsung atau HTTP Range request ke bucket R2 tanpa blokir CORS:
1. Pada tab **Settings** bucket `ina-geoportal-data`, temukan bagian **CORS Policy**.
2. Klik tombol **Add CORS Policy** (atau Edit jika sudah ada).
3. Masukkan konfigurasi JSON berikut:

```json
[
  {
    "AllowedOrigins": [
      "https://*.vercel.app",
      "https://<domain-resmi-anda>"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Range",
      "Content-Type",
      "Authorization"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Range",
      "Accept-Ranges",
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```
4. Klik **Save**. Pengaturan ini memastikan peramban dapat membaca header `Content-Range` saat memuat potongan data geospasial.

---

## 3. CHECKLIST PRA-DEPLOYMENT (PRE-DEPLOYMENT CHECKLIST)

Sebelum menghubungkan repository ke Vercel, pastikan seluruh persyaratan berikut terpenuhi di mesin lokal:

- [x] **Typecheck & Build Lulus:** `npm run build` berhasil tanpa galat (exit code 0).
- [x] **Automated Tests Lulus:** `npm test` menghasilkan 261/261 tes lulus 100%.
- [x] **Serverless Entry Verification Lulus:** `npx tsx scripts/verify-serverless-entry.ts` menghasilkan `RESULT: PASS`.
- [x] **Proteksi Ukuran Bundle:** File [`.vercelignore`](file:///c:/Users/Hype%20AMD/projek%20IMK/.vercelignore) terpasang di root proyek untuk mengabaikan arsip lokal 1,6 GB.
- [ ] **Database PostgreSQL Siap:** Instance PostgreSQL (Neon / Supabase) telah diprovisikan dengan parameter connection pooling `?sslmode=require&pgbouncer=true&connection_limit=1`.
- [ ] **Skema & Data PostgreSQL Bermigrasi:** Perintah `prisma db push` dan `npm run db:restore --workspace=server -- --apply` telah berhasil dijalankan.
- [ ] **Instance Upstash Redis Siap:** Database Upstash Redis telah dibuat dan memiliki kredensial REST URL serta Token.
- [ ] **JWT Secret Siap:** String acak minimal 32 karakter telah dibuat menggunakan perintah crypto.

---

## 4. LANGKAH DEPLOYMENT KE VERCEL (STEP-BY-STEP)

### Langkah 1: Push Kode ke Repositori Git (GitHub / GitLab)
Pastikan seluruh perubahan terbaru telah di-commit ke branch `main`:
```bash
git add .
git commit -m "chore: prepare production deployment and vercel configuration"
git push origin main
```

### Langkah 2: Import Proyek di Vercel Dashboard
1. Buka [vercel.com/new](https://vercel.com/new).
2. Hubungkan akun Git Anda dan pilih repositori proyek Ina-Geoportal.
3. Pada halaman **Configure Project**, atur pengaturan dasar:
   - **Project Name:** `ina-geoportal-v2` *(atau nama yang diinginkan)*
   - **Framework Preset:** Pilih **Other** (karena monorepo npm workspaces).
   - **Root Directory:** `./` (default root).
   - **Build Command:** `npm run build` (menjalankan `typecheck:api`, build server, dan build client).
   - **Output Directory:** `client/dist` (folder hasil build Vite).
   - **Install Command:** `npm install` (otomatis memicu `postinstall` untuk `prisma:generate`).

### Langkah 3: Masukkan Environment Variables
Buka accordion **Environment Variables** di halaman konfigurasi Vercel, lalu masukkan seluruh variabel sesuai dokumen [`PRODUCTION_ENVIRONMENT_VARIABLES.md`](file:///c:/Users/Hype%20AMD/projek%20IMK/PRODUCTION_ENVIRONMENT_VARIABLES.md):

**Variabel Utama:**
- `NODE_ENV`: `production`
- `JWT_SECRET`: *(string acak 64-byte)*
- `DATABASE_URL`: *(pooled PostgreSQL connection string)*
- `PRISMA_TARGET`: `postgres`
- `UPSTASH_REDIS_REST_URL`: `https://...upstash.io`
- `UPSTASH_REDIS_REST_TOKEN`: *(token Upstash)*
- `STORAGE_DRIVER`: `r2`
- `R2_ACCOUNT_ID`: `<YOUR_CLOUDFLARE_ACCOUNT_ID>`
- `R2_ACCESS_KEY_ID`: *(Access Key ID R2)*
- `R2_SECRET_ACCESS_KEY`: *(Secret Access Key R2)*
- `R2_BUCKET_NAME`: `ina-geoportal-data`
- `R2_PUBLIC_URL`: `https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev` *(atau custom domain)*
- `VITE_R2_PUBLIC_URL`: `https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev` *(atau custom domain)*
- `VITE_API_URL`: `/api/v1`

### Langkah 4: Klik Deploy & Pantau Build Logs
1. Klik tombol **Deploy**.
2. Pantau layar **Building**:
   - Vercel akan mengkloning repo dan menjalankan `npm install`.
   - Skrip `postinstall` akan mendeteksi `DATABASE_URL` PostgreSQL dan menjalankan `prisma generate --schema=prisma/schema.postgres.prisma` dengan binary targets `rhel-openssl-3.0.x`.
   - Perintah `npm run build` akan meng-compile TypeScript API, meng-copy aset ringan, dan mem-build Vite client.
   - Output static `client/dist` akan diunggah ke Vercel CDN dan fungsi `api/**/*.ts` akan dibundle ke Vercel Functions.
3. Tunggu hingga layar menampilkan **Congratulations! Your project has been deployed.**

---

## 5. PROSEDUR VERIFIKASI PASCA-DEPLOYMENT (SMOKE TESTS)

Setelah deployment selesai, jalankan serangkaian uji coba langsung terhadap domain produksi Vercel (`https://<project>.vercel.app`):

### 1. Uji Health Check Endpoint
```bash
curl -i https://<project>.vercel.app/health
```
- **Ekspektasi:** Status `200 OK`, JSON menampilkan `environment: "production"`, `rateLimiter.backend: "upstash"`, dan `storageDriver: "r2"`.

### 2. Uji Storage Engine Diagnostics
```bash
curl -i https://<project>.vercel.app/api/v1/storage/status
```
- **Ekspektasi:** Status `200 OK`, JSON menampilkan `driver: "r2"`, `bucket: "ina-geoportal-data"`, dan daftar canonical keys.

### 3. Uji Query Dataset Publik
```bash
curl -i https://<project>.vercel.app/api/v1/datasets/ds-batas-kabkot/geojson
```
- **Ekspektasi:** Status `200 OK`, mengembalikan GeoJSON batas 541 wilayah dengan header:
  - `X-Storage-Driver: r2`
  - `X-Storage-Source: r2`
  - `X-Canonical-Key: geojson/web/real_batas_kabupaten.json`

### 4. Uji Unduh Publik Langsung dari R2 CDN
- Buka browser pada URL: `https://<project>.vercel.app/katalog/ds-batas-kabkot`.
- Klik tombol **"Unduh Publik Tanpa Login"**.
- Peramban harus langsung mengunduh arsip GeoJSON dari edge Cloudflare R2 tanpa memerlukan login atau melewati fungsi serverless Vercel.

### 5. Uji Autentikasi Pengguna & Database PostgreSQL
- Buka halaman login: `https://<project>.vercel.app/login`.
- Masuk menggunakan akun demo: `demo@inageoportal.go.id` / `Password123!`.
- Login harus berhasil, peramban diarahkan ke profil pengguna.
- Periksa daftar riwayat unduhan pada profil untuk memastikan 316 riwayat unduhan lama termuat dengan benar dari PostgreSQL.
- Tambahkan bookmark dataset baru dan refresh halaman untuk memastikan data tersimpan permanen di PostgreSQL.

---

## 6. TROUBLESHOOTING & MASALAH UMUM

| Gejala Galat | Kemungkinan Penyebab | Tindakan Penyelesaian |
|---|---|---|
| **`RATE_LIMIT_BACKEND_MISSING` (500 Error pada `/api/*`)** | `UPSTASH_REDIS_REST_URL` atau `TOKEN` belum dimasukkan pada Vercel Environment Variables. | Buka Vercel Settings → Environment Variables, masukkan kredensial Upstash, lalu lakukan *Redeploy*. |
| **`PrismaClientInitializationError` / Database Timeout** | `DATABASE_URL` menggunakan koneksi direct tanpa connection pooler, atau IP diblokir. | Pastikan menggunakan connection string dengan akhiran `?sslmode=require&pgbouncer=true&connection_limit=1`. |
| **`FUNCTION_INVOCATION_TIMEOUT` (10s Timeout)** | Permintaan backend mencoba memproses file 300 MB di dalam Vercel Function pada paket Free/Hobby. | Gunakan tautan unduh publik langsung R2 (`getR2PublicUrl()`) untuk file besar. Vercel Function hanya melayani metadata dan web-optimized layers. |
| **Browser Menolak AJAX Fetch ke R2 (`CORS Error`)** | Bucket R2 belum dipasangi CORS policy atau masih menggunakan domain pengembang `r2.dev`. | Tambahkan CORS policy pada Cloudflare Dashboard (lihat Bagian 2.2) atau lewatkan request AJAX melalui dedicated proxy backend `/api/v1/storage/r2/*`. |
