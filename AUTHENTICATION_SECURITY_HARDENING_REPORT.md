# LAPORAN PENGURUSAN KEAMANAN AUTENTIKASI (AUTHENTICATION SECURITY HARDENING REPORT)

**Proyek:** Ina-Geoportal Web App Redesign v2.0  
**Tingkat Keamanan:** Standar Produksi Enterprise (Defense-in-Depth)  
**Versi Dokumen:** 1.0 (Phase 17.0)  
**Status:** Terimplementasi Penuh & Terverifikasi Pengujian Otomatis  

---

## 1. Ringkasan Eksekutif

Dalam rangka mempersiapkan deployment ke lingkungan produksi cloud (Vercel) dan memastikan data geospasial serta akun pengguna terlindungi, sistem autentikasi Ina-Geoportal v2.0 telah ditingkatkan melalui serangkaian pengerasan keamanan berlapis (*defense-in-depth*).

Peningkatan utama yang direalisasikan pada Phase 17.0 mencakup:
1. **Eliminasi Total JWT dari Web Storage Klien:** Menghapus seluruh token akses dari `localStorage` dan `sessionStorage` peramban untuk memitigasi risiko pencurian token akibat serangan *Cross-Site Scripting (XSS)*.
2. **Standardisasi HttpOnly Secure Cookie:** Menjadikan *HttpOnly Cookie* (`ina_geo_token`) sebagai mekanisme sesi peramban tunggal yang tidak dapat dibaca oleh skrip JavaScript sisi klien.
3. **Validasi Origin/CSRF Berlapis:** Melindungi endpoint operasi yang mengubah status data (*state-changing HTTP requests*) dari serangan *Cross-Site Request Forgery (CSRF)* jika permintaan memanfaatkan sesi *ambient cookie*.
4. **Pemisahan Jalur Mesin & Pengguna:** Mempertahankan header `Authorization: Bearer <token>` khusus bagi klien API terprogram (*standalone scripts*, cURL, otomatisasi) tanpa membebani mereka dengan pembatasan CSRF peramban.
5. **Kriptografi Kata Sandi Bcrypt:** Pengamanan kata sandi menggunakan algoritma Bcrypt `$2b$` dengan *salt rounds* 10 dan resistensi terhadap kebocoran waktu (*timing attacks*).
6. **Kesiapan Pembatasan Laju Terdistribusi (Distributed Rate Limiting):** Integrasi Upstash Redis untuk proteksi serangan *brute force* dan *credential stuffing* dengan *fallback* aman ke *in-memory sliding window*.

---

## 2. Model Ancaman & Mitigasi Keamanan (Threat Matrix)

| Vektor Ancaman | Dampak Risiko | Arsitektur Mitigasi Phase 17.0 | Status |
|---|---|---|:---:|
| **XSS Token Harvesting** | Penyerang menyuntikkan skrip JS untuk membaca JWT dari `localStorage` dan membajak sesi pengguna secara permanen. | **Total Elimination:** JWT tidak pernah disimpan di `localStorage` atau `sessionStorage`. Cookie sesi ditandai dengan flag `HttpOnly: true` sehingga peramban memblokir akses JS (`document.cookie`). | **TERLINDUNGI** |
| **Cross-Site Request Forgery (CSRF)** | Situs berbahaya memaksa peramban mengirim permintaan mutasi (misal: mengubah profil, bookmark) menggunakan ambient cookie. | **Origin/CSRF Validation:** Middleware memverifikasi header `Origin` atau `Referer` pada permintaan `POST`, `PUT`, `DELETE`, `PATCH` berbasis cookie terhadap daftar asal yang sah (*allowed origins*). | **TERLINDUNGI** |
| **Credential Stuffing & Brute Force** | Penyerang menjalankan jutaan kombinasi email/password pada endpoint login. | **Rate Limiting Sliding Window:** Endpoint `/auth/login` dan `/auth/register` dibatasi laju permintaannya secara terdistribusi via Upstash Redis (atau in-memory fallback). | **TERLINDUNGI** |
| **Man-in-the-Middle (MitM) Eavesdropping** | Token sesi disadap di jaringan publik tidak terenkripsi. | **Secure Flag Enforcement:** Cookie sesi dikonfigurasi dengan flag `Secure: true` pada lingkungan produksi, menjamin transmisi eksklusif melalui HTTPS / TLS. | **TERLINDUNGI** |
| **Session Fixation & Hijacking** | Penggunaan kembali ID sesi lama setelah proses login atau perubahan kredensial. | **Atomic Session Issuance & Clearing:** Endpoint login/register menerbitkan cookie sesi baru secara atomik; endpoint `/auth/logout` secara eksplisit menghapus cookie pada level peramban (`Max-Age=0`). | **TERLINDUNGI** |
| **Multi-Tenant Data Leakage** | Pengguna dapat membaca atau mengubah bookmark/unduhan milik pengguna lain. | **Strict Tenant Isolation:** Controller menyaring rekord secara eksklusif menggunakan `req.user.id` dari token terverifikasi, bukan parameter URL yang dapat dimanipulasi. | **TERLINDUNGI** |

---

## 3. Rincian Implementasi Teknis

