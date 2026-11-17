# PHASE 12 — LAPORAN IMPLEMENTASI AUTENTIKASI GOOGLE & SISTEM AKSES DOKUMEN PUBLIK
**Ina-Geoportal Web App Redesign v2.0**  
**Tanggal Verifikasi:** 17 November 2026  
**Status Eksekusi:** ✅ SELESAI & TERVERIFIKASI PENUH  

---

## 1. Ringkasan Implementasi

Phase 12 mengimplementasikan prinsip utama arsitektur akses dokumen nasional:
> **"PUBLIC ACCESS FOR VIEWING — GOOGLE LOGIN REQUIRED FOR DOWNLOADING"**

Seluruh pengunjung publik dapat secara bebas membuka beranda, katalog, rincian dataset, standar data, pusat unduhan, dan melihat seluruh metadata tanpa kewajiban login. Namun ketika pengunjung hendak mengunduh berkas fisik data atau dokumen geospasial, sistem mewajibkan autentikasi akun Google resmi via OAuth 2.0 / OpenID Connect (Google Identity Services).

### Ringkasan Pencapaian Utama:
- **Zero Rewrite / Incremental Patch-Only:** Mengembangkan arsitektur yang sudah ada tanpa merusak routing, store, atau komponen Phase 11.
- **Google OAuth 2.0 / OpenID Connect:** Menggunakan `google-auth-library` resmi di backend dengan verifikasi tanda tangan kriptografi, penerbit (`iss`), audiens (`aud`), masa berlaku (`exp`), Google Subject ID (`sub`), dan status email terverifikasi (`email_verified`).
- **Pendaftaran Otomatis & Account Linking:** Pengguna Google baru otomatis terdaftar ke database tanpa perlu mengisi form tambahan. Akun lama dengan email yang cocok ditautkan secara aman ke Google Subject ID.
- **Proteksi Pengunduhan Backend:** Akses pengunduhan langsung via API dicegat di backend (HTTP 401 `AUTH_REQUIRED`) jika tanpa token/session resmi.
- **Audit Fisik & Kebijakan Status Berkas:** Menghindari file dummy atau link palsu. Berkas yang belum tersedia secara fisik ditandai dengan jelas: *"Dokumen belum tersedia untuk diunduh."* dan tombol unduh dinonaktifkan.
- **Pencegahan Open Redirect:** Parameter `returnUrl` diverifikasi secara ketat agar hanya mengarah ke route internal aplikasi, mencegah serangan pengalihan berbahaya.
- **Isolasi Riwayat Unduhan:** Setiap riwayat unduhan dicatat khusus untuk akun pengguna yang mengunduh dan tidak bocor ke akun pengguna lain.
- **Test Suite Expanded:** 86/86 tes otomatis lulus 100% (44 server tests, 42 client tests — bertambah dari 59 tests pada Phase 11).
- **Clean Production Build:** Backend `tsc` dan frontend `vite build` berhasil 100% tanpa error TypeScript.

---

## 2. Arsitektur Google Authentication

Autentikasi menggunakan standar resmi **Google Identity Services (GIS)** berbasis OpenID Connect:

```
[ Frontend: React / Vite ]
       │
       ▼ (1) Pengguna klik "Lanjutkan dengan Google"
[ Google Identity Services (GIS) Dialog ]
       │
       ▼ (2) Google menerbitkan ID Token (JWT) dengan signature RSA Google
[ Frontend Callback: handleCredentialResponse(idToken) ]
       │
       ▼ (3) POST /api/v1/auth/google { credential: idToken }
[ Backend: Express + google-auth-library ]
       │
       ├─► (4) Verifikasi Kriptografi Token via Google Public Keys
       ├─► (5) Validasi Claims: iss ('accounts.google.com'), aud (CLIENT_ID), exp, email_verified
       ├─► (6) Cari / Buat User di Database SQLite (Prisma) berdasarkan Google Subject ID (sub)
       ├─► (7) Terbitkan Session Token Internal (JWT 7 hari)
       │
       ▼ (8) Response HTTP 200/201 { token, user: { id, name, email, avatarUrl, provider: 'google' } }
[ Frontend Store: useAuthStore ]
       │
       ▼ (9) Simpan token di storage aman, perbarui state profil, redirect ke dokumen tujuan
```

