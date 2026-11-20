# RENCANA MIGRASI DATABASE SQLITE KE POSTGRESQL (NEON / SUPABASE)
## INA-GEOPORTAL WEB APP REDESIGN V2.0

Dokumen ini merupakan panduan teknis langkah demi langkah untuk melakukan migrasi database dari SQLite lokal (`dev.db`) menuju database PostgreSQL produksi (disarankan **Neon Serverless PostgreSQL** atau **Supabase**) dengan jaminan **100% kelestarian data (zero data loss)**, **tanpa remapping UUID**, dan **tanpa gangguan otentikasi kata sandi pengguna**.

> **BATASAN TAHAP INI:**  
> Sesuai instruksi Phase 16.8, dokumen ini merupakan **rencana persiapan dan prosedur eksekusi**. Operator **DILARANG** menjalankan migrasi ke database produksi sebelum instance database PostgreSQL resmi dipersiapkan dan disetujui.

---

## 1. INVENTARISASI DATA SUMBER (PRE-MIGRATION INVENTORY)

Snapshot cadangan portabel telah dieksekusi secara *read-only* pada 20 November 2026 dan tersimpan di:
- **File Data Snapshot:** [`server/prisma/backups/backup-2026-11-20T05-31-37-854Z.json`](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/backups/backup-2026-11-20T05-31-37-854Z.json)
- **File Ringkasan Integritas:** [`server/prisma/backups/backup-2026-11-20T05-31-37-854Z.summary.json`](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/backups/backup-2026-11-20T05-31-37-854Z.summary.json)

### Tabel Rekapitulasi Entitas yang Harus Bermigrasi:
| Model Prisma | Jumlah Record | Tipe Kunci Primer (`id`) | Aturan Migrasi & Relasi |
|---|---:|---|---|
| `Category` | **6** | String (`cat-kebencanaan`, dll.) | Induk dari dataset. Dipulihkan pertama kali. |
| `NetworkNode` | **11** | String (`node-big`, `node-pupr`, dll.) | Induk dari dataset. Dipulihkan pertama kali. |
| `Dataset` | **6** | String (`ds-batas-kabkot`, dll.) | Berelasi ke `Category` dan `NetworkNode`. |
| `User` | **4** | String UUID v4 | Termasuk akun demo dan hash password bcrypt. |
| `Bookmark` | **1** | String UUID v4 | Berelasi ke `User` dan `Dataset` (`onDelete: Cascade`). |
| `DownloadHistory` | **316** | String UUID v4 | Audit trail unduhan. Berelasi ke `Dataset` dan opsional `User`. |
| **Total Record** | **344** | — | **Seluruh 344 baris wajib termigrasi utuh.** |

---

## 2. ANALISIS KOMPATIBILITAS SKEMA: SQLITE VS POSTGRESQL

