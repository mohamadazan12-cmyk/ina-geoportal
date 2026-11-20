# Cloudflare R2 Storage Setup & Production Migration Guide
# Ina-Geoportal Web App Redesign v2.0

Dokumen ini berisi panduan teknis langkah-demi-langkah bagi administrator/developer untuk melakukan konfigurasi Cloudflare R2 Object Storage dan menjalankan migrasi data geospasial nasional (1,09 GB) ke remote storage.

---

## 1. Mengapa Cloudflare R2?

Dataset geospasial nasional Ina-Geoportal berukuran besar (total 1,09 GB, termasuk file master batas wilayah 292 MB dan jalan nasional 126,8 MB).

| Karakteristik | AWS S3 | Cloudflare R2 |
|---|---|---|
| **Egress Fees (Biaya Transfer Keluar)** | ~$0.09 / GB | **$0.00 / GB (Gratis Selamanya)** |
| **Penyimpanan Gratis** | 5 GB (hanya 12 bulan pertama) | **10 GB / bulan gratis selamanya** |
| **API Compatibility** | Standar S3 | **100% S3-compatible API** |
| **Integrasi Edge / CDN** | CloudFront (biaya terpisah) | Terintegrasi langsung dengan Cloudflare CDN |

Cloudflare R2 menghilangkan beban biaya bandwidth (egress) saat ribuan pengguna mengunduh master dataset atau browser memuat puluhan chunk geospasial secara bersamaan.

---

## 2. Langkah-demi-Langkah Konfigurasi

### Langkah 1: Buat Akun & Bucket Cloudflare R2
1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Pada navigasi sebelah kiri, pilih **R2 Object Storage**.
3. Jika belum mengaktifkan R2, aktifkan paket R2 (tersedia free tier 10 GB/bulan).
4. Klik **Create bucket**.
5. Isi nama bucket, contoh: `ina-geoportal-data`.
6. Pilih lokasi bucket: **Automatic** (atau pilih region Asia Pacific terdekat).
7. Klik **Create Bucket**.

### Langkah 2: Buat API Token untuk R2
1. Pada menu **R2 Object Storage**, klik **Manage R2 API Tokens** (di sisi kanan).
2. Klik **Create API token**.
3. Beri nama token, misalnya: `ina-geoportal-uploader`.
4. Pilih Permissions: **Object Read & Write** (atau **Admin Read & Write** untuk manajemen penuh).
5. Pada bagian **Specify bucket(s)**, pilih bucket yang baru dibuat (`ina-geoportal-data`) atau *All buckets*.
6. Klik **Create API Token**.
7. Salin informasi berikut ke tempat yang aman:
   - **Account ID** (tercantum di halaman R2 atau di URL dashboard)
   - **Access Key ID**
   - **Secret Access Key**
   - **Jurisdiction Endpoint** / S3 Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

> [!CAUTION]
> Jangan pernah membagikan atau meng-commit `Secret Access Key` ke repository Git publik!

### Langkah 3: Konfigurasi Custom Domain & CORS pada Bucket Public
1. Masuk ke halaman bucket `ina-geoportal-data` di dashboard Cloudflare R2.
2. Buka tab **Settings** → **Public Access** → **Custom Domains**:
   - Hubungkan custom domain resmi: `data.inageoportal.go.id` (menggunakan sertifikat SSL otomatis Cloudflare dan zero egress caching di edge node Indonesia).
   > [!IMPORTANT]
   > Jangan mengandalkan subdomain `r2.dev` untuk lingkungan production karena memiliki rate limit dan tidak memiliki SLA publikasi pemerintah.
3. Buka tab **Settings** → **CORS Policy** → Tambahkan aturan CORS berikut:
   ```json
   [
     {
       "AllowedOrigins": [
         "https://inageoportal.go.id",
         "https://*.inageoportal.go.id",
         "http://localhost:5173",
         "http://localhost:5000"
       ],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*", "Range", "If-Modified-Since", "If-None-Match"],
       "ExposeHeaders": ["Content-Length", "Content-Range", "ETag", "X-Data-Source"],
       "MaxAgeSeconds": 86400
     }
   ]
   ```

---

## 3. Konfigurasi Environment Variables

Tambahkan baris berikut ke file `.env` di root repository:

```env
# Cloudflare R2 Single Public Bucket Configuration (Phase 16.4.1)
STORAGE_DRIVER=r2
R2_ACCOUNT_ID="masukkan_account_id_cloudflare_anda"
R2_ACCESS_KEY_ID="masukkan_access_key_id_anda"
R2_SECRET_ACCESS_KEY="masukkan_secret_access_key_anda"
R2_BUCKET_NAME="ina-geoportal-data"
R2_PUBLIC_URL="https://data.inageoportal.go.id"
```

---

