# PHASE 14 — P0 DEPLOYMENT BLOCKER REMEDIATION REPORT

**Project:** Ina-Geoportal Web App Redesign v2.0
**Scope:** Vercel + GitHub readiness (single project, React/Vite + Express functions)
**Database target:** Neon PostgreSQL · **Storage target:** Vercel Blob · **Rate limiting:** Upstash Redis
**Date:** 17 November 2026
**Baseline:** `DEPLOYMENT_READINESS_REPORT.md` (verdict 🔴 NOT READY, 3.2/10)

> **Not done, by instruction:** no Git initialisation, no commit, no push, no deployment, no database migration executed, no file from `fixtures/` deleted, no dummy PDF generated, no secret displayed.

---

## 1. Tujuh Blocker Asli dan Penyelesaiannya

| # | Blocker (temuan audit) | Status | Penyelesaian |
| --- | --- | --- | --- |
| **B1** | Tidak ada `.gitignore` di mana pun; `.env`, `*.db`, `node_modules`, `dist` berisiko ter-commit | ✅ Selesai | `.gitignore` root dibuat (10 seksi). `.env`/`.env.*` diabaikan, `.env.example` dikecualikan eksplisit (`!.env.example`, `!**/.env.example`). `node_modules/`, `dist/`, `build/`, `coverage/`, `.vercel`, `*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm`, `*.log`, `.DS_Store`, `Thumbs.db` diabaikan. Fixtures GeoJSON dan aset aplikasi **tidak** diabaikan. |
| **B2** | JWT fallback hardcoded di `server/src/config/index.ts` (39 karakter) | ✅ Selesai | Fallback dihapus total. `resolveJwtSecret()` melempar `ConfigError` bila kosong (`JWT_SECRET_MISSING`), < 32 karakter (`JWT_SECRET_TOO_WEAK`), atau cocok dengan fingerprint nilai lama (`JWT_SECRET_INSECURE`). Fingerprint lama disimpan sebagai char-code array sehingga tidak ada literal siap-salin di repo. |
| **B3** | `.env.example` berisi nilai JWT yang identik dengan fallback hardcoded | ✅ Selesai | Ketiga template (`/.env.example`, `/server/.env.example`, `/client/.env.example`) ditulis ulang. `JWT_SECRET="<GENERATE_A_RANDOM_64_BYTE_BASE64_SECRET>"` + perintah generator. `.env.example` lama yang bocor sudah diganti; nilai lama juga tidak lagi diterima server. |
| **B4** | `server/src/index.ts` memanggil `app.listen()` saat di-import → tidak bisa dipakai sebagai Vercel Function | ✅ Selesai | Dipecah menjadi `server/src/app.ts` (factory `createApp()`, tanpa efek samping) dan `server/src/index.ts` (hanya listen bila `NODE_ENV !== 'test'` dan `VERCEL`/`VERCEL_ENV` tidak ada). Entry serverless: `api/index.ts` (path `/api`) + `api/[...path].ts` (catch-all `/api/*`). |
| **B5** | Tidak ada konfigurasi Vercel | ✅ Selesai | `vercel.json`: `framework: null`, `buildCommand`, `outputDirectory: client/dist`, `functions` (`api/**/*.ts`, 1024 MB / 30 s), rewrite `/health` → `/api/health`, SPA fallback dengan negative lookahead `api/`, serta cache header `immutable` untuk `/assets/*` dan header keamanan dasar. |
| **B6** | Prisma `provider = "sqlite"`; tidak ada migration history (pola `db push`) | ✅ Selesai | `schema.postgres.prisma` dibuat (identik kecuali satu baris `provider = "postgresql"`). `generator` mendapat `binaryTargets = ["native", "rhel-openssl-3.0.x"]`. `prisma-generate.js` memilih schema sesuai `DATABASE_URL`/`PRISMA_TARGET`. Prosedur baseline migration didokumentasikan. **Migrasi belum dijalankan** (menunggu kredensial Neon). |
| **B7** | Storage berbasis `fs` lokal; `server/dist` tidak berisi `fixtures/` → produksi 404 untuk semua GeoJSON & unduhan | ✅ Selesai | Abstraksi storage baru (`StorageDriver`, `LocalStorageDriver`, `VercelBlobStorageDriver`) + `copy-assets.js` pada `npm run build`. Terverifikasi: `server/dist/fixtures/geojson` berisi 9 berkas dan runtime terkompilasi menyajikan **541 fitur** GeoJSON nyata. |

Tambahan workstream dari brief (P0.5 rate limiting, P0.6 CORS, P0.7 integritas data, P0.8 tes) juga diselesaikan — lihat bagian 2.

---

## 2. Temuan Tambahan dan Penyelesaiannya

### 2.1 Rate limiting lintas instance (P0.5)

