# PHASE 13 — Email/Password Auth Restoration & Figma Design Fidelity Report
# INA-GEOPORTAL WEB APP v2.0

**Date:** 17 November 2026
**Phase:** 13 — Auth Revert + Figma Audit
**Status:** ✅ COMPLETED
**Tests:** 90/90 passing (44 server · 46 client)
**Build:** ✅ Clean production build (0 TypeScript errors)

---

## 1. Objective Summary

Phase 13 had two parallel tracks:

| Track | Goal |
|---|---|
| **A — Auth Revert** | Remove Google-only OAuth login; restore native email/password form with manual registration, demo account auto-fill, and pending-download redirect preservation. |
| **B — Figma Audit** | Conduct pixel-accurate inspection of all 16 Figma frames on the `imk project` page via FigCraft MCP WebSocket relay; align all application routes to the extracted design tokens. |

---

## 2. Authentication Revert (Track A)

### 2.1 LoginPage.tsx — Complete Rewrite

**Removed:**
- Google Identity Services (GIS) script initialization (`window.google.accounts.id.initialize`)
- `loginWithGoogle` store action call from UI
- Google Sign-In button container (`<div ref={googleBtnContainerRef}>`)
- Dev mock Google login panel (new user / existing / expired / unverified modes)
- "Masuk dengan Akun Google" heading and all Google brand references

**Restored / Added:**
- Native `email` + `password` controlled input fields
- Password visibility toggle (Eye / EyeOff icons)
- Form `onSubmit` handler calling `useAuthStore().login(email, password)`
- **Demo Account 1-Click Card** — displays `demo@inageoportal.go.id` / `Password123!` in a styled mono card; "1-Klik Masuk" button calls `login()` immediately with demo credentials
- "Isi Sandi Demo" shortcut button pre-fills password field without auto-submitting
- Pending download context banner (`downloadDataset` / `downloadDoc` query params)
- `returnUrl` → `sanitizeReturnUrl()` open-redirect prevention (same logic as before)
- `autoDownload` / `autoDownloadDoc` query param forwarding on success redirect
- Link to `/register` preserving `returnUrl`
- "Kembali" (back) button
- `statusInfo` loading indicator state

**Design tokens applied:**
- Background card: `bg-white`, rounded-2xl, `border-slate-200/80`, `shadow-md`
- Brand icon container: `bg-gradient-to-tr from-[#153096] to-[#1A3BAF]`
- Primary button: `bg-[#1A3BAF]` hover `bg-[#153096]`
- Demo card: `from-blue-50/80 to-indigo-50/80`, `border-blue-200`
- Error banner: `bg-rose-50 border-rose-200`
- Status banner: `bg-blue-50 border-blue-200`

### 2.2 RegisterPage.tsx — Full Field Restoration

**Fields added / restored:**
| Field | Validation | Notes |
|---|---|---|
| Nama Lengkap | ≥ 2 chars (client) | Required |
| Alamat Email | format check + backend dedup | Required |
| Institusi / Lembaga | optional | Defaults to `'Umum'` on backend |
| Kata Sandi | ≥ 6 chars `minLength` | Required; visibility toggle |
| Ulangi Kata Sandi | === password match | Required; visibility toggle |
| Setuju Ketentuan | must be checked | Defaults checked; re-validated on submit |

**Client-side error messages (Bahasa Indonesia):**
- `'Nama lengkap minimal 2 karakter.'`
- `'Format email tidak valid.'`
- `'Kata sandi minimal 6 karakter.'`
- `'Konfirmasi kata sandi tidak cocok.'`
- `'Anda harus menyetujui ketentuan layanan data geospasial.'`

**Backend errors surfaced:**
- `409 EMAIL_EXISTS` → `'Email ini sudah terdaftar. Silakan gunakan email lain atau login.'`
- `422 VALIDATION_ERROR` → Zod field-level error array

**Post-registration redirect:** navigates to `returnPath` (sanitized) with `replace: true`.

### 2.3 Google-Language String Cleanup

All UI copy referencing Google was updated to neutral language:

