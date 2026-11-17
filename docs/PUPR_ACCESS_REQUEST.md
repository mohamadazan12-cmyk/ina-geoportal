# Panduan Permohonan Akses Resmi Data Geospasial Jalan Nasional
# Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR) RI
# Dokumen Standar Operasional Integrasi Ina-Geoportal v2.0 (Phase 10.10)

Dokumen ini disusun sebagai petunjuk teknis dan administratif bagi pengelola aplikasi Ina-Geoportal Web App v2.0 untuk mengajukan permohonan akses penuh (*permanent endpoint & IP/domain whitelist*) data vektor linestring **Jalan Nasional** kepada wali data resmi di lingkungan Kementerian PUPR RI.

---

## 1. Informasi Instansi Wali Data & Layanan Tujuan

| Parameter | Detail Informasi Resmi |
|---|---|
| **Instansi Pembina / Wali Data** | Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR) Republik Indonesia |
| **Pusat Pengelola Data & API** | Pusat Data dan Teknologi Informasi (PUSDATIN) Kementerian PUPR |
| **Unit Organisasi Teknis (Unor)** | Direktorat Jenderal Bina Marga — Subdirektorat Data & Pengembangan Sistem |
| **Nama Portal Layanan** | SIGI PUPR — Open Spatial Data API (GEOAPI PUSDATIN) |
| **URL Portal GEOAPI** | `https://sigi.pu.go.id/geoapi/` |
| **Nama Dataset / Tabel** | `Jalan Nasional` (`jalan_nasional`) |
| **Tipe Geometri** | LineString (Koridor Arteri Primer, Kolektor Primer 1/2/3, Jalan Strategis Nasional) |
| **Jumlah Objek Resmi Terdaftar** | **3.306 Ruas Jalan Nasional** (Total panjang > 47.000 km) |
| **Sistem Referensi Koordinat (CRS)** | WGS 84 / Geographic (EPSG:4326) |
| **Format Data yang Tersedia** | GeoJSON (`format=geojson`), ESRI JSON, CSV, HTML |

---

## 2. Alasan & Urgensi Penggunaan Data

Penggunaan data vektor Jalan Nasional pada Ina-Geoportal Redesign v2.0 ditujukan untuk:
1. **Penyajian Referensi Konektivitas Transportasi Darat Nasional**: Menyediakan visualisasi jalur logistik strategis lintas pulau (Jalur Pantura Jawa, Lintas Sumatera, Trans Sulawesi, Trans Kalimantan, dan Trans Papua) bagi kementerian/lembaga, pemerintah daerah, akademisi, dan publik.
2. **Interoperabilitas Simpul Jaringan Nawa Cita Geospasial**: Mengintegrasikan layer jalan Bina Marga dengan layer batas kabupaten/kota BIG (`ds-batas-kabkot`) dan layer fasilitas kesehatan rujukan (`ds-faskes`) untuk analisis waktu tempuh evakuasi medis dan ketahanan logistik.
3. **Analisis Mitigasi Risiko Kebencanaan Spasial**: Melakukan *spatial overlay* jalur logistik nasional terhadap kawasan rawan bencana sesar aktif dan gempa bumi (`ds-rawan-gempa`) guna perencanaan jalur evakuasi darurat.

---

## 3. Arsitektur Otentikasi & Syarat Teknis Layanan

Berdasarkan audit teknis endpoint `https://sigi.pu.go.id/geoapi/`:
- **Endpoint Metadata (Publik)**:
  `GET https://sigi.pu.go.id/geoapi/api/v1/dataset-meta/jalan_nasional`
  Status: **HTTP 200 OK** (Dapat diakses tanpa autentikasi, mengembalikan status tabel, unon, dan jumlah 3.306 rekor).
- **Endpoint Vektor Streaming (Terproteksi)**:
  `GET https://sigi.pu.go.id/geoapi/api/v1/jalan_nasional`
  Status tanpa autentikasi: **HTTP 401 Unauthorized** dengan respon:
  ```json
  {
    "detail": {
      "error": "ACCESS_DENIED",
      "message": "Parameter 'email' dan 'token' wajib diisi."
    }
  }
  ```
- **Mekanisme Akses yang Diizinkan**:
  1. **Mode Sesi Token**: Melampirkan parameter `?email={email_terdaftar}&token={token_aktif}&format=geojson`.
  2. **Mode Endpoint Permanen (Whitelist IP/Domain)**: Domain server/IP publik Ina-Geoportal didaftarkan pada whitelist firewall PUSDATIN PUPR sehingga pemanggilan data dari server Ina-Geoportal dapat berjalan secara langsung (*server-to-server*) tanpa batas kedaluwarsa sesi token.