- `express-rate-limit` in-memory dihapus dari `app.ts`.
- Modul baru `server/src/middleware/rateLimiter.ts` dengan 6 policy: `global` (500/15 mnt), `auth` (60/15 mnt), `login` (10/15 mnt), `register` (5/60 mnt), `download` (100/60 mnt), `write` (30/mnt).
- Backend Upstash (`@upstash/ratelimit` + `@upstash/redis`, sliding window) dimuat **lazy** agar dev tidak butuh paket/kredensial.
- **Tidak ada fallback senyap.** Di `NODE_ENV=production` tanpa kredensial Upstash, server melempar `RATE_LIMIT_BACKEND_MISSING` saat cold start. Opt-out eksplisit tersedia lewat `RATE_LIMIT_ALLOW_MEMORY=true` (didokumentasikan sebagai tidak disarankan).
- `/health` melaporkan `rateLimiter.backend`, `.shared`, `.productionSafe`, dan `warning` bila tidak production-safe.
- Diterapkan ke: `POST /auth/login`, `POST /auth/register`, `POST /auth/google`, `GET /datasets/:id/download-file`, `POST /datasets/:id/download`, `GET /documents/:id/download`.

### 2.2 CORS wildcard (P0.6)

- `origin: '*'` dihapus.
- Produksi tanpa `CORS_ORIGIN` → **middleware CORS tidak dipasang sama sekali** (same-origin only, tanpa header wildcard).
- Bila `CORS_ORIGIN` diisi → hanya origin pada allow-list, `credentials: true`. Nilai `*` secara eksplisit dibuang oleh `resolveAllowedOrigins()`.
- Dev: `DEV_CLIENT_ORIGIN` default `http://localhost:5173`.
- `config.corsOrigin` yang sebelumnya tidak pernah dipakai sudah dieliminasi (tidak lagi direferensikan).
- `app.set('trust proxy', 1)` ditambahkan agar IP klien di belakang proxy Vercel benar (dipakai rate limiter).

### 2.3 Integritas data provider (P0.7)

| Temuan | Penyelesaian |
| --- | --- |
| `User.provider @default("google")` → registrasi email/password berlabel Google | Default diubah menjadi `@default("local")`; `register()` sekarang **menulis eksplisit** `provider: 'local'`, `emailVerified: false`. |
| `emailVerified @default(true)` → akun lokal tampak "terverifikasi" | Default diubah menjadi `@default(false)`. |
| Badge "Google Verified" dirender dari `user.provider === 'google'` inline | Diekstrak ke `client/src/utils/providerIdentity.ts` (`resolveProviderBadge`). Provider kosong/null diperlakukan sebagai **local**, bukan Google. |
| Data lama berpotensi salah label | `server/prisma/fixProviders.ts` — dry run default, `--apply` untuk menulis. Aturan berbasis bukti: punya hash bcrypt & tanpa `googleId` → `local`; punya `googleId` → `google`. **Hasil pada database saat ini: 0 record perlu diperbaiki** (akun demo memang ter-link Google secara historis, jadi labelnya akurat). |

### 2.4 Frontend (P0.7)

| Temuan | Penyelesaian |
| --- | --- |
| `<script src="https://accounts.google.com/gsi/client">` tidak terpakai | Dihapus dari `client/index.html`. |
| Leaflet CSS dimuat dua kali (CDN + bundle) | `<link>` unpkg dihapus; `import 'leaflet/dist/leaflet.css'` di `main.tsx` dipertahankan. Diverifikasi: `leaflet-container` ada di CSS hasil build (63,82 kB). |
| `/logo.svg` favicon 404 (tidak ada `client/public/`) | `client/public/` dibuat; `favicon.png` + `logo.png` dari aset Figma (`logo_geospasial.png`, 20.154 B). `index.html` menunjuk `/favicon.png`. |
| Pesan "Masuk dengan Google untuk Mengunduh" | Diganti "Masuk untuk Mengunduh" (`DownloadModal.tsx`). |
| Pesan error "Gagal login dengan akun Google" | Diganti "Gagal masuk menggunakan akun Ina-Geoportal" (`useAuthStore.ts`). |
| Pesan API "Login dengan akun Google diperlukan…" | Diganti "Login diperlukan…" (`datasetController.ts`, `documentController.ts`). |

### 2.5 Duplikat database SQLite — akar masalah ditemukan

Audit menyebut `server/prisma/server/prisma/dev.db` sebagai "stray duplicate". Investigasi Phase 14 menemukan penyebab sebenarnya:

| Berkas | Ukuran | Isi |
| --- | --- | --- |
| `server/prisma/dev.db` | 110.592 B | **Otoritatif** — 6 Category, 11 NetworkNode, 6 Dataset, 4 User, 1 Bookmark, 105 DownloadHistory |
| `server/prisma/server/prisma/dev.db` | 73.728 B | **0 baris di semua tabel** (hanya skema) |

