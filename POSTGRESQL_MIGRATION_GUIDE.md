# PANDUAN MIGRASI BASIS DATA: SQLITE KE NEON POSTGRESQL (PRODUKSI)

**Proyek:** Ina-Geoportal Web App Redesign v2.0  
**Target Lingkungan:** Neon Serverless PostgreSQL & Vercel Functions  
**Versi Dokumen:** 1.0 (Phase 17.0)  
**Status:** Teruji & Siap Eksekusi Operator  

---

## 1. Pendahuluan & Latar Belakang

Sistem Ina-Geoportal v2.0 dikembangkan menggunakan arsitektur *dual-database abstraction*:
1. **Development & Testing:** Basis data lokal SQLite (`server/prisma/dev.db`) menggunakan `server/prisma/schema.prisma`.
2. **Production:** Basis data cloud serverless PostgreSQL (Neon) menggunakan `server/prisma/schema.postgres.prisma`.

Panduan ini disusun untuk memandu operator atau pengembang dalam melakukan migrasi basis data dari SQLite pengembangan ke Neon PostgreSQL di lingkungan produksi Vercel tanpa kehilangan data (*zero data loss*), menjaga integritas relasional 100%, serta mempertahankan keaslian ID UUID dan hash kata sandi Bcrypt pengguna.

---

## 2. Arsitektur Dual Connection String (Neon)

Neon PostgreSQL dioptimalkan untuk arsitektur *serverless* (Vercel Functions) yang memerlukan dua jenis URL koneksi:

```
+-------------------------------------------------------------------------------+
|                                ARSITEKTUR KONEKSI                             |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [Vercel Serverless Functions] -----> DATABASE_URL (Port 6543 / PgBouncer)     |
|  - Koneksi pooled (`-pooler` host)                                            |
|  - `pgbouncer=true&connection_limit=1`                                        |
|  - Mencegah kehabisan koneksi (connection exhaustion)                         |
|                                                                               |
|  [Prisma DDL CLI / Migrations] -----> DIRECT_URL (Port 5432 / Direct)          |
|  - Koneksi langsung (non-pooled host)                                         |
|  - Mendukung advisory locking & transaksi skema DDL                           |
|  - Digunakan saat `prisma migrate deploy` atau `prisma db push`               |
|                                                                               |
+-------------------------------------------------------------------------------+
```

### Konfigurasi Prisma Datasource
File skema [schema.postgres.prisma](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/schema.postgres.prisma) telah dikonfigurasi secara resmi:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 3. Prasyarat & Persiapan Operator