### A. Konfigurasi Standar Cookie Sesi Backend
Pada [authController.ts](file:///c:/Users/Hype%20AMD/projek%20IMK/server/src/controllers/authController.ts), parameter cookie disentralisasi melalui fungsi bantuan standar:

```typescript
export const SESSION_COOKIE_NAME = 'ina_geo_token';

export const getSessionCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 hari kedaluwarsa
});

export const getSessionCookieClearOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax',
  path: '/'
});
```

- `httpOnly: true`: Mencegah akses dari objek DOM/JavaScript (`document.cookie`).
- `sameSite: 'lax'`: Memberikan proteksi CSRF peramban bawaan untuk navigasi lintas situs sekaligus mempertahankan keramahan UX saat tautan eksternal dibuka.
- `secure: config.isProduction`: Aktif otomatis di produksi Vercel (`HTTPS`), dinonaktifkan di pengembangan lokal (`HTTP localhost`).
- `path: '/'`: Menjamin cakupan cookie berlaku di seluruh rute aplikasi tanpa fragmentasi jalur.

---

### B. Validasi Origin/CSRF pada Middleware Autentikasi
Pada [authMiddleware.ts](file:///c:/Users/Hype%20AMD/projek%20IMK/server/src/middleware/authMiddleware.ts), sistem melacak asal metode transportasi token:

```typescript
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  authMethod?: 'bearer' | 'cookie';
}
```

Ketika permintaan menggunakan *cookie*, fungsi `validateCsrfOrigin(req, res)` dipicu untuk metode mutasi data (`POST`, `PUT`, `DELETE`, `PATCH`):

```typescript
function validateCsrfOrigin(req: Request, res: Response): boolean {
  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  const targetHost = req.headers.host;

  // Izinkan jika Origin cocok dengan salah satu allowedOrigins atau localhost
  if (origin && isAllowedHostOrOrigin(origin, config.allowedOrigins, targetHost)) {
    return true;
  }

  // Fallback validasi Referer
  if (referer && isAllowedHostOrOrigin(referer, config.allowedOrigins, targetHost)) {
    return true;
  }

  // Tolak permintaan jika Origin/Referer tidak sah atau berasal dari domain asing
  res.status(403).json({
    success: false,
    message: 'Permintaan lintas situs (Cross-Origin) ditolak demi keamanan.',
    code: 'CSRF_ORIGIN_INVALID'
  });
  return false;
}
```

---

### C. Dekoupling Klien API Terprogram (Bearer Token)
Permintaan dari skrip eksternal atau otomatisasi yang mengirim header `Authorization: Bearer <token>` diberi tanda `req.authMethod = 'bearer'`. Karena peramban tidak mengirimkan header Bearer kustom secara otomatis pada serangan CSRF lintas domain, permintaan dengan Bearer token diizinkan melewati pemeriksaan CSRF origin, menjaga kompatibilitas API cURL dan CI/CD.

---

### D. Sanitasi Web Storage & Optimasi Rehidrasi Sisi Klien
Pada sisi frontend React:
1. **Pembersihan Bersih (Sanitasi):**
   Pada saat inisialisasi modul [useAuthStore.ts](file:///c:/Users/Hype%20AMD/projek%20IMK/client/src/store/useAuthStore.ts):
   ```typescript
   try {
     localStorage.removeItem('ina_geo_token');
     sessionStorage.removeItem('ina_geo_token');
   } catch {
     // fail-safe jika storage dibatasi peramban
   }
   ```
2. **Cache Profil Non-Sensitif untuk UX Instan:**
   Untuk mencegah kedipan visual antarmuka (*flicker*) saat halaman dimuat ulang, aplikasi menyimpan profil publik (`name`, `email`, `role`, `avatarUrl`) di bawah kunci `ina_geo_user_profile`. Token kredensial JWT **tidak pernah** dimasukkan ke dalam objek ini.
3. **Kredensial Otomatis Axios:**
   Pada [apiClient.ts](file:///c:/Users/Hype%20AMD/projek%20IMK/client/src/services/apiClient.ts), konfigurasi `withCredentials: true` aktif secara permanen, memastikan setiap panggilan AJAX mengirimkan *cookie* HttpOnly sesi secara aman ke backend.

---

## 4. Hasil Verifikasi Pengujian Otomatis

Rangkaian pengujian integrasi keamanan [phase17_0.test.ts](file:///c:/Users/Hype%20AMD/projek%20IMK/server/src/__tests__/phase17_0.test.ts) dan pengujian klien [authAndDownload.test.ts](file:///c:/Users/Hype%20AMD/projek%20IMK/client/src/__tests__/authAndDownload.test.ts) telah mengonfirmasi seluruh mekanisme pengerasan keamanan:

```text
 ✓ server/src/__tests__/phase17_0.test.ts (13 tests) 460ms
   ✓ Suite 1: PostgreSQL Schema Configuration & Neon Dual Connection Strings (3 tests)
   ✓ Suite 2: Fresh Data Snapshot Integrity & Referential Validation (3 tests)
   ✓ Suite 3: Browser Authentication Hardening (HttpOnly Cookie & CSRF Validation) (5 tests)
   ✓ Suite 4: Rate Limiter Status & Production Redis Readiness (2 tests)

 ✓ client/src/__tests__/authAndDownload.test.ts (4 tests) 140ms
   ✓ stores user session securely without storing JWT in localStorage
   ✓ executes dataset download via API with credentials
   ✓ isolates download history per authenticated user
   ✓ clears cached profile on user logout
```

---

## 5. Kesimpulan & Rekomendasi

Sistem autentikasi Ina-Geoportal Web App Redesign v2.0 kini memenuhi standar keamanan aplikasi web modern:
- Kebal terhadap eksploitasi pencurian token via XSS.
- Terlindungi dari eksekusi perintah lintas situs via CSRF Origin Validation.
- Siap digunakan pada infrastruktur tanpa server (serverless) di Vercel dengan PostgreSQL di Neon.

Dokumen ini menjadi rujukan resmi arsitektur keamanan bagi tim pengembang dan auditor sistem.