**Penyebab:** `DATABASE_URL` di root `.env` berisi path relatif yang, karena Prisma me-resolve path SQLite relatif terhadap direktori `schema.prisma`, mengarah ke `server/prisma/server/prisma/dev.db`. Akibatnya proses yang berjalan dengan `cwd` root (mis. skrip verifikasi, tooling) membaca database **kosong** — katalog tampak 0 dataset tanpa error apa pun. Ini bukan sekadar berkas sisa; ini bug konfigurasi yang aktif.

**Tindakan:** nilai `DATABASE_URL` di root `.env` disamakan dengan `server/.env` (`file:./dev.db`), sehingga kedua entry point menunjuk berkas yang sama. Nilai tidak ditampilkan. Berkas kosong bersarang **tidak dihapus** (sesuai instruksi); sudah dibandingkan, didokumentasikan, dan diabaikan oleh `.gitignore` (`*.db`).

**Bukti sebelum/sesudah:** sebelum perbaikan, `GET /api/v1/datasets` lewat app yang di-import dari root mengembalikan **0** dataset; sesudah perbaikan mengembalikan data normal (`docs: 2` pada limit 2), dan `GET .../geojson` mengembalikan 541 fitur.

### 2.6 Temuan lain

- **`server/dist` tidak berisi fixtures** — dikonfirmasi dan diperbaiki lewat `server/scripts/copy-assets.js` yang dijalankan pada `npm run build` (menyalin 9 berkas, melaporkan bila `documents/` kosong).
- **`server/dist/__tests__` ikut terkompilasi** — `tsconfig.json` sekarang mengecualikan `src/__tests__`, sehingga bundle fungsi tidak membawa kode tes.
- **`GEOJSON_FILE_MAP` mati** di `datasetController.ts` (sisa jalur `fs`) — dihapus.
- **`googleAuthService` membuat `OAuth2Client` saat import** — dijadikan lazy (`getClient()`) agar import modul bebas efek samping dan tidak gagal saat `GOOGLE_CLIENT_ID` kosong.
- **Google GIS script, akun Google di UI** — lihat 2.4. Route `POST /api/v1/auth/google` **tetap hidup** (8 tes lama bergantung padanya) dan seluruh 44 tes server lama tetap lulus.

---

## 3. Berkas yang Diubah

### Dibuat

| Berkas | Fungsi |
| --- | --- |
| `.gitignore` | Higiene repo + proteksi secret |
| `api/index.ts` | Vercel Function untuk path `/api` |
| `api/[...path].ts` | Vercel Function catch-all `/api/*` (path asli diteruskan tanpa rewrite) |
| `vercel.json` | Build, output, fungsi, rewrite, header |
| `tsconfig.api.json` | Typecheck entry point Vercel (`npm run typecheck:api`) |
| `server/src/app.ts` | `createApp()` — aplikasi Express tanpa efek samping |
| `server/src/middleware/rateLimiter.ts` | Policy + backend Upstash/in-memory |
| `server/src/services/storage/types.ts` | Interface `StorageDriver`, error, sanitasi key, inferensi MIME |
| `server/src/services/storage/localDriver.ts` | Driver filesystem (dev/test) |
| `server/src/services/storage/blobDriver.ts` | Driver Vercel Blob (privat) |
| `server/src/services/storage/index.ts` | Pemilihan driver, konvensi key, cache + reset |
| `server/scripts/copy-assets.js` | Menyalin fixtures ke `dist` setelah `tsc` |
| `server/scripts/prisma-generate.js` | Memilih schema SQLite/PostgreSQL otomatis |
| `server/prisma/schema.postgres.prisma` | Varian PostgreSQL dari schema |
| `server/prisma/backup.ts` | Backup read-only + ringkasan integritas |
| `server/prisma/restoreBackup.ts` | Restore UUID-preserving (dry run default) |
| `server/prisma/uploadFixtures.ts` | Upload fixtures ke Blob (dry run default) |
| `server/prisma/fixProviders.ts` | Koreksi label provider berbasis bukti |
| `server/src/__tests__/phase14.test.ts` | 36 tes baru |
| `client/src/__tests__/phase14Provider.test.ts` | 6 tes baru |
| `client/src/utils/providerIdentity.ts` | Logika badge provider |
| `client/public/favicon.png`, `client/public/logo.png` | Favicon nyata |
| `client/.env.example` | Template env frontend |
| `scripts/verify-serverless-entry.ts` | Simulasi cold start Vercel |
| `scripts/verify-dist-runtime.cjs` | Verifikasi runtime hasil kompilasi |
| `scripts/compare-databases.cjs`, `scripts/inspect-users.cjs` | Diagnostik lokal (read-only) |
| `docs/POSTGRES_MIGRATION.md` | Prosedur migrasi Neon |
| `docs/VERCEL_DEPLOYMENT.md` | Runbook deployment |
| `PHASE_14_P0_REMEDIATION_REPORT.md` | Laporan ini |

