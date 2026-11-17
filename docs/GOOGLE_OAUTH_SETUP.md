# Panduan Konfigurasi Google OAuth 2.0 & OpenID Connect
## Ina-Geoportal Web App Redesign v2.0 (Phase 12)

Dokumen ini memuat panduan lengkap penyiapan kredensial Google Identity Services (GIS) untuk autentikasi pengguna pada aplikasi **Ina-Geoportal Web App Redesign v2.0**.

---

### 1. Membuat / Memilih Google Cloud Project

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Masuk menggunakan akun Google / akun organisasi resmi Ina-Geoportal atau instansi pengembang.
3. Klik menu dropdown proyek di bagian atas, lalu klik **"New Project"**.
4. Beri nama proyek, contoh: `Ina-Geoportal-v2`.
5. Pilih Organization atau Folder jika ada, lalu klik **Create**.

---

### 2. Mengonfigurasi OAuth Consent Screen

Sebelum membuat Client ID, Anda wajib mengonfigurasi layar persetujuan OAuth:

1. Di menu navigasi samping, buka **APIs & Services** > **OAuth consent screen**.
2. Pilih tipe pengguna:
   - **External**: Untuk publik masyarakat, akademisi, dan instansi umum.
3. Klik **Create**.
4. Isi informasi aplikasi:
   - **App name**: `Ina-Geoportal 2.0`
   - **User support email**: Email dukungan resmi (misal: `geoportal@big.go.id`).
   - **App logo**: Unggah logo resmi Ina-Geoportal (opsional).
   - **Application home page**: URL situs aplikasi (misal: `https://tanahair.indonesia.go.id`).
   - **Application privacy policy link**: URL kebijakan privasi geospasial.
   - **Developer contact information**: Email tim pengembang teknis.
5. Klik **Save and Continue**.
6. Pada bagian **Scopes**, klik **Add or Remove Scopes**, lalu pilih permission minimal:
   - `.../auth/userinfo.email` (Lihat alamat email utama pengguna)
   - `.../auth/userinfo.profile` (Lihat info profil pribadi termasuk nama dan foto profil)
   - `openid` (Kaitkan profil pengguna dengan akun Google mereka)
   > **Catatan Keamanan:** Jangan memilih scope sensitif atau data pribadi (Gmail, Drive, Kalender, Kontak).
7. Klik **Save and Continue**.
8. Pada tahap **Test users** (jika mode Testing), tambahkan email penguji internal.
9. Selesaikan dan kembali ke Dashboard.

---

### 3. Membuat Kredensial OAuth 2.0 Client ID

1. Masuk ke **APIs & Services** > **Credentials**.
2. Klik tombol **Create Credentials** di bagian atas, pilih **OAuth client ID**.
3. Pilih Application type: **Web application**.
4. Masukkan nama: `Ina-Geoportal Web Client`.

---

### 4. Mengatur Authorized JavaScript Origins

Bagian ini penting agar peramban diizinkan memanggil Google Identity Services:

#### A. Lingkungan Pengembangan Lokal (Development)
Tambahkan URI berikut:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:5000`

#### B. Lingkungan Produksi (Production)
Tambahkan domain resmi aplikasi:
- `https://tanahair.indonesia.go.id`
- `https://geoportal.big.go.id`
- (Domain production kustom lainnya)

---

### 5. Mengatur Authorized Redirect URIs (Bila Diperlukan)

Google Identity Services berbasis ID Token (Credential Response) memproses token secara langsung di sisi peramban (in-page callback). Namun jika menggunakan alur redirect fallback, daftarkan:
- Development: `http://localhost:5173/login`
- Production: `https://tanahair.indonesia.go.id/login`

Klik **Create**. Salin **Client ID** dan **Client Secret** yang diberikan.

---

### 6. Mengatur Environment Variable

Setelah memperoleh kredensial resmi dari Google Cloud Console:

#### A. Konfigurasi Server (`server/.env`)
```bash
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="ganti-dengan-kunci-rahasia-jwt-produksi-yang-kuat"
CORS_ORIGIN="http://localhost:5173"

# Google OAuth Kredensial Backend (untuk verifikasi token via google-auth-library)
GOOGLE_CLIENT_ID="[CLIENT_ID_DARI_GOOGLE_CLOUD].apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="[CLIENT_SECRET_DARI_GOOGLE_CLOUD]"
```

#### B. Konfigurasi Client (`client/.env`)
```bash
VITE_API_URL="/api/v1"

# Google Client ID untuk inisialisasi Google Identity Services frontend
VITE_GOOGLE_CLIENT_ID="[CLIENT_ID_DARI_GOOGLE_CLOUD].apps.googleusercontent.com"
```

> **PERINGATAN KEAMANAN:**
> - `GOOGLE_CLIENT_SECRET` **HANYA** boleh berada pada server backend.
> - **JANGAN PERNAH** memaparkan `GOOGLE_CLIENT_SECRET` pada frontend atau berkas `.env` client.
> - Jangan pernah meng-commit berkas `.env` dengan kredensial asli ke dalam Git repository.

---

### 7. Memverifikasi Login Google Secara Nyata

1. Pastikan `VITE_GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_ID` sudah diatur pada `.env`.
2. Jalankan backend dan frontend:
   ```bash
   npm run dev
   ```
3. Buka halaman `http://localhost:5173/login`.
4. Tombol **"Lanjutkan dengan Google"** akan memicu Google Account Selector resmi.
5. Pilih akun Google Anda.
6. Frontend akan menerima ID token dan mengirimkannya ke `POST /api/v1/auth/google`.
7. Backend memverifikasi tanda tangan digital Google, penerbit (`iss`), masa berlaku (`exp`), dan verifikasi email.
8. Akun akan dibuat otomatis di database, dan session JWT dikeluarkan.
9. Pengguna dialihkan kembali ke dokumen yang ingin diunduh atau halaman `/profile`.

---

### 8. Mode Pengujian Otomatis & Simulasi Offline

Jika pengujian otomatis dijalankan tanpa kredensial Google Cloud aktif, aplikasi menyediakan mock token terisolasi:
- `mock-google-token-new` — Simulasi pendaftaran pengguna baru Google
- `mock-google-token-existing` — Simulasi masuk pengguna terdaftar Google
- `mock-google-token-expired` — Pengujian respons token kedaluwarsa (401)
- `mock-google-token-unverified` — Pengujian akun dengan email belum terverifikasi (401)
- `mock-google-token-invalid` — Pengujian token palsu / tidak valid (401)