File skema PostgreSQL telah siap di [`server/prisma/schema.postgres.prisma`](file:///c:/Users/Hype%20AMD/projek%20IMK/server/prisma/schema.postgres.prisma).

### Perbandingan Karakteristik Tipe Data:

| Aspek / Kolom | SQLite (`schema.prisma`) | PostgreSQL (`schema.postgres.prisma`) | Analisis & Jaminan Portabilitas |
|---|---|---|---|
| **Datasource Provider** | `sqlite` | `postgresql` | Menggunakan skema terpisah, dipicu otomatis oleh `server/scripts/prisma-generate.js`. |
| **Binary Targets** | `native` | `native`, `rhel-openssl-3.0.x` | Wajib untuk runtime Linux serverless Vercel (Amazon Linux 2023). |
| **Primary Keys (UUID)** | `@default(uuid())` (TEXT) | `@default(uuid())` (TEXT / VARCHAR) | Format UUID v4 string identik. Tidak ada ketergantungan pada integer autoincrement SQLite. |
| **Password Hashes** | String TEXT (`$2b$10$...`) | String TEXT (`$2b$10$...`) | Hash bcrypt bersifat portable antar-database. Pengguna dapat login langsung dengan kata sandi lama. |
| **Boolean Values** | Integer `0` / `1` | Native `BOOLEAN` (`true` / `false`) | Prisma ORM menangani konversi boolean secara otomatis saat re-insert. |
| **Timestamps** | String ISO-8601 | Native `TIMESTAMP(3)` | Prisma membaca ISO string dan menyimpannya sebagai timestamp mikrodetik native PostgreSQL. |
| **Foreign Keys** | SQLite FK constraints | PostgreSQL FK constraints | Skrip restore mengurutkan tabel induk terlebih dahulu (`Category`, `NetworkNode`, `User`) sebelum tabel anak. |
| **Unique Indexes** | `User(email)`, `Bookmark(userId, datasetId)` | Sama persis | Batasan unique diterapkan secara identik oleh PostgreSQL engine. |

---

## 3. PERSIAPAN DATABASE POSTGRESQL & CONNECTION POOLING

### Mengapa Connection Pooling Wajib untuk Vercel Serverless?
Vercel Functions bersifat stateless dan melakukan *horizontal auto-scaling*. Setiap instance fungsi baru akan membuka koneksi langsung ke PostgreSQL. Jika 50 pemanggilan terjadi bersamaan, 50 koneksi langsung dibuka dan dapat melampaui limit koneksi database (`max_connections exceeded`).

### Rekomendasi Solusi Provider:
1. **Neon Serverless PostgreSQL (Sangat Direkomendasikan):**
   - Mendukung autoscaling dan *built-in connection pooling* (pgBouncer).
   - Gunakan pooled connection string yang memiliki akhiran `-pooler`:
     ```
     postgresql://neondb_owner:PASSWORD@ep-random-12345-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1
     ```
2. **Supabase PostgreSQL:**
   - Gunakan connection pooler port `6543` (Transaction mode):
     ```
     postgresql://postgres.ref:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
     ```

---

## 4. PROSEDUR EKSEKUSI MIGRASI (STEP-BY-STEP)

Eksekusi migrasi dilakukan secara terkontrol dari mesin operator setelah PostgreSQL instance tersedia:

### Langkah 1: Kunci Cadangan Terbaru
Pastikan snapshot backup terbaru telah terverifikasi:
```bash
npm run db:backup --workspace=server
```
Periksa file `server/prisma/backups/backup-*.summary.json` untuk memastikan total 344 records dan zero orphaned relations (`bookmarksOrphaned: 0`, `downloadsOrphaned: 0`).

### Langkah 2: Set Variable Target PostgreSQL di Terminal Lokal
Set environment variable `DATABASE_URL` di sesi terminal lokal mengarah ke PostgreSQL produksi (jangan commit nilai ini):
```powershell
# Windows PowerShell
$env:DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1"
$env:PRISMA_TARGET="postgres"
```

### Langkah 3: Inisialisasi Skema pada PostgreSQL Target
Jalankan perintah `prisma db push` menggunakan skema PostgreSQL:
```bash
npx prisma db push --schema=server/prisma/schema.postgres.prisma
```
*Output yang diharapkan:*
```
🚀  Your database is now in sync with your Prisma schema. Done in 1.4s
```

### Langkah 4: Uji Coba Pemulihan Data (Dry-Run Restore)
Jalankan skrip restore dalam mode dry-run (tanpa penulisan ke database) untuk memverifikasi rencana pemulihan:
```bash
npm run db:restore --workspace=server
```
*Output yang diharapkan:*
```
--- Ina-Geoportal Backup Restore ---
Source : prisma\backups\backup-2026-11-20T05-31-37-854Z.json
Mode   : DRY RUN (no writes)
Before : {"categories":0,"networkNodes":0,"datasets":0,"users":0,"bookmarks":0,"downloadHistory":0}
Incoming: {"categories":6,"networkNodes":11,"datasets":6,"users":4,"bookmarks":1,"downloadHistory":316}
Dry run complete. Re-run with --apply to write.
```

### Langkah 5: Eksekusi Pemulihan Data Aktual (Apply Restore)
Terapkan pemulihan data ke database PostgreSQL target:
```bash
npm run db:restore --workspace=server -- --apply
```
Skrip akan menjalankan operasi *upsert* baris per baris dengan urutan dependensi relasional:
1. `Category` (6 baris)
2. `NetworkNode` (11 baris)
3. `User` (4 baris)
4. `Dataset` (6 baris)
5. `Bookmark` (1 baris)
6. `DownloadHistory` (316 baris)

### Langkah 6: Verifikasi Hasil Migrasi
Jalankan kueri validasi penghitungan baris pada PostgreSQL:
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([
  p.category.count(),
  p.networkNode.count(),
  p.dataset.count(),
  p.user.count(),
  p.bookmark.count(),
  p.downloadHistory.count()
]).then(([cat, node, ds, usr, bkm, dl]) => {
  console.log('PostgreSQL Verified Counts:', { cat, node, ds, usr, bkm, dl });
  process.exit(0);
});
"
```
**Kriteria Keberhasilan Mutlak:**
- `cat`: 6
- `node`: 11
- `ds`: 6
- `usr`: 4
- `bkm`: 1
- `dl`: 316
- **Delta selisih baris = 0.**

### Langkah 7: Pengujian Autentikasi Login Pasca-Migrasi
Uji coba login akun demo melalui API Express lokal yang diarahkan ke PostgreSQL:
- Email: `demo@inageoportal.go.id`
- Password: `Password123!`
- Respons yang diharapkan: `HTTP 200 OK` dengan token JWT valid.

---

## 5. RENCANA ROLLBACK & DISASTER RECOVERY

Jika terjadi kegagalan koneksi atau inkonsistensi saat eksekusi terhadap PostgreSQL target:
1. **Database SQLite Lokal Tetap Utuh:** File `server/prisma/dev.db` sama sekali tidak disentuh atau diubah selama proses eksekusi restore PostgreSQL.
2. **Revert Konfigurasi:** Hapus environment variable `DATABASE_URL` dari terminal lokal atau kembalikan ke `file:./dev.db` dan `PRISMA_TARGET=sqlite`.
3. **Regenerate Prisma Client Lokal:**
   ```bash
   npm run prisma:generate --workspace=server
   ```
4. Sistem lokal seketika kembali beroperasi normal pada database SQLite lokal tanpa ada data yang hilang.