### Dimodifikasi

| Berkas | Perubahan |
| --- | --- |
| `server/src/index.ts` | Hanya listen untuk dev; guard `NODE_ENV=test` dan `VERCEL` |
| `server/src/config/index.ts` | Validasi JWT, allow-list CORS, config Upstash/Blob, `assertRuntimeConfig()` |
| `server/src/controllers/datasetController.ts` | Download via storage driver; `await` service async; pesan non-Google; hapus `fs`/`path`/map mati |
| `server/src/controllers/documentController.ts` | Cek & stream dokumen via driver; `StorageObjectNotFoundError` → 404; pesan non-Google |
| `server/src/controllers/authController.ts` | `provider: 'local'`, `emailVerified: false` saat registrasi |
| `server/src/routes/{auth,dataset,document}Routes.ts` | Pemasangan rate limiter per endpoint |
| `server/src/services/realGeospatialService.ts` | Baca GeoJSON via storage; fungsi tetap async-friendly; telemetry dilestarikan |
| `server/src/services/googleAuthService.ts` | Lazy client |
| `server/prisma/schema.prisma` | Default `provider = "local"`, `emailVerified = false`, `binaryTargets`, komentar datasource |
| `server/package.json` | Script build/backup/restore/upload/fix, dependensi baru |
| `package.json` | `postinstall` (prisma generate), `typecheck:api`, build berlapis |
| `server/tsconfig.json` | Kecualikan `src/__tests__` |
| `.env.example`, `server/.env.example`, `client/.env.example` | Placeholder sah, tanpa secret |
| `README.md` | Contoh JWT_SECRET tidak lagi memuat nilai nyata |
| `client/index.html` | Hapus GIS script + Leaflet CDN; favicon; meta description |
| `client/src/components/catalog/DownloadModal.tsx` | Teks gate unduhan |
| `client/src/pages/UserProfilePage.tsx` | Badge/metode masuk via helper |
| `client/src/store/useAuthStore.ts` | Pesan error non-Google |
| `docs/IMPLEMENTATION_STATUS.md` | Baris Phase 14 |

### Berkas lokal (tidak akan di-commit)

| Berkas | Perubahan |
| --- | --- |
| `.env` (root) | `JWT_SECRET` dirotasi; `DATABASE_URL` diperbaiki agar menunjuk database otoritatif |
| `server/.env` | `JWT_SECRET` dirotasi (nilai identik dengan root, panjang 88 karakter) |

Nilai secret lama maupun baru **tidak** ditampilkan di laporan ini, di terminal, atau di berkas mana pun yang dapat di-commit.

### Dihapus

| Berkas | Alasan |
| --- | --- |
| `server/dist/__tests__/**` | Artefak build (kode tes tidak boleh masuk bundle produksi) |
| `scripts/tmp-*.ts` | Skrip investigasi sementara buatan Phase 14 |

Tidak ada berkas fixture, database, dokumen, atau aset desain yang dihapus.

---

## 4. Abstraksi Storage dan Kesiapan Migrasi Berkas

### 4.1 Antarmuka

`StorageDriver` menyediakan: `exists`, `getMeta`, `read`, `readText`, `createReadStream`, `upload`, `remove`, `getPublicUrl`.

| Implementasi | Lingkungan | Catatan |
| --- | --- | --- |
| `LocalStorageDriver` | dev/test | Root `server/src/fixtures` atau `server/dist/fixtures`; menolak path di luar root |
| `VercelBlobStorageDriver` | produksi | `@vercel/blob`, dimuat lazy; **semua objek `access: 'private'`** |

### 4.2 Keamanan berkas

- `sanitizeStorageKey()` menormalkan separator, membuang `.`/`..`, dan mengganti karakter tidak aman. `LocalStorageDriver` menambahkan pemeriksaan `path.resolve` + prefix root (defence in depth).
- `getPublicUrl()` mengembalikan `null` untuk store privat pada kedua driver. Tidak ada blob URL privat yang pernah dikirim ke klien.
- Nama unduhan dibersihkan (`[^a-zA-Z0-9_-]`), header `Content-Disposition: attachment` + `Cache-Control: private, no-store` untuk dokumen.
- 401 untuk anonim, 404 `FILE_NOT_FOUND` bila objek benar-benar tidak ada, tidak ada kebocoran path filesystem di respons.

### 4.3 Pemisahan data publik vs unduhan privat