---

## 4. Persyaratan & Prosedur Pengajuan Permohonan

### Langkah 1: Pengisian Formulir Permohonan Endpoint Permanen
Pemohon mengakses portal GEOAPI (`https://sigi.pu.go.id/geoapi/`), membuka menu **REQUEST ENDPOINT PERMANEN** / Formulir Permohonan Akses (`#gf-perm-modal`), atau mengirimkan payload resmi ke endpoint registrasi:
`POST https://sigi.pu.go.id/geoapi/api/v1/pengajuan-ep`

### Langkah 2: Data & Informasi Teknis yang Wajib Dilampirkan Pemohon

| Field Formulir | Keterangan & Format | Contoh Isian Pemohon |
|---|---|---|
| `ref_number` | Nomor Referensi Otomatis (Format: `GEOAPI-YYYYMM-XXXXXX`) | `GEOAPI-202611-X8K2M1` |
| `nama_lengkap` | Nama Lengkap Pejabat / Pengelola Sistem Pemohon | Tim Pengembang Ina-Geoportal v2.0 |
| `jabatan_posisi` | Jabatan Kedinasan | Pranata Komputer Ahli / Administrator Geoportal |
| `nama_instansi` | Instansi Pemohon | Badan Informasi Geospasial / Pengelola Ina-Geoportal |
| `email_instansi` | Alamat Email Resmi Kedinasan (wajib domain `.go.id`) | `admin.geoportal@big.go.id` |
| `nomor_telepon` | Nomor Kontak Seluler / WhatsApp PIC Teknis | `0812-XXXX-XXXX` / `(021) 8753155` |
| `ip_domain` | Alamat IP Publik dan/atau Fully Qualified Domain Name (FQDN) Server Pemohon | `geoportal.big.go.id`, `103.144.XXX.XXX` |
| `layer_dataset` | Nama Layer Spasial yang Dimohonkan | `Jalan Nasional` (Bina Marga) |
| `keperluan` | Deskripsi Peruntukan Pemanfaatan Data | Integrasi streaming layer vektor linestring Jalan Nasional pada WebGIS Ina-Geoportal Redesign v2.0 untuk analisis konektivitas antarwilayah. |

### Langkah 3: Pengiriman Surat Dinas Resmi
Selain pengajuan formulir daring, PUSDATIN PUPR mensyaratkan surat dinas pengantar resmi berkop instansi yang ditujukan kepada:
> **Yth. Kepala Pusat Data dan Teknologi Informasi (PUSDATIN)**
> **Kementerian Pekerjaan Umum dan Perumahan Rakyat**
> Jl. Pattimura No. 20, Kebayoran Baru, Jakarta Selatan 12110
> Email: `pusdatin@pu.go.id` / `sigi@pu.go.id`

---

## 5. Konfigurasi Sistem Setelah Izin Diterbitkan

Setelah PUSDATIN menyetujui permohonan dan menerbitkan token atau mengaktifkan whitelist:
1. Simpan kredensial pada berkas `.env` server Ina-Geoportal:
   ```env
   PUPR_GEOAPI_EMAIL=admin.geoportal@big.go.id
   PUPR_GEOAPI_TOKEN=pupr_live_token_xxxxxxxxxxxxxxxx
   ```
2. Adapter `fetchPuprLiveJalanNasional()` pada `server/src/services/realGeospatialService.ts` akan secara otomatis mendeteksi variabel lingkungan tersebut dan mengalirkan data vektor live dari SIGI PUPR.
3. Ubah status dataset pada database menjadi `REAL_VERIFIED` setelah seluruh 3.306 fitur terverifikasi berhasil dialirkan.

---

## 6. Penanganan Selama Masa Pengajuan (Graceful Fallback Policy)

Selama proses administrasi dan penerbitan izin berlangsung:
- **Status Dataset**: **`PENDING_AUTHORIZATION`**
- **Status Verifikasi**: **`PENDING_AUTHORIZATION`**
- **Data Visualisasi WebGIS**: Menggunakan fallback data vektor terverifikasi untuk 4 koridor primer nasional (Jalur Pantura Jawa, Lintas Tengah Jawa, Lintas Sumatera, Trans Sulawesi).
- **Integritas Etika Data**:
  - Dilarang keras melakukan bypass autentikasi.
  - Dilarang keras membuat token palsu / rekaan.
  - Dilarang keras mengekstrak token sesi dari peramban pengguna.
  - Dilarang keras mengklaim 3.306 ruas jalan telah tersedia sebagai geometri live sebelum izin resmi terbit.