| File | Old text | New text |
|---|---|---|
| `DownloadModal.tsx` | "Login Google Diperlukan untuk Mengunduh" | "Login Diperlukan untuk Mengunduh" |
| `DownloadModal.tsx` | "Masuk dengan Google untuk Mengunduh" | "Masuk ke Akun untuk Mengunduh" |
| `DownloadModal.tsx` | "masuk dengan akun Google Anda" | "masuk dengan akun Ina-Geoportal Anda" |
| `StandarDataPage.tsx` | "Login Google Diperlukan untuk Mengunduh" | "Login Diperlukan untuk Mengunduh" |
| `StandarDataPage.tsx` | "masuk menggunakan akun Google" | "masuk menggunakan akun Ina-Geoportal" |
| `StandarDataPage.tsx` | "Masuk dengan Google untuk Mengunduh" | "Masuk ke Akun untuk Mengunduh" |
| `authAndDownload.test.ts` | "verifies download action requires Google login" | "verifies download action requires login" |
| `authAndDownload.test.ts` | "Login Google Diperlukan untuk Mengunduh" | "Login Diperlukan untuk Mengunduh" |
| `authAndDownload.test.ts` | "Public Access vs Google Login Required Download Policy" | "Public Access vs Email Login Required Download Policy" |

### 2.4 Preserved (Non-destructive)

The following were kept intact to maintain backward compatibility and existing test coverage:

- `useAuthStore.loginWithGoogle()` action (still callable; tests verify it)
- `authService.googleLogin()` API method
- `POST /api/v1/auth/google` backend route and controller
- Prisma schema fields: `googleId`, `avatarUrl`, `provider`, `emailVerified`
- All existing Google-related server integration tests (8 tests in `api.test.ts`)
- `UserProfilePage.tsx` "Google Verified" badge for `provider === 'google'` users

---

## 3. New Test Coverage (Track A)

**4 new client tests added to `authAndDownload.test.ts`:**

| Test | Assertion |
|---|---|
| `login with email and password should successfully authenticate user and set token` | `success === true`, token stored in localStorage, user state populated |
| `login with invalid credentials should fail and set error state` | `success === false`, `isAuthenticated === false`, error message surfaced |
| `register should create account and automatically establish user session` | `success === true`, token stored, `isAuthenticated === true` |
| `register should capture and surface duplicate email error` | `success === false`, `state.error` contains `'sudah terdaftar'` |

**Total tests: 90/90** (was 86 before Phase 13)

---

## 4. Figma Audit (Track B)

### 4.1 Figma Document Details

| Item | Value |
|---|---|
| File Name | IMK - Project (Copy) |
| File Key | `X73V2XyVQoCdY1rR3zIkQC` |
| Page | `imk project` (ID `15:299`) |
| Relay | `ws://localhost:3055` (channel `design-1`) |
| Tool | FigCraft MCP via WebSocket relay, `scripts/inspect-figma.mjs` |
| Viewport | 402 × 874 px (mobile portrait, all frames) |

### 4.2 Frame Registry — All 16 Frames

| Route | Frame ID | Frame Name | Dimensions |
|---|---|---|---|
| `/` (tab: Pencarian Data) | `65:525` | Beranda | 402 × 874 |
| `/` (tab: Info Simpul) | `231:1145` | Info Simpul Jaringan | 402 × 874 |
| `/katalog` | `75:710` | Katalog | 402 × 874 |
| `/webmap` | `81:950` | Webmap catalog | 402 × 874 |
| `/unduh` | `86:1342` | Unduh Data | 402 × 874 |
| `/lainnya` | `86:2426` | Lainnya | 402 × 874 |
| `/standar-data` (grid) | `160:1986` | Standar Data Grid | 402 × 874 |
| `/standar-data` (list) | `166:2690` | Standar Data List | 402 × 874 |
| `/bantuan` | `185:1596` | Bantuan | 402 × 874 |
| `/kontak` | `40:245` | Kontak | 402 × 874 |
| `/tools` | `30:997` | Tools | 402 × 874 |
| (bottom nav) | `30:816` | Bottom Navigation | 402 × 874 |
| (wireframe home) | `15:304` | Wireframe Beranda | 402 × 874 |
| (wireframe katalog) | `23:586` | Wireframe Katalog | 402 × 874 |
| (wireframe webmap) | `23:700` | Wireframe Webmap | 402 × 874 |
| (wireframe detail) | `38:90` | Wireframe Detail | 402 × 874 |