Desain yang dipilih **tidak** membuat berkas privat dapat diakses publik demi Leaflet:

- Lapisan peta untuk webmap disajikan oleh **route API publik** `GET /api/v1/datasets/:id/geojson`. Server membaca objek dari storage lalu mengembalikan GeoJSON. Leaflet tidak pernah menghubungi blob storage.
- Unduhan berkas asli hanya lewat route terautentikasi (`.../download-file`, `.../download`, `/documents/:id/download`) yang memverifikasi JWT.
- `scope` (`public`/`private`) adalah **namespace key** (`public/...` vs `private/...`), bukan tingkat akses. Ini mencegah berkas tampilan tercampur dengan berkas asli, tanpa perlu satu pun objek menjadi publik.

### 4.4 Migrasi berkas yang ada

`npm run storage:upload --workspace=server` (dry run) / `-- --apply`:

- 9 berkas GeoJSON (2.798.171 B) → namespace `public/geojson` dan `private/geojson`.
- `server/src/fixtures/documents` **kosong (0 berkas)** → tidak ada yang diunggah, tidak ada PDF palsu dibuat.
- Skrip melaporkan setiap kegagalan per berkas dan tidak menghapus apa pun.

---

## 5. Kesiapan Migrasi PostgreSQL

### 5.1 Dual schema

| Berkas | Provider | Dipakai untuk |
| --- | --- | --- |
| `server/prisma/schema.prisma` | `sqlite` | pengembangan lokal |
| `server/prisma/schema.postgres.prisma` | `postgresql` | Neon / produksi |

Keduanya identik kecuali baris `provider` (dijaga oleh tes: jumlah & nama model sama, `uuid()` dipertahankan, tidak ada `autoincrement()`).

`prisma-generate.js` memilih schema dari `DATABASE_URL` (atau `PRISMA_TARGET`), sehingga klien Prisma yang dihasilkan selalu cocok dengan database tujuan — mencegah kesalahan umum "generate SQLite, sambung ke Postgres".

`binaryTargets = ["native", "rhel-openssl-3.0.x"]` untuk runtime Amazon Linux Vercel.

### 5.2 Prosedur (belum dijalankan)

1. `npm run db:backup --workspace=server` — snapshot read-only + ringkasan integritas.
2. Isi `DATABASE_URL` Neon (pooled, `sslmode=require&pgbouncer=true&connection_limit=1`).
3. `prisma migrate dev --schema=prisma/schema.postgres.prisma --name init` → baseline migration.
4. `npm run db:restore --workspace=server` (dry run) → `-- --apply`.
5. Verifikasi: jumlah record, login demo (bukti hash bcrypt portabel), `/stats/overview`.

Detail lengkap: `docs/POSTGRES_MIGRATION.md`.

### 5.3 Bukti keselamatan

| Aspek | Hasil |
| --- | --- |
| Backup | `server/prisma/backups/backup-2026-11-17T04-16-44-071Z.json` + `.summary.json` |
| Hitungan | `{categories:6, networkNodes:11, datasets:6, users:4, bookmarks:1, downloadHistory:105}` |
| Restore dry run | "Before" dan "Incoming" **identik** dengan hitungan di atas — 0 selisih |
| Hash password | bcrypt (`$2…`), portable; ringkasan hanya melaporkan prefix + panjang, tidak pernah hash utuh |
| UUID | `id String @id @default(uuid())`; tidak ada auto-increment → referensi bookmark/download tetap valid |
| SQLite | Tidak diubah, tidak dihapus, tidak dimigrasikan |

---

## 6. Perbaikan Keamanan

| Item | Sebelum | Sesudah |
| --- | --- | --- |
| JWT fallback | Hardcoded 39 karakter di source | Tidak ada fallback; gagal start bila tidak valid |
| JWT lokal | 39 karakter (nilai default lama) | Dirotasi ke 88 karakter acak (`RandomNumberGenerator`), tidak pernah dicetak |
| `.env.example` | Memuat nilai JWT nyata | Placeholder + perintah generator |
| `.gitignore` | Tidak ada | `.env`, `*.db`, `dist`, `node_modules`, `.vercel`, log, OS files |
| CORS | `origin: '*'` di semua lingkungan | Tanpa CORS di produksi (same-origin); allow-list eksplisit bila diisi |
| Rate limit | In-memory per instance | Upstash Redis bersama; gagal keras di produksi bila tidak dikonfigurasi |
| Storage | Path filesystem dapat diakses langsung | Abstraksi + sanitasi key + penolakan traversal + objek privat |
| Header | Tidak ada | `helmet` (CSP dimatikan untuk saat ini), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Trust proxy | Tidak diset | `trust proxy = 1` (IP klien benar untuk rate limit) |
| Google GIS script | Dimuat di semua halaman | Dihapus |
| Provider identity | Default `google` untuk akun lokal | Default `local` + helper badge + skrip rekonsiliasi |