## 4. Struktur Direktori Remote Storage (Single Public Bucket)

Berdasarkan keputusan arsitektur **Phase 16.4.1**, seluruh 70 dataset geospasial nasional bersifat publik terbuka tanpa login dan disimpan dalam satu bucket `ina-geoportal-data` dengan struktur kanonikal:

```
ina-geoportal-data/ (Single Public Bucket — https://data.inageoportal.go.id)
│
├── geojson/web/                                             <-- Web-Optimized Overview Layers
│   ├── real_batas_kabupaten.json                            (2,44 MB / 541 Kabkot Web Polygons)
│   ├── real_jalan_nasional.json                             (442 KB / 60 Koridor Strategis)
│   ├── real_rawan_bencana_gempa.json                        (134 KB / 47 Zona Bahaya Utama)
│   └── real_tutupan_lahan.json                              (142 KB / 200 Polygon Sample Overview)
│
├── datasets/                                                <-- Master Archives & Chunks
│   ├── ds-batas-kabkot/full/
│   │   └── real_batas_kabupaten_548.json                    (292,02 MB / 548 Master Polygons Lengkap)
│   ├── ds-jalan-nasional/full/
│   │   └── real_jalan_nasional_full.json                    (126,80 MB / 3.377 Ruas Lengkap)
│   ├── ds-rawan-gempa/chunks/
│   │   ├── chunk_0.json .. chunk_11430.json                 (52 Chunks / 613,30 MB / 11.439 Fitur)
│   │   └── (dimuat dinamis per viewport BBOX)
│   ├── ds-tutupan-lahan/partitions/
│   │   ├── reg_dki_jawa_barat.json                          (8 Makro Partisi / 54,75 MB / 1.999 Fitur)
│   │   ├── reg_kalimantan_ikn.json                          (250 Fitur IKN & Kalimantan)
│   │   └── (dimuat dinamis per regional query)
│   ├── ds-faskes/
│   │   └── real_fasilitas_kesehatan_national.json           (3,03 MB / 4.021 RS, Puskesmas, Klinik)
│   └── ds-rbi/
│       └── rbi_layers_registry.json                         (638 KB / 890 Layer Rupabumi Indonesia)
│
└── manifests/                                               <-- Spatial Index & Registry
    ├── gempa_manifest.json                                  (5,35 KB / Index 11.439 Poligon & 52 Chunks)
    └── tutupan_lahan_manifest.json                          (3,44 KB / Index 8 Partisi Makro)
```

---

## 5. Menjalankan Skrip Migrasi (`migrate_to_r2.ts`)

Skrip uploader resmi telah disediakan pada `server/scripts/migrate_to_r2.ts` dan terdaftar pada `server/package.json`.

Skrip ini dilengkapi fitur:
- **Streaming & Multipart Upload**: File besar dipecah menjadi chunks 10 MB dan diupload secara paralel.
- **Checkpoint & Resume**: Jika koneksi terputus di tengah jalan, jalankan kembali skrip — file yang sudah terverifikasi SHA256-nya di remote akan dilewati otomatis.
- **Integritas SHA256**: Melakukan verifikasi hash lokal sebelum upload dan memverifikasi kembali setelah upload.
- **Safe Dry-Run**: Menganalisis seluruh 70 file dan menghitung ukuran serta hash tanpa menyentuh storage.

### Perintah Eksekusi:

1. **Uji Coba Dry Run (Tanpa Kredensial / Simulasi):**
   ```bash
   npm run storage:migrate-r2 --workspace=server -- --dry-run
   ```

2. **Eksekusi Migrasi Penuh (Setelah Kredensial Terpasang):**
   ```bash
   npm run storage:migrate-r2 --workspace=server
   ```

3. **Verifikasi Integritas Saja (Tanpa Upload Ulang):**
   ```bash
   npm run storage:migrate-r2 --workspace=server -- --verify-only
   ```

4. **Upload Paksa / Overwrite:**
   ```bash
   npm run storage:migrate-r2 --workspace=server -- --force
   ```

---

## 6. Verifikasi Pasca-Migrasi

Setelah migrasi selesai:
1. Jalankan test suite backend untuk memastikan R2 driver aktif:
   ```bash
   npm test --workspace=server
   ```
2. Buka Webmap di browser:
   - Aktifkan layer **Kawasan Rawan Bencana Gempa Bumi**.
   - Zoom dan pan ke wilayah Jawa, Sumatra, atau Sulawesi — pastikan chunk dimuat secara dinamis.
3. Buka Download Center:
   - Unduh dataset master **Batas Administrasi Kabupaten/Kota (292 MB)** atau **Jalan Nasional (126.8 MB)**.
   - Pastikan backend memvalidasi sesi autentikasi dan melakukan streaming data dengan aman tanpa mengekspos bucket private ke publik.