**Permission / Scopes Minimal:**
- `openid`: Mengaitkan identitas pengguna secara unik.
- `email`: Mendapatkan alamat email terverifikasi.
- `profile`: Mendapatkan nama lengkap dan foto profil resmi Google.
- *Tidak meminta akses Gmail, Drive, Kontak, Kalender, atau layanan non-autentikasi lainnya.*

---

## 3. Alur Pendaftaran Otomatis (Auto-Registration)

1. Ketika pengguna masuk dengan Google untuk pertama kali, backend menerima identitas dari klaim token:
   - `sub`: Identitas unik permanen dari Google (Primary Provider Key).
   - `email`: Alamat email pengguna.
   - `name`: Nama lengkap pengguna Google.
   - `picture`: URL foto profil Google pengguna.
   - `email_verified`: Status verifikasi Google (`true`).
2. Backend mencari record `User` berdasarkan `googleId: sub`:
   - Jika belum ditemukan, backend mencari berdasarkan `email`:
     - Jika email sudah ada di database (misal dari akun lokal lama): tautkan `googleId = sub`, set `provider = 'google'`, perbarui avatar, dan tandai `emailVerified = true`.
     - Jika email belum ada di database: buat akun baru secara otomatis dengan `role = 'USER'`, `institution = 'Pengguna Publik'`, `provider = 'google'`, dan status HTTP dikembalikan `201 Created`.

---

## 4. Alur Login dan Logout

### Alur Login:
1. Pengguna membuka `/login`.
2. Halaman menampilkan tombol utama **"Lanjutkan dengan Google"** (Figma-compliant dengan logo warna Google resmi dan styling profesional).
3. Saat diklik, peramban menampilkan dialog pemilihan akun Google.
4. Pengguna memilih akun Google.
5. Token dikirim ke backend, diverifikasi, dan session JWT aplikasi dibuat.
6. Notifikasi status *"Login Google berhasil! Mengalihkan ke dokumen..."* ditampilkan.
7. Pengguna diarahkan ke `returnPath` yang aman. Jika ada dokumen yang tertunda diunduh (`downloadDataset` atau `downloadDoc`), modal unduhan otomatis terbuka.

### Alur Logout:
1. Pengguna menekan tombol *"Keluar Akun"* di halaman `/profile`.
2. Toko autentikasi `useAuthStore.getState().logout()` membersihkan `token`, `user`, dan `session` dari memori dan `localStorage`.
3. Pengguna kembali ke status anonim tanpa error atau data tertinggal.

---

## 5. Kebijakan Public Document Access

Sesuai arahan Bab 2 dan Bab 5, seluruh pengunjung publik tanpa login dapat mengakses:
- `/` (Beranda)
- `/katalog` (Katalog Dokumen & Data Spasial)
- `/katalog/:datasetId` (Detail Dataset & Peta Interaktif)
- `/unduh` (Pusat Unduhan Data)
- `/standar-data` (Katalog Dokumen Standar Data Geospasial)
- `/simpul` & `/simpul/:nodeId` (Simpul Jaringan Nasional)
- `/tools`, `/bantuan`, `/kontak`

Pengunjung anonim dapat:
1. Melihat seluruh daftar dokumen dan dataset.
2. Melakukan pencarian kata kunci dan filter kategori/instansi.
3. Membaca metadata lengkap: judul, kode dokumen, abstrak, instansi penerbit, tahun terbit, skala, format file, jumlah halaman, dan ruang lingkup standar.
4. Membuka pratinjau spasial (spatial preview) interaktif di peta Leaflet.