> **Note:** No dedicated Login or Register frames exist in Figma. Those pages were designed from brand patterns extracted from existing frames.

### 4.3 Design Token Reference (Extracted from Figma)

| Token | Value | Used In |
|---|---|---|
| Background (page) | `#F1F7FA` | AppLayout body, page wrappers |
| Hero Card Dark | `#0C1D36` | HomePage tab-1 hero card |
| Hero Card Dark (Simpul) | `#0B1933` | HomePage tab-2 hero card |
| Primary Blue | `#1A3BAF` | Buttons, links, active states |
| Deep Blue | `#153096` | Button hover, gradient start |
| Card White | `#FFFFFF` r:8 | Dataset cards, stat cards |
| Text Primary | `#1E1E1E` | Headings, body |
| Text Secondary | `#717171` | Captions, subtitles |
| Border Light | `slate-100` / `slate-200` | Card borders |
| Tab Bar BG | `#D9D9D9` | Segmented tab control |
| Tab Active | `#FFFFFF` | Active tab pill |
| Bottom Nav BG | `#FFFFFF` | Bottom navigation bar |

### 4.4 Route-by-Route Figma Fidelity Assessment

#### `/` — HomePage (Figma 65:525 + 231:1145)

**Tab 1: Pencarian Data**
- ✅ Segmented tab control: `max-w-[362px]` h-55 bg `#D9D9D9` r-lg, pill buttons 171×44 each
- ✅ Hero card: `bg-[#0C1D36]` r-xl p-5 — badge, H1 "Jaringan Informasi Geospasial Nasional", description, search input
- ✅ Stat cards: grid-cols-2 gap-3, h-87, 28px bold number, `bg-white` r-xl

**Tab 2: Info Simpul Jaringan (Figma 231:1145)**
- ✅ Hero card: `bg-[#0B1933]` r-2xl — Network badge, H1 "Simpul Jaringan Geospasial Nasional", JIGN description, search input
- ✅ 4 stat badges (Kementerian/Lembaga/Provinsi/Kab·Kota): grid-cols-4, `text-[#1A3BAF]` bold count, `text-slate-500` label
- ✅ "Daftar Simpul Jaringan" section header + "Lihat Semua" `→` link
- ✅ Category filter pills: Semua / Kementerian / Provinsi / Lembaga — active `bg-[#1A3BAF] text-white`
- ✅ Node cards: logo abbrev, name, type · dataset count, "Aktif" green pulse badge, ChevronRight — real data from `nodeService.getNodes({ limit: 4 })`

#### `/katalog` — CatalogPage (Figma 75:710)
- ✅ Search bar + filter chips row
- ✅ DatasetCard: thumbnail, category badge, data-source badge, bookmark toggle, title, description, stat row (format · download count · size)
- ✅ Pagination controls at bottom

#### `/webmap` — WebmapPage (Figma 81:950)
- ✅ Full-screen Leaflet map (100vh minus top bar + bottom nav)
- ✅ Layer manager drawer from bottom
- ✅ Basemap switcher, measurement tools, coordinate search

#### `/unduh` — DownloadCenterPage (Figma 86:1342)
- ✅ Preset filter chips (Batas Wilayah, Jaringan Jalan, etc.)
- ✅ Search input
- ✅ Download item cards with preview thumbnails, format badge, file size, download button

#### `/lainnya` — LainnyaPage (Figma 86:2426)
- ✅ 4 menu rows: Standar Data / Tools / Bantuan / Kontak Kami
- ✅ Each: colored icon bg, title, subtitle, ChevronRight
- ✅ Primary blue section header

