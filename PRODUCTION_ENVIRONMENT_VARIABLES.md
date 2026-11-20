# PANDUAN ENVIRONMENT VARIABLES PRODUKSI
## INA-GEOPORTAL WEB APP REDESIGN V2.0

Dokumen ini merupakan panduan otoritatif dan lengkap untuk konfigurasi environment variables yang wajib disiapkan sebelum melakukan deployment ke platform **Vercel** dan database **PostgreSQL**.

> **PERINGATAN KEAMANAN:**
> - JANGAN PERNAH memasukkan file `.env` atau nilai rahasia aktual ke dalam repositori Git atau GitHub.
> - Kredensial rahasia seperti `JWT_SECRET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, dan `DATABASE_URL` hanya boleh dimasukkan secara langsung melalui **Vercel Dashboard → Project Settings → Environment Variables**.
> - Variabel frontend yang berawalan `VITE_` akan tertanam ke dalam kode JavaScript peramban (*client bundle*). JANGAN PERNAH menaruh kredensial rahasia pada variabel `VITE_*`.

---

## 1. PEMBAGIAN RUANG LINGKUP VARIABEL (SCOPES)

Aplikasi Ina-Geoportal v2.0 menggunakan arsitektur *same-origin* pada Vercel yang terdiri dari dua lingkungan:

1. **Backend Serverless Functions (`api/**/*.ts` & Express):**
   Membaca variabel sistem runtime Node.js via `process.env`. Mengelola autentikasi, database PostgreSQL, rate limiter Upstash, dan kredensial driver Cloudflare R2.
2. **Frontend Single-Page Application (`client/` Vite):**
   Membaca variabel saat proses build (*build-time*) via `import.meta.env`. Hanya membaca endpoint publik dan konfigurasi UI non-sensitif.

---

## 2. DAFTAR VARIABEL BACKEND (VERCEL SERVERLESS FUNCTIONS)

Masukkan variabel-variabel berikut pada Vercel Dashboard untuk lingkungan **Production** (dan **Preview** jika diperlukan):

| Nama Variabel | Wajib / Opsional | Contoh / Nilai yang Diharapkan | Deskripsi & Catatan |
|---|:---:|---|---|
| `NODE_ENV` | **Wajib** (Otomatis oleh Vercel) | `production` | Mengaktifkan mode produksi Express, mematikan log morgan dev, dan mengunci validasi ketat. |
| `JWT_SECRET` | **Wajib** | *(String acak $\ge 32$ karakter)* | Kunci rahasia penandatanganan JSON Web Token (HS256). Server akan **fail-fast (menolak start)** jika kosong, $<32$ karakter, atau menggunakan nilai default. |
| `DATABASE_URL` | **Wajib** | `postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require&pgbouncer=true&connection_limit=1` | Connection string PostgreSQL produksi (disarankan Neon atau Supabase) yang mendukung connection pooling. |
| `PRISMA_TARGET` | **Wajib** | `postgres` | Menginstruksikan `server/scripts/prisma-generate.js` untuk membuat Prisma Client dari `schema.postgres.prisma` dengan engine Linux `rhel-openssl-3.0.x`. |
| `UPSTASH_REDIS_REST_URL` | **Wajib** | `https://xxxxxx.upstash.io` | URL REST API database Upstash Redis untuk shared rate limiter serverless. |
| `UPSTASH_REDIS_REST_TOKEN` | **Wajib** | `AXxxxxxx...` | Token otorisasi REST API Upstash Redis. |
| `STORAGE_DRIVER` | **Wajib** | `r2` | Mengaktifkan `ResilientR2StorageDriver` yang menghubungkan Cloudflare R2 sebagai primary storage dan local fixture sebagai fallback. |
| `R2_ACCOUNT_ID` | **Wajib** | `<YOUR_CLOUDFLARE_ACCOUNT_ID>` | Cloudflare Account ID dari pemilik bucket `ina-geoportal-data`. |
| `R2_ACCESS_KEY_ID` | **Wajib** | `<YOUR_R2_ACCESS_KEY_ID>` | R2 API Token Access Key ID dengan izin *Object Read & Write*. |
| `R2_SECRET_ACCESS_KEY` | **Wajib** | `<YOUR_R2_SECRET_ACCESS_KEY>` | R2 API Token Secret Access Key (64 karakter hex). |
| `R2_BUCKET_NAME` | **Wajib** | `ina-geoportal-data` | Nama bucket Cloudflare R2 tempat 70 aset geospasial nasional tersimpan. |
| `R2_ENDPOINT` | Opsional | `https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com` | S3 API endpoint. Jika tidak diisi, backend otomatis menyusunnya dari `R2_ACCOUNT_ID`. |
| `R2_PUBLIC_URL` | **Wajib** | `https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev` *(atau custom domain)* | URL publik CDN untuk akses objek geospasial. Diganti saat custom domain telah terhubung. |
| `CORS_ORIGIN` | Opsional | *(Kosongkan untuk same-origin)* | Daftar domain frontend yang diizinkan (dipisahkan koma). Biarkan **kosong** jika frontend dan API berada di proyek Vercel yang sama. |
| `RATE_LIMIT_ALLOW_MEMORY` | Opsional | *(Jangan diset pada produksi)* | Flag darurat lokal. Jangan pernah diset `true` pada produksi karena akan membuka celah bypass rate limit serverless. |