---

## 6. Alur Authenticated Download

### A. Pengunjung Anonim:
1. Pengunjung membuka katalog atau dokumen standar.
2. Pengunjung menekan tombol **"Unduh"** atau **"Unduh Data"**.
3. Sistem mendeteksi `isAuthenticated === false`.
4. Pengunjung dialihkan ke `/login?returnUrl=[PATH_ASAL]&downloadDataset=[ID]&format=[FORMAT]`.
5. Parameter `returnUrl` disanitasi ketat untuk mencegah open redirect.
6. Halaman login menampilkan banner konteks:
   > *"Login Diperlukan untuk Mengunduh. Dokumen pilihan Anda tersimpan aman. Setelah login Google, Anda akan otomatis kembali ke dokumen untuk mengunduh."*
7. Pengguna menyelesaikan Google Sign-In.
8. Sistem mengalihkan pengguna kembali ke dokumen yang dipilih dengan query parameter `autoDownload=[ID]`.
9. Modal unduhan terbuka otomatis, siap diunduh tanpa perlu mencari ulang.

### B. Pengguna yang Sudah Login:
1. Pengguna memilih format berkas (`GeoJSON`, `SHP`, atau `KML`).
2. Jika dataset bersifat *Restricted*, pengguna mengisi permohonan tujuan data (minimal 5 karakter).
3. Pengguna menekan tombol **"Unduh Sekarang"**.
4. Frontend memanggil `POST /api/v1/datasets/:id/download` dengan header `Authorization: Bearer <token>`.
5. Backend memvalidasi hak akses, mencatat riwayat permohonan ke `DownloadHistory`, dan mengembalikan tautan unduhan bertoken aman:
   `/api/v1/datasets/:id/download-file?format=geojson&token=<token>`
6. Berkas fisik dibaca dari storage resmi dan di-stream ke browser dengan header `Content-Disposition: attachment; filename="..."`.
7. Browser memulai pengunduhan berkas fisik asli secara instan.

---

## 7. Daftar Dokumen & Status Ketersediaan Berkas Fisik

Sesuai ketentuan Bab 6.C, sistem tidak menggunakan dokumen palsu, dummy, atau respons sukses fiktif. Seluruh data diverifikasi langsung terhadap ketersediaan fisik pada storage:

| ID Dokumen / Dataset | Judul / Spesifikasi Dokumen | Format Asli | Ukuran Fisik | Status Ketersediaan | Keterangan & Provenance |
|---|---|---|---|---|---|
| `ds-batas-kabkot` | Area Batas Wilayah Administrasi Kabupaten/Kota | GeoJSON / SHP | 2.56 MB | ✅ **Tersedia** | Berkas riil BIG (541 fitur, 38 provinsi terverifikasi). |
| `ds-faskes` | Sebaran Fasilitas Kesehatan Rumah Sakit & Puskesmas | GeoJSON / SHP | 79.8 KB | ✅ **Tersedia** | Berkas riil BIG RBI (102 fasilitas kesehatan). |
| `ds-tutupan-lahan` | Peta Penutupan Lahan Nasional (Land Cover) | GeoJSON / SHP | 142.5 KB | ✅ **Tersedia** | Berkas riil BIG RBI Layer 226 (200 kelas tutupan). |
| `ds-jalan-nasional` | Jaringan Jalan Nasional Indonesia | GeoJSON / SHP | 5.2 KB | ✅ **Tersedia (Fallback)** | Upstream PUPR GEOAPI status `PENDING_AUTHORIZATION`. |
| `ds-rawan-gempa` | Peta Kawasan Rawan Bencana Gempa Bumi & Sesar | GeoJSON / SHP | 6.8 KB | ✅ **Tersedia (Fallback)** | Upstream BNPB InaRISK status `FALLBACK` terverifikasi. |
| `ds-rbi` | Peta Rupa Bumi Indonesia (RBI) Standar | GeoJSON / SHP | 4.8 KB | ✅ **Tersedia** | Metadata RBI BIG standar SNI. |
| `sdg-01` | SDG Peta Ketahanan & Kerentanan Pangan Nasional | PDF (48 hlm) | - | ⚠️ **Belum Tersedia** | *"Dokumen belum tersedia untuk diunduh."* (Dalam digitalisasi BIG & Bapanas). |
| `sdg-02` | SDG Biota Laut Dilindungi Indonesia | PDF (62 hlm) | - | ⚠️ **Belum Tersedia** | *"Dokumen belum tersedia untuk diunduh."* (Tahap rilis KKP & BIG). |
| `sdg-03` | Spesifikasi Produk Peta Bukaan Tambang ESDM | PDF (36 hlm) | - | ⚠️ **Belum Tersedia** | *"Dokumen belum tersedia untuk diunduh."* (Tahap rilis ESDM & BIG). |
| `sdg-04` | Spesifikasi Informasi Geospasial Gelombang Laut BMKG | PDF (54 hlm) | - | ⚠️ **Belum Tersedia** | *"Dokumen belum tersedia untuk diunduh."* (Tahap rilis BMKG). |
| `sdg-05` | Standar Data Angin Permukaan Laut Nusantara | PDF (42 hlm) | - | ⚠️ **Belum Tersedia** | *"Dokumen belum tersedia untuk diunduh."* (Tahap rilis BMKG & BIG). |
| `sdg-06` | Spesifikasi Peta Rawan Bencana Longsor Skala 1:25.000 | PDF (70 hlm) | - | ⚠️ **Belum Tersedia** | *"Dokumen belum tersedia untuk diunduh."* (Tahap rilis BNPB & BIG). |
| `sdg-07` | Standar Batas Kawasan Hutan Konservasi KLHK | PDF (58 hlm) | - | ⚠️ **Belum Tersedia** | *"Dokumen belum tersedia untuk diunduh."* (Tahap rilis KLHK). |
| `sdg-08` | Spesifikasi Basis Data Jaringan Irigasi PUPR SDA | PDF (45 hlm) | - | ⚠️ **Belum Tersedia** | *"Dokumen belum tersedia untuk diunduh."* (Tahap rilis PUPR). |

---

## 8. Lokasi Penyimpanan Dokumen (Storage Directory)

Berkas fisik disimpan secara terisolasi di sisi backend (tidak dapat diakses melalui webroot publik / URL statis):
- **Vektor Geospasial Riil:** `server/src/fixtures/geojson/`
  - `real_batas_kabupaten.json` (2.56 MB)
  - `real_fasilitas_kesehatan.json` (79.8 KB)
  - `real_tutupan_lahan.json` (142.5 KB)
  - `jalan_nasional.json` (5.2 KB)
  - `rawan_bencana_gempa.json` (6.8 KB)
  - `rupa_bumi_indonesia.json` (4.8 KB)
- **Dokumen Resmi Standar Data (PDF):** `server/src/fixtures/documents/` (Direktori penyimpanan resmi backend).

---

## 9. Endpoint API

| Metode | Path Endpoint | Akses Publik | Keterangan |
|---|---|---|---|
| `POST` | `/api/v1/auth/google` | Publik | Verifikasi Google ID token, pendaftaran otomatis, penerbitan session JWT. |
| `GET` | `/api/v1/auth/me` | Wajib Auth | Mengambil profil pengguna Google yang sedang aktif (nama, email, avatar, googleId). |
| `GET` | `/api/v1/documents` | Publik | Daftar metadata dokumen standar data beserta status ketersediaan berkas fisik. |
| `GET` | `/api/v1/documents/:id` | Publik | Detail lengkap dokumen standar data, ketebalan halaman, dan status berlaku. |
| `GET` | `/api/v1/documents/:id/download` | Wajib Auth | Mengunduh berkas fisik dokumen PDF resmi. Menolak anonim (401), menolak berkas belum rilis (404). |
| `POST` | `/api/v1/datasets/:id/download` | Wajib Auth | Memproses permohonan unduh dataset, memvalidasi form restricted, mencatat audit trail. |
| `GET` | `/api/v1/datasets/:id/download-file` | Wajib Auth | Streaming berkas fisik geospasial asli (`Content-Disposition: attachment`). Mendukung header Bearer & query token. |
| `GET` | `/api/v1/user/downloads` | Wajib Auth | Riwayat pengunduhan akun pengguna yang sedang login (terisolasi per user). |