**Rotasi secret lokal:** nilai baru dibuat secara acak, ditulis langsung ke `.env` dan `server/.env` tanpa pernah ditampilkan. Diverifikasi: kedua berkas identik, panjang 88, dan nilai lama tidak lagi ada. Tidak ada nilai yang masuk ke laporan, terminal, atau berkas yang dapat di-commit.

**Pernah ter-commit?** Tidak. `git status` mengembalikan `fatal: not a git repository` — belum pernah ada repositori Git di direktori ini, sehingga tidak ada commit historis yang memuat `.env` atau `*.db`. Ini bukan asumsi: repo memang belum ada.

**Audit direktori bersarang:** hanya ditemukan 3 `.env` (root, `client/`, `server/`) dan 3 `.env.example`. Tidak ada `.pem`, `.key`, `.p12`, `.pfx`, atau file kredensial lain di luar `node_modules`. `.env` berukuran identik 184 B (root & server) dan 23 B (`client/`), konsisten dengan 4/1 kunci.

---

## 7. Hasil Tes

| Suite | Sebelum | Sesudah | Delta |
| --- | --- | --- | --- |
| Server (`vitest`) | 44 | **80** | +36 |
| Client (`vitest`) | 46 | **52** | +6 |
| **Total** | **90** | **132** | **+42** |

Semua **132 lulus, 0 gagal**. Seluruh 90 tes lama tetap lulus tanpa perubahan perilaku (termasuk 8 tes Google OAuth yang sengaja dipertahankan).

### Cakupan tes baru (P0.8)

| Area | Tes |
| --- | --- |
| `JWT_SECRET` hilang | `JWT_SECRET_MISSING` |
| Validasi secret | terlalu pendek, nilai default lama, secret kuat diterima, `inspectJwtSecret` tidak membocorkan nilai |
| Production app import | `createApp()` tidak bind port; health endpoint; API surface tetap hidup |
| Vercel API route | kedua berkas entry ada, tidak memanggil `.listen()`, `export default app`, memanggil `resolveJwtSecret()` |
| Storage adapter | sanitasi key & traversal, inferensi MIME, metadata nyata, objek tidak ada, `StorageObjectNotFoundError`, tidak ada URL publik untuk scope privat |
| File not found | 404 `FILE_NOT_FOUND` untuk PDF yang memang tidak ada |
| Private file access | scope privat tidak pernah mengembalikan URL publik |
| Anonymous download denial | dataset & dokumen → 401, pesan tanpa kata "Google" |
| Authenticated download | login demo → stream 200 + `Content-Disposition: attachment` |
| CORS | allow-list kosong saat unset, `*` tidak pernah dianggap origin sah, parsing daftar |
| Skema PostgreSQL | provider benar, model identik, UUID dipertahankan, tanpa autoincrement, binary target Vercel, default provider `local` |
| Rate limiter bersama | policy per endpoint, login/register lebih ketat dari global, diagnostik tidak pernah mengklaim production-safe saat in-memory |
| Provider identity | akun lokal tidak pernah "Google Verified", `provider` null → local, user undefined tidak melempar, akun Google asli tetap terverifikasi |

### Verifikasi runtime (bukan sekadar unit test)

`npx tsx scripts/verify-serverless-entry.ts`:

```
NOTE: RATE_LIMIT_ALLOW_MEMORY=true (simulation only; real deploys need Upstash).
Port 47389 is free before import.
No port bound on import (serverless-safe).
Default export is callable.
GET /health → 200 (OK)
GET /api/v1/datasets → 200 (datasets=2)
GET /api/v1/__unknown__ → 404 (unmatched route, no crash)
RESULT: PASS
```

`node scripts/verify-dist-runtime.cjs` (menjalankan `server/dist`, bukan source):

```
dist fixtures present: true
GET .../ds-batas-kabkot/geojson → 200 | source=REAL_VERIFIED | features=541
POST /auth/login → 200
GET .../download-file → 200 | disposition="ds-batas-kabkot_real.geojson"
GET .../download-file (anonymous) → 401 (expected 401)
GET /documents → 200 | unavailable=8 (expected 8)
RESULT: PASS
```

Ini membuktikan tiga hal yang tidak bisa dibuktikan `npm run build` saja: fixtures ikut ke `dist`, unduhan asli terautentikasi, dan 8 dokumen memang tidak tersedia (tanpa PDF palsu).

### Vercel CLI