Sebelum menjalankan migrasi, pastikan operator telah memiliki:
1. Akun Neon ([neon.tech](https://neon.tech)) aktif dengan *project* baru untuk Ina-Geoportal.
2. Dua connection string dari Dashboard Neon:
   - **Pooled connection string:**
     `postgresql://<user>:<password>@<project-id>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1`
   - **Direct connection string:**
     `postgresql://<user>:<password>@<project-id>.<region>.aws.neon.tech/neondb?sslmode=require`
3. Node.js v18+ dan NPM terpasang pada terminal operator.
4. Snapshot data SQLite mutakhir:
   - Berkas: [backup-2026-11-20T07-12-08-183Z.json](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/backups/backup-2026-11-20T07-12-08-183Z.json)
   - Berkas audit: [backup-2026-11-20T07-12-08-183Z.summary.json](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/backups/backup-2026-11-20T07-12-08-183Z.summary.json)
   - Total rekord: **357 baris data** (6 Kategori, 11 Simpul Jaringan, 6 Dataset, 5 Pengguna, 1 Bookmark, 328 Riwayat Unduhan).

---

## 4. Langkah-Langkah Eksekusi Migrasi

### Langkah 1: Set Environment Variables Sementara pada Terminal Operator
Atur variabel lingkungan terminal agar Prisma mengarah ke database produksi Neon (jangan mencetak kredensial ke layar publik):

**PowerShell (Windows):**
```powershell
$env:DATABASE_URL="postgresql://<user>:<password>@<project-id>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1"
$env:DIRECT_URL="postgresql://<user>:<password>@<project-id>.<region>.aws.neon.tech/neondb?sslmode=require"
```

**Bash / macOS / Linux:**
```bash
export DATABASE_URL="postgresql://<user>:<password>@<project-id>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1"
export DIRECT_URL="postgresql://<user>:<password>@<project-id>.<region>.aws.neon.tech/neondb?sslmode=require"
```

---

### Langkah 2: Buat Skema Tabel di PostgreSQL Menggunakan Prisma DDL
Jalankan sinkronisasi skema ke database Neon target menggunakan skema PostgreSQL:

```bash
npx prisma db push --schema=server/prisma/schema.postgres.prisma
```
*Catatan:* Perintah ini menggunakan `DIRECT_URL` secara otomatis di balik layar untuk membuat seluruh 6 tabel relasional, indeks, dan relasi kunci asing pada PostgreSQL.

---

### Langkah 3: Generate Prisma Client untuk PostgreSQL
Jalankan pembuatan klien runtime yang kompatibel dengan PostgreSQL:

```bash
npx prisma generate --schema=server/prisma/schema.postgres.prisma
```

---

### Langkah 4: Uji Coba Restorasi Data (*Dry-Run*)
Sebelum menulis data ke produksi, jalankan skrip restorasi dalam mode *dry-run* (default aman):

```bash
npm run db:restore --workspace=server
```

**Ekspektasi Output Terminal:**
```text
[DryRun] Validating backup file integrity...
[DryRun] Target snapshot: backup-2026-11-20T07-12-08-183Z.json
[DryRun] Categories to restore: 6
[DryRun] Network Nodes to restore: 11
[DryRun] Datasets to restore: 6
[DryRun] Users to restore: 5
[DryRun] Bookmarks to restore: 1
[DryRun] Download History to restore: 328
[DryRun] Total records to process: 357
[DryRun] DRY RUN COMPLETED: All records valid. No changes applied to database.
```

---

### Langkah 5: Eksekusi Restorasi Data Sebenarnya (*Live Apply*)
Setelah hasil dry-run dinyatakan valid, terapkan seluruh data ke Neon PostgreSQL dengan flag `--apply`:

```bash
npm run db:restore --workspace=server -- --apply
```

Skrip restorasi bekerja secara topologis berurutan:
1. `[1/6]` Upsert Kategori (`Category`) &rarr; 6 rekord.
2. `[2/6]` Upsert Simpul Jaringan (`NetworkNode`) &rarr; 11 rekord.
3. `[3/6]` Upsert Dataset Geospasial (`Dataset`) &rarr; 6 rekord.
4. `[4/6]` Upsert Akun Pengguna (`User`) &rarr; 5 rekord (termasuk hash kata sandi Bcrypt `$2b$` dan profil).
5. `[5/6]` Upsert Bookmark Pengguna (`Bookmark`) &rarr; 1 rekord (menggunakan kunci unik gabungan `userId_datasetId`).
6. `[6/6]` Upsert Riwayat Unduhan (`DownloadHistory`) &rarr; 328 rekord (termasuk status `REDIRECTED` dan `APPROVED`).

---

## 5. Verifikasi Pasca-Migrasi (Verification Checklist)

Jalankan pengecekan kuantitatif dan fungsional setelah restorasi selesai:

### 1. Verifikasi Jumlah Rekord di Database Produksi
Buka Neon SQL Editor atau jalankan query berikut untuk memastikan seluruh data telah masuk:

```sql
SELECT 'categories' AS table_name, COUNT(*) AS total FROM "Category"
UNION ALL
SELECT 'network_nodes', COUNT(*) FROM "NetworkNode"
UNION ALL
SELECT 'datasets', COUNT(*) FROM "Dataset"
UNION ALL
SELECT 'users', COUNT(*) FROM "User"
UNION ALL
SELECT 'bookmarks', COUNT(*) FROM "Bookmark"
UNION ALL
SELECT 'download_history', COUNT(*) FROM "DownloadHistory";
```

**Hasil yang Harus Muncul:**
| table_name | total |
|---|---|
| `categories` | **6** |
| `network_nodes` | **11** |
| `datasets` | **6** |
| `users` | **5** |
| `bookmarks` | **1** |
| `download_history` | **328** |

### 2. Verifikasi Autentikasi Pengguna
Uji login menggunakan akun pengguna yang dimigrasikan:
- **Akun Demo:** `demo@inageoportal.go.id` / `Password123!`
- Pastikan endpoint `POST /api/v1/auth/login` mengembalikan HTTP `200 OK` dan cookie sesi `ina_geo_token` terbit dengan benar.
- Pastikan hash kata sandi Bcrypt terverifikasi sempurna tanpa perlu reset password.

### 3. Verifikasi Isolasi Unduhan & Bookmark
- Login sebagai akun demo, buka `/profile`, dan pastikan riwayat unduhan menampilkan 328 aktivitas pengunduhan geospasial.
- Pastikan dataset bookmark (`ds-batas-kabkot`) tetap tersimpan dan dapat diakses.

---

## 6. Prosedur Rollback & Rencana Kontinjensi

Apabila terjadi kendala koneksi atau kegagalan tak terduga pada lingkungan produksi Neon:

1. **Keutuhan Database Lokal Terjamin:**
   Basis data lokal SQLite ([dev.db](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/dev.db)) sama sekali tidak tersentuh selama proses migrasi dan tetap berisi data operasional lengkap.
2. **Revert Environment Variables di Vercel:**
   Jika Vercel Functions mengalami *timeout* atau kendala konfigurasi PostgreSQL, hapus sementara `DATABASE_URL` atau alihkan ke instance PostgreSQL cadangan.
3. **Penyimpanan Cloudflare R2 Independen:**
   Seluruh 70 aset geospasial pada bucket `ina-geoportal-data` di Cloudflare R2 bersifat independen dari database relasional dan tetap dapat diakses publik melalui endpoint CDN tanpa terpengaruh kondisi database.

---

## 7. Rujukan File & Skrip Terkait

- [schema.postgres.prisma](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/schema.postgres.prisma) - Definisi skema PostgreSQL dengan dual connection string.
- [restoreBackup.ts](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/restoreBackup.ts) - Skrip restorasi data topologis idempoten.
- [backupData.ts](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/backupData.ts) - Skrip snapshot pencadangan data SQLite.
- [PHASE_17_0_POSTGRESQL_MIGRATION_REPORT.md](file:///c:/Users/Hype%20AMD/projek%20IMK/PHASE_17_0_POSTGRESQL_MIGRATION_REPORT.md) - Laporan teknis pengujian dan audit Phase 17.0.