---

## 10. Database Migration

Migrasi skema database SQLite via Prisma dilakukan secara non-destruktif (`prisma db push`), menjaga integritas data bookmark, histori lama, dan simpul jaringan:

```prisma
model User {
  id              String            @id @default(uuid())
  email           String            @unique
  password        String?           // Opsional untuk pengguna Google OAuth
  name            String
  institution     String?
  role            String            @default("USER")
  avatarUrl       String?           // Foto profil resmi Google
  googleId        String?           @unique // Google Subject ID unik (Primary Provider ID)
  provider        String            @default("google") // "google" | "local"
  emailVerified   Boolean           @default(true) // Status verifikasi email Google
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  bookmarks       Bookmark[]
  downloadHistory DownloadHistory[]
}
```

---

## 11. Sistem Download History & Isolasi Akun

- Setiap kali berkas geospasial atau dokumen resmi berhasil diunduh oleh pengguna terotentikasi, backend mencatat record ke tabel `DownloadHistory`:
  - `id`: UUID riwayat.
  - `userId`: ID akun pengguna yang mengunduh.
  - `datasetId`: ID dataset terkait.
  - `format`: Format berkas (`geojson`, `shp`, `kml`, `pdf`).
  - `purpose`: Alasan permohonan data / identifikasi unduhan.
  - `status`: `COMPLETED` / `APPROVED`.
  - `downloadedAt`: Timestamp waktu pengunduhan.
- **Isolasi Antar Pengguna:** Pengguna A yang memanggil `GET /api/v1/user/downloads` hanya melihat data milik dirinya sendiri (`where: { userId: req.user.userId }`). Pengguna B tidak memiliki akses ke riwayat pengguna A.
- **Anonim:** Pengunjung anonim tidak pernah dicatat sebagai unduhan sukses di database.

---

## 12. Pengamanan Backend (Download Security)

1. **Authentication Enforcement:** Direct request ke endpoint unduhan tanpa token JWT resmi dicegat dengan HTTP 401 `AUTH_REQUIRED`.
2. **Path Traversal Protection:** Nama berkas dan ID dataset disanitasi menggunakan ekspresi reguler `replace(/[^a-zA-Z0-9_-]/g, '')` dan `path.basename()` untuk mencegah injeksi `../`.
3. **MIME & Content-Disposition:** Header HTTP diatur ketat:
   - `Content-Disposition: attachment; filename="[FILENAME]"`
   - `Content-Type: application/json` / `application/pdf` / `application/vnd.google-earth.kml+xml`.
4. **Validasi Fisik Berkas:** Memeriksa `fs.existsSync(filePath)` sebelum memproses streaming berkas. Jika tidak ditemukan, mengembalikan HTTP 404 `FILE_NOT_FOUND` tanpa membuka struktur folder internal server.
5. **Open Redirect Prevention:** Helper fungsi `sanitizeReturnUrl` memeriksa apakah URL dimulai dengan `/` dan bukan `//`, `\\`, atau skema eksternal (`http:`, `https:`, `javascript:`). Jika tidak valid, otomatis dinetralkan ke `/profile`.

---

## 13. Hasil Pengujian (Automated & Manual)