**Tidak tersedia di mesin ini** (`vercel` tidak terpasang; `npx --no-install vercel` gagal karena paket belum ada). Karena tidak ada izin deploy dan tidak ada kredensial, pengujian dengan `vercel dev`/`vercel deploy` **belum dilakukan**. Konsekuensinya dinyatakan jujur di bagian 10: routing `/api/*` pada platform belum terverifikasi secara langsung, hanya lewat simulasi handler Express di Node lokal.

---

## 8. Hasil Build

`npm run build` (root):

1. `npm run typecheck:api` → `tsc -p tsconfig.api.json` — **0 error**
2. `npm run build --workspace=server` → `tsc` — **0 error**, lalu `copy-assets.js`:
   - `[copy-assets] Copied 9 fixture file(s) → dist\fixtures`
   - `[copy-assets] documents/ is empty — official PDFs not yet published (expected).`
3. `npm run build --workspace=client` → `tsc` + `vite build` — **0 error**

| Artefak | Ukuran | Gzip |
| --- | --- | --- |
| `dist/index.html` | 1,34 kB | 0,72 kB |
| `dist/assets/index-*.css` | 63,82 kB | 14,81 kB |
| `dist/assets/index-*.js` | 3.440,90 kB | 649,29 kB |
| 10 aset PNG Figma | 20,15 – 143,95 kB | — |
| `dist/favicon.png` | 20.154 B | — |

Peringatan build yang tersisa: *"Some chunks are larger than 500 kB after minification"*. Ini **bukan** blocker fungsional, tetapi menjadi item P1 (lihat bagian 10).

---

## 9. Konfigurasi Manual yang Tersisa

Belum ada satu pun yang dijalankan. Semua memerlukan kredensial yang tidak tersedia dan tidak boleh dibuat tanpa persetujuan.