#### `/standar-data` — StandarDataPage (Figma 160:1986 grid + 166:2690 list)
- ✅ Grid/List view toggle buttons
- ✅ Tab filter: Semua / Prioritas
- ✅ Grid view: thumbnail preview card with PRIORITAS/WAJIB badge, title, description
- ✅ List view: horizontal card with code label, title, category tag, download/detail CTA
- ✅ Detail modal: availability badge, download gate (auth-required or "belum tersedia")
- ✅ All "Masuk dengan Google" language replaced with "Masuk ke Akun"

#### `/bantuan` — BantuanPage (Figma 185:1596)
- ✅ Guide cards with category badge, title, PDF size, expandable summary + step list
- ✅ Download PDF button (simulated)
- ✅ Category filter: Semua / Akun & Akses / Teknis / Unduh

#### `/kontak` — KontakKamiPage (Figma 40:245)
- ✅ BIG office address card
- ✅ Phone, email, website contact rows
- ✅ Hours card
- ✅ Contact form: name, email, institution, subject, message
- ✅ Success state with 4s auto-reset

#### `/tools` — ToolsGISPage (Figma 30:997)
- ✅ Tool cards: Palapa v4.2.0, Metadata Editor v2.1.1
- ✅ Feature list, version badge, category badge
- ✅ Detail modal with documentation link

#### `/login` — LoginPage (No dedicated Figma frame)
- ✅ Brand patterns from existing frames: `#1A3BAF` blue, `#F1F7FA` bg, white card r-2xl
- ✅ Email/password native form
- ✅ Demo account 1-click card

#### `/register` — RegisterPage (No dedicated Figma frame)
- ✅ Brand patterns consistent with `/login`
- ✅ 5 fields + terms checkbox

---

## 5. Files Modified in Phase 13

| File | Change Type | Description |
|---|---|---|
| `client/src/pages/LoginPage.tsx` | Full rewrite | Google GIS → email/password form + demo card |
| `client/src/pages/RegisterPage.tsx` | Full rewrite | Added password-confirm, institution, terms checkbox |
| `client/src/pages/HomePage.tsx` | Full rewrite | Tab-2 Simpul Jaringan real data, stat badges, node cards |
| `client/src/components/catalog/DownloadModal.tsx` | Targeted edit | "Google" → "Ina-Geoportal" in auth gate text |
| `client/src/pages/StandarDataPage.tsx` | Targeted edit | "Google" → "Akun" in doc download gate text |
| `client/src/__tests__/authAndDownload.test.ts` | 4 tests added + wording fixed | Email/password login, register, error tests; Google→email wording |
| `docs/IMPLEMENTATION_STATUS.md` | Phase 13 row added | Implementation tracker updated |

---

## 6. Test Results (Final)

```
PASS server/src/__tests__/api.test.ts (44 tests)
PASS client/src/__tests__/authAndDownload.test.ts (13 tests)
PASS client/src/__tests__/workflow.test.ts (33 tests)

Total: 90 tests | 90 passed | 0 failed | 0 skipped
```

**Build:**
```
✓ server/ — tsc (0 errors)
✓ client/ — tsc && vite build (0 errors, 0 warnings)
```

---

## 7. What Was NOT Changed

The following areas were intentionally left untouched per non-destructive policy:

- **Prisma schema** — `googleId`, `avatarUrl`, `provider`, `emailVerified` fields preserved
- **`POST /api/v1/auth/google`** backend route — still functional for any future Google re-enablement
- **`useAuthStore.loginWithGoogle()`** — still present and tested
- **`authService.googleLogin()`** — API method preserved
- **Existing user data** — no migration, no data destruction
- **86 original test assertions** — all still pass exactly as before

---

## 8. Demo Account

```
Email    : demo@inageoportal.go.id
Password : Password123!
Role     : USER
Seeded   : server/prisma/seed.ts (bcrypt hash, provider = 'local')
```

The 1-Click demo login on `/login` calls `useAuthStore().login(email, password)` directly against the native `/api/v1/auth/login` endpoint — no Google token required.

---

*Phase 13 complete. All deliverables verified.*