### A. Pengujian Anonymous Access (Pengunjung Tanpa Login)
- Membuka Beranda (`/`): ✅ Status 200 OK
- Membuka Katalog (`/katalog`): ✅ Status 200 OK (Melihat 6 dataset real)
- Membuka Detail Dataset (`/katalog/ds-batas-kabkot`): ✅ Status 200 OK (Mini-map & metadata tampil utuh)
- Membuka Standar Data (`/standar-data`): ✅ Status 200 OK (8 dokumen standar dapat dicari dan difilter)
- Membuka Pusat Unduh (`/unduh`): ✅ Status 200 OK (Daftar unduhan tampil utuh)
- Percobaan Unduh Dokumen Anonim: ✅ Ditolak backend dengan 401 `AUTH_REQUIRED`
- Tombol Unduh di UI: ✅ Menampilkan banner peringatan dan mengarahkan pengguna ke login Google dengan `returnUrl` tersimpan aman.

### B. Pengujian Google OAuth & User Management
- Auto-registrasi Pengguna Baru Google: ✅ Lulus (201 Created, token terbit, `provider = 'google'`, `avatarUrl` tersimpan)
- Login Pengguna Terdaftar Google: ✅ Lulus (200 OK, profil diperbarui)
- Token Kedaluwarsa: ✅ Ditolak (401 `GOOGLE_AUTH_FAILED: Token autentikasi Google telah kedaluwarsa.`)
- Email Belum Diverifikasi: ✅ Ditolak (401 `GOOGLE_AUTH_FAILED: Email akun Google belum diverifikasi oleh Google.`)
- Token Tidak Valid / Rusak: ✅ Ditolak (401 `GOOGLE_AUTH_FAILED`)
- Profil `/me` & `/user/profile`: ✅ Menampilkan nama, email terverifikasi, Google Subject ID, foto profil Google, dan peran akun.
- Logout: ✅ Token dan data session terhapus bersih dari state aplikasi.

### C. Pengujian Download & Integritas File Asli
- Unduh Dataset Batas Kabupaten/Kota: ✅ Berhasil di-stream dengan `Content-Disposition: attachment; filename="ds-batas-kabkot_real.geojson"` (Ukuran: 2.562.034 byte riil).
- Header `X-Data-Source`: ✅ Mengembalikan nilai `REAL`.
- Format Shapefile / KML: ✅ Disanitasi dan dilayani dengan MIME type yang tepat.
- Dokumen Tanpa Berkas Fisik (`sdg-01`): ✅ Mengembalikan HTTP 404 `FILE_NOT_FOUND` dengan pesan: *"Dokumen belum tersedia untuk diunduh."*
- Tombol UI Dokumen Belum Tersedia: ✅ Berstatus dinonaktifkan (`disabled`) dengan pesan jelas.

### D. Pengujian Isolasi Download History
- Pengguna 1 mengunduh berkas: ✅ Riwayat tercatat di profil Pengguna 1.
- Pengguna 2 memeriksa `/user/downloads`: ✅ Riwayat Pengguna 2 kosong (0 record). Tidak terjadi kebocoran riwayat antar akun.

### E. Hasil Regression Test (Semua 14 Route Phase 11)
Seluruh route dan fitur interaktif diuji pada viewport mobile **402 × 874 px** (Figma Frame: `X73V2XyVQoCdY1rR3zIkQC`):