| # | Langkah | Di mana | Wajib? |
| --- | --- | --- | --- |
| 1 | Buat project Neon, salin connection string pooled | console.neon.tech | ✅ |
| 2 | Isi `DATABASE_URL` (+ `pgbouncer=true&connection_limit=1`) | Vercel env | ✅ |
| 3 | `prisma migrate dev --name init` (baseline) lalu commit `server/prisma/migrations/` | lokal | ✅ |
| 4 | `npm run db:backup` → `db:restore --apply` | lokal | ✅ |
| 5 | Buat Redis Upstash, salin REST URL + token | console.upstash.com | ✅ |
| 6 | Isi `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Vercel env | ✅ |
| 7 | Buat Blob store, salin token | Vercel → Storage | ✅ |
| 8 | Isi `BLOB_READ_WRITE_TOKEN`, `STORAGE_DRIVER=vercel-blob` | Vercel env | ✅ |
| 9 | Generate `JWT_SECRET` produksi baru (≥32 karakter) | Vercel env | ✅ |
| 10 | Biarkan `CORS_ORIGIN` **kosong** (same-origin) | Vercel env | ✅ |
| 11 | `npm run storage:upload --workspace=server -- --apply` | lokal, sekali | ✅ |
| 12 | `npm init` repositori Git, commit pertama, push ke GitHub | lokal | ✅ |
| 13 | Hubungkan repo ke Vercel / `vercel --prod` | Vercel | ✅ |
| 14 | Smoke test: `/health`, `/api/v1/datasets`, login demo, unduhan terautentikasi (200), anonim (401) | produksi | ✅ |
| 15 | (Opsional) Jalankan `vercel dev` sebagai verifikasi lokal terakhir | lokal | disarankan |

Catatan: langkah 12–13 sengaja **tidak** dikerjakan pada fase ini sesuai instruksi.

---

## 10. Blocker yang Masih Tersisa

Tidak ada lagi blocker P0 **di dalam kode**. Yang tersisa adalah hal yang secara desain berada di luar lingkup atau memerlukan keputusan/kredensial pengguna.

| # | Item | Tingkat | Dampak | Catatan |
| --- | --- | --- | --- | --- |
| R1 | Migrasi PostgreSQL belum dijalankan | Blocker deploy (operasional) | Deploy akan gagal saat query pertama bila `DATABASE_URL` masih SQLite | Prosedur siap; menunggu kredensial Neon |
| R2 | Upstash belum dikonfigurasi | Blocker deploy (by design) | Fungsi menolak cold start (`RATE_LIMIT_BACKEND_MISSING`) | Sengaja fail-fast, bukan bug |
| R3 | Blob token belum ada | Blocker deploy | `STORAGE_DRIVER=vercel-blob` tanpa token → `StorageConfigurationError` | Fixtures belum diunggah |
| R4 | Routing `/api/*` di platform belum diuji langsung | Risiko tinggi (belum terverifikasi) | Bila asumsi filesystem-routing Vercel berbeda, API bisa 404 | Mitigasi: dua entry file + dokumentasi smoke test; **wajib** diverifikasi lewat `vercel dev`/deploy |
| R5 | Bundle JS 3,44 MB dalam satu chunk | P1 (performa) | LCP buruk di jaringan lambat | Perlu `manualChunks` (react, leaflet, turf) |
| R6 | `real_batas_kabupaten.json` (2,44 MB) terduplikasi di `client/src/constants/demoGeojson/` dan `server/src/fixtures/geojson/` | P1 | Repo lebih besar; dua sumber kebenaran | Pertimbangkan satu sumber + endpoint |
| R7 | Rate limiter gagal-terbuka saat Upstash error | P1 (keamanan) | Permintaan tetap dilayani bila Redis down (dengan header `X-RateLimit-Degraded`) | Trade-off ketersediaan; bisa dibuat fail-closed untuk endpoint auth |
| R8 | CSP dimatikan (`contentSecurityPolicy: false`) | P1 | Perlindungan XSS berbasis header belum aktif | Perlu tuning inline style Vite/Tailwind |
| R9 | Route Google OAuth masih hidup | P1 (kebersihan) | Permukaan serangan tambahan | Dipertahankan agar 8 tes lama tetap lulus; kandidat dihapus di fase lanjut |
| R10 | Belum ada CI | P1 | Regresi tidak terdeteksi otomatis | GitHub Actions: `npm test` + `npm run build` |
| R11 | 8 PDF SDG tetap tidak tersedia | Bukan blocker kode | 8 dokumen 404 dengan pesan "Dokumen belum tersedia untuk diunduh." | Perilaku dipertahankan sesuai instruksi; menunggu publikasi resmi |

---

## 11. Status

# ✅ READY FOR P1

**Alasan:**

1. Ketujuh blocker P0 asli terselesaikan dan dapat dibuktikan (bagian 1, 7, 8).
2. Seluruh 90 tes lama tetap lulus; 42 tes baru menutup setiap area yang diminta P0.8 → **132/132**.
3. Build bersih di ketiga lapisan (`api` typecheck, server, client); fixtures benar-benar ada di `dist` dan terbukti dipakai runtime terkompilasi (541 fitur, unduhan 200, anonim 401).
4. Tidak ada secret yang terekspos; tidak ada fallback JWT; tidak ada CORS wildcard; tidak ada fallback rate limiter yang menyesatkan.
5. Tidak ada data yang dihapus, tidak ada migrasi destruktif, tidak ada PDF palsu, tidak ada deploy/commit/push.

**Syarat sebelum produksi (bukan penghalang P1):**

- Selesaikan langkah manual 1–15 di bagian 9.
- Verifikasi R4 (`vercel dev` atau preview deployment) sebelum cut-over. Ini satu-satunya asumsi arsitektural yang belum teruji di platform sebenarnya, dan saya tidak mengklaimnya bekerja hanya karena `npm run build` lulus.

**P1 berikutnya yang disarankan:** code-splitting (R5), de-duplikasi fixture 2,44 MB (R6), CSP (R8), CI (R10), lalu keputusan apakah route Google OAuth legacy dihapus (R9).

---

## Lampiran A — Perintah verifikasi yang dapat diulang

```bash
# typecheck entry point Vercel
npm run typecheck:api

# build penuh (server + client)
npm run build

# seluruh tes (132)
npm test

# simulasi cold start serverless
npx tsx scripts/verify-serverless-entry.ts

# runtime hasil kompilasi (fixtures, unduhan, 401 anonim, 8 dokumen kosong)
node scripts/verify-dist-runtime.cjs

# diagnostik database lokal (read-only, tidak mencetak hash)
node scripts/compare-databases.cjs

# backup read-only + ringkasan integritas
npm run db:backup --workspace=server

# dry run restore (tidak menulis)
npm run db:restore --workspace=server

# dry run upload fixtures (tidak mengunggah)
npm run storage:upload --workspace=server

# dry run koreksi provider (tidak menulis)
npm run seed:fix-providers --workspace=server
```

## Lampiran B — Ringkasan state lingkungan (tanpa nilai secret)

| Item | State |
| --- | --- |
| `.env` root | 4 kunci; `JWT_SECRET` 88 karakter (dirotasi); `DATABASE_URL` diperbaiki ke `file:./dev.db` |
| `server/.env` | 4 kunci; `JWT_SECRET` identik dengan root |
| `client/.env` | 1 kunci (`VITE_API_URL`) |
| `.env.example` (3 berkas) | Placeholder saja, tanpa nilai nyata |
| Panjang `JWT_SECRET` lama | 39 karakter (nilai default publik) — ditolak oleh validator |
| Panjang `JWT_SECRET` baru | 88 karakter acak — tidak pernah ditampilkan |
| Repositori Git | Belum ada (`fatal: not a git repository`) |
| Kebocoran commit historis | Tidak berlaku — belum pernah ada commit |