---

## 3. DAFTAR VARIABEL FRONTEND (VITE CLIENT BUILD)

Variabel ini dibaca oleh Vite saat menjalankan `npm run build` di Vercel:

| Nama Variabel | Wajib / Opsional | Contoh / Nilai yang Diharapkan | Deskripsi & Catatan |
|---|:---:|---|---|
| `VITE_API_URL` | Opsional | `/api/v1` | Base URL API backend. Pada arsitektur same-origin Vercel, biarkan default relatif `/api/v1`. |
| `VITE_R2_PUBLIC_URL` | **Wajib** | `https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev` *(atau custom domain)* | URL publik R2 yang digunakan oleh tombol unduh publik langsung peramban. Harus identik dengan nilai `R2_PUBLIC_URL` backend. |

---

## 4. CARA MEN-GENERATE KREDENSIAL KEAMANAN KUAT

### 4.1. Generate `JWT_SECRET`
Jalankan perintah Node.js berikut di terminal lokal untuk menghasilkan kunci acak 64-byte base64 (88 karakter) dengan entropi tinggi:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

Contoh output yang valid:
```
k4L9sT8yU2vW1xZ5aB7cE9fH2jK4mN6pQ8rT0vX2yZ4bC6eF8hJ0lM2oP4rS6uW8
```

### 4.2. Format `DATABASE_URL` PostgreSQL (Neon / Supabase)
Format koneksi PostgreSQL wajib menyertakan parameter pooling:

**Format Neon Serverless PostgreSQL:**
```
postgresql://neondb_owner:PASSWORD@ep-random-name-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1
```

**Format Supabase Connection Pooler (Port 6543):**
```
postgresql://postgres.projectref:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
```

---

## 5. LANGKAH PENGISIAN DI VERCEL DASHBOARD

1. Buka [vercel.com](https://vercel.com) dan pilih proyek Ina-Geoportal Anda.
2. Masuk ke menu **Settings** → **Environment Variables**.
3. Masukkan setiap variabel satu per satu dengan memilih lingkup target:
   - Centang **Production**
   - Centang **Preview** (untuk preview deployments dari Pull Requests)
4. Pastikan variabel `JWT_SECRET`, `R2_SECRET_ACCESS_KEY`, dan `UPSTASH_REDIS_REST_TOKEN` diset sebagai tipe **Sensitive** (tersembunyi dari log dashboard).
5. Klik **Save**.
6. Perubahan environment variables akan aktif pada deployment berikutnya (lakukan *Redeploy* jika proyek sudah pernah di-deploy).

---

## 6. VALIDASI PASCA-PENGISIAN (SMOKE TEST)

Setelah deployment selesai, verifikasi konfigurasi runtime tanpa membocorkan rahasia melalui endpoint diagnostik:

```bash
curl -s https://<domain-aplikasi>.vercel.app/health | jq .
```

Ekspektasi respons JSON:
```json
{
  "status": "OK",
  "app": "Ina-Geoportal Web App Redesign v2.0 Backend",
  "environment": "production",
  "rateLimiter": {
    "backend": "upstash",
    "shared": true,
    "productionSafe": true
  },
  "config": {
    "hasJwtSecret": true,
    "hasCorsOrigin": false,
    "hasUpstash": true,
    "storageDriver": "r2"
  }
}
```

Jika `config.hasJwtSecret` bernilai `true`, `rateLimiter.backend` bernilai `upstash`, dan `config.storageDriver` bernilai `r2`, maka konfigurasi environment variabel produksi telah terpasang dengan sempurna.