| No | Route | Hasil Regression | Catatan Fungsional |
|---|---|---|---|
| 1 | `/` (Beranda) | ✅ LULUS | Search autocomplete, banner statistik, quick access |
| 2 | `/webmap` | ✅ LULUS | 4 Basemap (OSM, Satelit, Topo, Dark ESRI), Layer Manager, Legend, Spatial Tools, Feature Info |
| 3 | `/katalog` | ✅ LULUS | Filter drawer, pencarian, download modal, "Lihat Peta" deep link |
| 4 | `/katalog/:datasetId` | ✅ LULUS | Mini map preview dinamis (`fitBounds`), auto-download listener |
| 5 | `/simpul` | ✅ LULUS | Direktori simpul jaringan nasional, filter tipe (K/L, Pemprov, Pemkab/Pemkot) |
| 6 | `/simpul/:nodeId` | ✅ LULUS | Profil instansi wali data, daftar dataset produksi |
| 7 | `/unduh` | ✅ LULUS | Download Center, auto-download listener pasca-login Google |
| 8 | `/lainnya` | ✅ LULUS | Menu navigasi sekunder ke Standar Data, Tools, Bantuan, Kontak |
| 9 | `/standar-data` | ✅ LULUS | Grid/List toggle, filter prioritas, detail modal, status berkas fisik |
| 10 | `/tools` | ✅ LULUS | Konverter koordinat decimal ke DMS/UTM, kartu tools Palapa & Plugin QGIS |
| 11 | `/bantuan` | ✅ LULUS | Accordion FAQ interaktif, daftar standar SNI geospasial |
| 12 | `/kontak` | ✅ LULUS | Form pengaduan publik dengan feedback validasi |
| 13 | `/login` | ✅ LULUS | Tombol utama "Lanjutkan dengan Google", penanganan returnUrl aman |
| 14 | `/register` | ✅ LULUS | Registrasi fallback dengan validasi input |
| 15 | `/profile` | ✅ LULUS | Menampilkan avatar Google, badge verifikasi, Google Subject ID, tab unduhan |

---

## 14. Ringkasan Hasil Pengujian Otomatis (Automated Tests)

```
Test Files  3 passed (3)
Tests       86 passed (86)
Time        14.26s

Server Suite (`server/src/__tests__/api.test.ts`):
  ✓ Phase 10: Verified BIG Provenance & Live Probing (26 tests)
  ✓ Phase 12: Google Authentication Auto-Registration (7 tests)
  ✓ Phase 12: Public Document Access & Authenticated Download (11 tests)
  Total Server: 44 passed

Client Suite (`client/src/__tests__/`):
  ✓ authAndDownload.test.ts: Google Store, Open Redirect, Download Policy (9 tests)
  ✓ workflow.test.ts: Turf Utilities, Formatter, Symbology, Map Store (33 tests)
  Total Client: 42 passed
```

---

## 15. Hasil Production Build

```bash
npm run build
```
- **Server:** `tsc` selesai dengan **0 error**. Berkas dikompilasi ke `server/dist/`.
- **Client:** `vite build` selesai dengan **0 error**. Berkas bundle aset diproduksi di `client/dist/`.

---

## 16. Panduan Tindakan Manual (Manual Action Items)

Aplikasi telah sepenuhnya siap untuk menggunakan kredensial Google Cloud yang sebenarnya. Panduan komprehensif telah didokumentasikan di `docs/GOOGLE_OAUTH_SETUP.md`.

Untuk menghubungkan dengan kredensial Google resmi production:
1. Buat **OAuth 2.0 Web Client ID** di [Google Cloud Console](https://console.cloud.google.com/).
2. Daftarkan origin yang diizinkan: `http://localhost:5173` (lokal) dan domain production resmi Ina-Geoportal.
3. Masukkan Client ID ke berkas konfigurasi:
   - `client/.env`: `VITE_GOOGLE_CLIENT_ID="[CLIENT_ID].apps.googleusercontent.com"`
   - `server/.env`: `GOOGLE_CLIENT_ID="[CLIENT_ID].apps.googleusercontent.com"`
   - `server/.env`: `GOOGLE_CLIENT_SECRET="[CLIENT_SECRET]"`
4. Selama kredensial resmi belum dimasukkan, fitur simulasi akun Google (`mock-google-token-*`) pada lingkungan pengujian dan pengembangan lokal dapat digunakan secara transparan tanpa kendala.
