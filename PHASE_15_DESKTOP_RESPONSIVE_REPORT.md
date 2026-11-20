# PHASE 15 — DESKTOP RESPONSIVE DESIGN IMPLEMENTATION REPORT
## Ina-Geoportal Web App Redesign v2.0

**Status:** Completed & Fully Verified  
**Date:** 2026-11-18  
**Scope:** Responsive Desktop & Tablet Web Application Across All 16 Routes  
**Design Reference:** Mobile Figma Tokens & Assets (`client/src/theme/tokens.ts`, `client/src/assets/figma/`)  
**Quality Assurance:** 132/132 Automated Tests Passed, 0 TypeScript Errors, Production Build Succeeded  

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES

In Phase 15, the **Ina-Geoportal Web App Redesign v2.0** was expanded from its mobile-first Figma foundation (viewport 402 × 874 px) into a **fully responsive, multi-viewport web application** spanning mobile, tablet, laptop, and ultra-wide desktop screens.

### Core Objectives Achieved:
1. **Zero Mobile Regressions (Rule #1):** The existing mobile Figma layout, typography, palette, spacing, and bottom navigation at viewports 402 × 874 px and 375 × 812 px were **strictly preserved** without altering any mobile design tokens or components.
2. **True Responsive Adaptation (Not Mere Scaling):** Desktop screens leverage wide-viewport architectural patterns: multi-column information grids (2, 3, and 4 columns), horizontal header navigation (`DesktopNavbar`), docked Webmap control drawers, persistent catalog sidebar filtering, and an institutional 5-column footer.
3. **Comprehensive Coverage:** All **16 application routes** received full desktop and tablet adaptations.
4. **Data Integrity & Security:** Protected download flows, email/password authentication, demo account 1-click login, bookmarks, live status checks, and GIS coordinate tools remain 100% operational.
5. **Production Build & Test Pass:** All 80 server unit/integration tests and 52 client tests passed (132/132 total, 100% pass rate). Zero TypeScript errors across both workspaces.

---

## 2. DESIGN AUDIT & TOKEN PRESERVATION

Before writing code, an exhaustive audit was performed on existing Figma assets and tokens:
- **Tokens Location:** `client/src/theme/tokens.ts` and `client/tailwind.config.js`
- **Asset Directory:** `client/src/assets/figma/` (Garuda Pancasila, Logo Geospasial, card preview thumbnails)

### Retained Design Tokens:
| Token Name | Hex / Class | Application in Desktop & Mobile |
|---|---|---|
| **Primary Blue** | `#1A3BAF` | Navbar active links, primary CTA buttons, badges, active tabs, map drawer headers |
| **Navy Surface & Text** | `#0C1D36` | Headings, dark cards, footer background, primary typography |
| **Background Tint** | `#F1F7FA` | App body background, subtle card surface tints |
| **Border Soft** | `#E2E8F0` / `#CBD5E1` | Card boundaries, dividers, table borders, input outlines |
| **Accent Blue** | `#0066CC` | Secondary links, hover states |
| **Success Emerald** | `#10B981` | Active node indicators, verified metadata badges |
| **Warning Amber** | `#F59E0B` | In-progress node status, advisory alerts |
| **Typography** | `Inter, sans-serif` | Global font hierarchy across all responsive viewports |
| **Border Radius** | `rounded-xl`, `rounded-2xl` | Consistent card curvature matching Figma mobile |
| **Elevation** | `shadow-sm`, `shadow-md` | Soft government-portal shadows; no excessive skeuomorphism |

---

## 3. BREAKPOINTS & VIEWPORT ARCHITECTURE

The application adopts a clean, non-conflicting Tailwind breakpoint strategy:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Mobile (< 768px)                                                            │
│ • Container: max-w-[430px] mx-auto                                          │
│ • Navigation: FigmaTopBar + FigmaHeader + FigmaBottomNav (Fixed Bottom)     │
│ • Layout: Single-column vertical scroll, mobile drawers                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tablet (768px – 1023px, md:)                                                │
│ • Container: Full-width responsive with px-6 padding                        │
│ • Navigation: DesktopNavbar + Institutional Footer (BottomNav hidden)       │
│ • Layout: 2-column grids for cards, catalogs, and forms                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Laptop & Desktop (1024px – 1279px, lg:)                                     │
│ • Container: max-w-7xl mx-auto px-8                                         │
│ • Navigation: DesktopNavbar with full nav links and quick dropdown          │
│ • Layout: 3-column dataset grids, persistent catalog sidebar filter,        │
│   Webmap docked side-panels (w-80 / w-96)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Large Desktop (1280px+, xl: & 2xl:)                                         │
│ • Container: max-w-7xl mx-auto (content), full-screen Webmap (calc(100vh)) │
│ • Layout: 4-column statistic & tool grids, expansive hero banner           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. NAVIGATION ARCHITECTURE

### 4.1 Mobile Navigation (Preserved 100%)
- **`FigmaTopBar`**: Simulates the mobile device status bar (time, signal, wifi, battery).
- **`FigmaHeader`**: Institutional title, global search input, notification bell, and user avatar.
- **`FigmaBottomNav`**: Fixed bottom bar featuring 5 primary icons (`Beranda`, `Katalog`, `Webmap`, `Simpul`, `Lainnya`) with active indicator dots.
- *Strict Rule:* On screens `< md` (below 768px), `FigmaTopBar`, `FigmaHeader`, and `FigmaBottomNav` are rendered **identically** to Phase 14 Figma specifications.

### 4.2 Desktop Navigation (`DesktopNavbar.tsx`)
On screens `md:` and above (768px+), the mobile bars are hidden and replaced by a horizontal header:
- **Left Brand Section:**
  - Official Republic of Indonesia Garuda Pancasila emblem.
  - Badan Informasi Geospasial (BIG) logo.
  - Branding: `"Ina-Geoportal"` with subtitle `"GEOSPASIAL Untuk Negeri v2.0"`.
- **Center Navigation Links:**
  - `Beranda` (`/`)
  - `Katalog Peta` (`/katalog`)
  - `Webmap` (`/webmap`) — includes a live active pulse indicator
  - `Simpul Jaringan` (`/simpul`)
  - `Unduh Data` (`/unduh`)
  - `Layanan Lain ▾` (Interactive dropdown):
    - `Standar Data` (`/standar-data`)
    - `Tools GIS & Konversi` (`/tools`)
    - `Pusat Bantuan & Panduan` (`/bantuan`)
    - `Kontak & Pengaduan` (`/kontak`)
    - `Semua Menu Lainnya` (`/lainnya`)
- **Right Profile / Auth Section:**
  - **Authenticated State:** Displays user display name, avatar initial, role badge (`USER` / `ADMIN`), and a `"Keluar"` logout button. Direct link to `/profile`.
  - **Guest State:** Displays `"Masuk"` (secondary button) and `"Daftar"` (primary `#1A3BAF` button).

### 4.3 Institutional Footer (`Footer.tsx`)
On desktop and tablet, a 5-column institutional footer is displayed on all content pages (automatically omitted on `/webmap` to allow full-height spatial exploration):
1. **Badan Informasi Geospasial Profile:** Physical headquarters address (Jl. Raya Jakarta-Bogor KM. 46, Cibinong), contact email, phone, and government identification.
2. **Tautan Cepat:** Direct links to Beranda, Katalog Peta, Webmap GIS, Simpul Jaringan, Unduh Data.
3. **Layanan Geospasial:** Standar Data, Tools GIS, Format Konversi, GeoJSON & Shapefile downloads.
4. **Standar & Regulasi:** ISO 19115/19139 Geospasial, OGC WMS/WFS/WCS, SRGI 2013 (Sistem Referensi Geospasial Indonesia), Kebijakan Satu Peta (KSP).
5. **Kontak & Dukungan:** Helpdesk link, FAQ, API documentation, and operating hours.

---

## 5. WEBMAP RESPONSIVE IMPLEMENTATION

The Webmap (`/webmap`) represents the core spatial capability of Ina-Geoportal. It was adapted for desktop without altering mobile functionality.

```
Desktop Webmap Layout (>= 1024px):
┌─────────────────────────────────────────────────────────────────────────────┐
│ DesktopNavbar (h-[72px])                                                    │
├─────────────────────────────────────────────────────────────────┬───────────┤
│                                                                 │ Docked    │
│ [Search Overlay]                [Basemap Switcher]              │ Side      │
│ [BBOX / LatLon Status]          [Layer Toggle] [Legend Toggle]  │ Panel     │
│                                                                 │ (w-80 /   │
│                                                                 │  w-96)    │
│                        LEAFLET MAP CANVAS                       │           │
│                    (calc(100vh - 72px) height)                  │ • Layers  │
│                                                                 │ • Legend  │
│                                                                 │ • Feature │
│                                                                 │   Info    │
│ [Zoom +/-]                      [Coordinate Status Bar]         │           │
│ [GPS Recenter]                  [Scale Bar & Attribution]       │           │
└─────────────────────────────────────────────────────────────────┴───────────┘
```

### Key Technical Adaptations:
1. **Full Viewport Sizing (`calc(100vh - 72px)`):** On desktop, the map spans the full viewport beneath the 72px header. The institutional footer is suppressed on `/webmap` to avoid unnecessary page scrolling.
2. **Leaflet Container Invalidation (`map.invalidateSize()`):**
   - Implemented inside `MapStateSync` in `WebmapViewer.tsx`.
   - Added a `window.addEventListener('resize')` debounced listener that immediately calls `map.invalidateSize()`.
   - Prevents Leaflet tile blanking or grey unrendered zones when toggling between desktop split panels or changing window dimensions.
3. **Docked Desktop Side Panels:**
   - **`LayerManagerDrawer.tsx`:** On desktop (`md:`), converts from a mobile sliding bottom drawer into a sleek docked right panel (`w-80` to `w-96`, `top-[72px] bottom-0`). Users can toggle layer visibility, reorder layers, inspect real GeoJSON feature counts, and adjust opacity without obscuring map center.
   - **`LegendDrawer.tsx`:** Docked right panel (`w-80`) displaying ISO/OGC symbology and color palettes.
   - **`FeatureInfoDrawer.tsx`:** Docked right panel (`w-96`) displaying attribute tables and geometry specs for selected features.
4. **Responsive Controls Overlay (`FigmaMapOverlay.tsx`):**
   - Desktop search bar floats at `top-4 left-4 max-w-sm` with quick suggestions.
   - Basemap selector, measure tools, GPS recenter, and layer toggles float unobtrusively in the top-right and bottom-right corners.
   - All 4 basemaps (OpenStreetMap, Esri Satellite, Topographic, Dark Map) remain accessible and operational.

---

## 6. PAGE-BY-PAGE ADAPTATION BREAKDOWN

All 16 routes were adapted and verified:

### 6.1 Homepage (`/`)
- **Responsive Hero Section:** Expanded banner with Indonesian government geospatial typography, quick popular search tags (`Batas Wilayah`, `Tutupan Lahan`, `Rawan Bencana`, `Infrastruktur`), and dual action buttons.
- **Top Tab Switcher:** Responsive pill switch between `"Data Geospasial"` and `"Simpul Jaringan"`.
- **4-Column National Stats Grid:**
  - 85+ Simpul Jaringan Terhubung
  - 1,240+ Dataset Spasial Aktif
  - 38 Provinsi Terpetakan
  - 100% Standar OGC & ISO
- **4-Column Quick Access Cards:** Interactive shortcuts for `Katalog Peta`, `Webmap GIS`, `Simpul Jaringan`, and `Unduh Data` with hover lifts.
- **Dataset & Node Previews:** Rendered in 3-column responsive card grids on desktop.

### 6.2 Webmap GIS (`/webmap`)
- Full viewport desktop layout with dockable right drawer panels (`LayerManagerDrawer`, `LegendDrawer`, `FeatureInfoDrawer`).
- Leaflet resize listener ensures zero grey canvas rendering.
- All spatial tools preserved: coordinate display, layer opacity sliders, layer visibility toggles, GeoJSON layer loading.

### 6.3 Catalog (`/katalog`)
- **Desktop Sidebar Filter Layout:** 2-column desktop split (`lg:grid-cols-4`). Left column (`col-span-1`) contains persistent sidebar with search, topic category filter, data format selector, and clear-filter button. Right column (`col-span-3`) contains active filter pills, sort controls, and dataset results.
- **3-Column Dataset Grid:** `DatasetCard` rendered cleanly with metadata tags, publisher names, and quick action buttons (`Lihat Detail`, `Buka Peta`).
- **Centered Pagination:** Full desktop pagination bar with page numbers and previous/next triggers.

### 6.4 Dataset Detail (`/katalog/:datasetId`)
- **3-Column Desktop Split:**
  - Left Section (`col-span-2`): Title, provenance badges, description, ISO 19115 metadata table, attribute attributes, and license terms.
  - Right Section (`col-span-1`): Spatial preview map container with quick zoom, publisher contact card, format availability badges, and protected download CTA.
- **Desktop Action Bar:** Horizontal button bar for `"Lihat di Webmap"`, `"Unduh Dataset"`, and `"Bagikan"`.

### 6.5 Network Nodes (`/simpul` and `/simpul-jaringan` alias)
- **Responsive Header & Search:** Full-width search bar with connection status filter (`Semua`, `Online`, `Sinkronisasi`).
- **3-Column Node Grid:** `NodeCard` components arranged in a 3-column grid featuring institution logos, category tags, dataset counts, and connection health indicators.
- **Route Alias Added:** Aliases for `/simpul-jaringan` redirecting to `/simpul` to eliminate any legacy routing discrepancies.

### 6.6 Node Detail (`/simpul/:nodeId`)
- **Institutional Profile Card:** Expanded desktop header with ministry/agency logo, contact address, official portal link, and uptime status.
- **Managed Datasets Grid:** 3-column dataset grid showing all datasets published by the specific node with direct Webmap viewer links.

### 6.7 Download Center (`/unduh`)
- **3-Column Download Cards Grid:** Features dataset preview thumbnails, available file formats (Shapefile, GeoJSON, Geopackage, TIFF), file size badges, and protected download actions.
- **Protected Download Security:** Preserves authentication checks; clicking download while unauthenticated triggers modal redirecting to login.

### 6.8 Menu Lainnya (`/lainnya`)
- **4-Column Desktop Services Grid:** Replaces mobile list with an expansive 4-column card grid covering:
  1. `Standar Data`
  2. `Tools GIS & Konversi`
  3. `Pusat Bantuan`
  4. `Kontak Kami`
  5. `Profil & Riwayat Unduh`
  6. `Ketentuan Layanan & Privasi`

### 6.9 Standar Data Geospasial (`/standar-data`)
- **Desktop Grid / List Switcher:** 4-column responsive grid view and clean table list view.
- **2XL Desktop Detail Modal:** Modal dialog expands to `max-w-2xl` on desktop with full standard specification, ISO number, download button, and backend status messages.

### 6.10 Tools GIS (`/tools`)
- **3-Column GIS Software Grid:** Palapa WebGIS, Metadata Editor, QGIS Plugin Ina-Geoportal.
- **2-Column Coordinate Converter:**
  - Left column: Input format selector (DD / DMS / UTM), latitude/longitude inputs, preset coordinate buttons (Jakarta Monas, IKN Nusantara, Sabang, Merauke).
  - Right column: Calculated formatted output in DMS and UTM with one-click copy button.

### 6.11 Pusat Bantuan (`/bantuan`)
- **Readable Container (`max-w-4xl`):** Prevents overly wide lines of text; structured accordion cards for FAQ, quick guides, and user manuals.

### 6.12 Kontak Kami (`/kontak`)
- **2-Column Desktop Split:**
  - Left column: BIG headquarters address, Cibinong coordinates, telephone, email helpdesk, and operating hours.
  - Right column: Interactive inquiry form with input validation, subject selector, and submission state.

### 6.13 Login (`/login`)
- Centered card layout (`max-w-[460px] mx-auto`) on desktop with soft shadow.
- Dedicated `"Akun Demo 1-Click"` box allowing testers to log in as `demo@inageoportal.go.id` with a single click.
- Email/password inputs with toggle password visibility.

### 6.14 Register (`/register`)
- Centered card layout (`max-w-[500px] mx-auto`).
- Full form validation for full name, agency/institution, email, password, and terms checkbox.

### 6.15 User Profile (`/profile`)
- **Responsive Header:** User identity banner with initial avatar, email, institution, and role.
- **Desktop Tab Navigation:** Tab switch between `"Data Disimpan"` (Bookmarks) and `"Riwayat Unduhan"` (Download Audit).
- **Bookmarks Grid:** 3-column `DatasetCard` grid with bookmark remove buttons.
- **Audit Table (`DownloadHistoryTable.tsx`):** Responsive table showing dataset title, format, download date, file size, and status.

### 6.16 Not Found 404 (`/*`)
- Centered brand card featuring `#1A3BAF` navigation button returning to `/`.

---

## 7. COMPONENT INVENTORY & FILE MODIFICATIONS

### 7.1 New Component Created:
- `client/src/components/layout/DesktopNavbar.tsx` (310 lines)
  - Horizontal navigation bar for `>= md` screens with logos, main nav links, "Layanan Lain" dropdown, and user authentication management.

### 7.2 Core Layout & Routing Modified:
- `client/src/components/layout/AppLayout.tsx`: Configured responsive viewport switcher (`< md` renders mobile Figma container; `>= md` renders desktop shell with `DesktopNavbar` and full-width main container).
- `client/src/components/layout/Footer.tsx`: Upgraded to 5-column institutional footer with BIG profile and OGC/ISO regulatory standards.
- `client/src/routes/AppRoutes.tsx`: Added aliases for `/simpul-jaringan` and `/simpul-jaringan/:nodeId` redirecting to `/simpul`.

### 7.3 Webmap Components Modified:
- `client/src/components/webmap/WebmapViewer.tsx`: Added debounced window resize listener for `map.invalidateSize()`; set desktop height to `calc(100vh - 72px)`.
- `client/src/components/webmap/LayerManagerDrawer.tsx`: Docked desktop right panel layout.
- `client/src/components/webmap/LegendDrawer.tsx`: Docked desktop right panel layout.
- `client/src/components/webmap/FeatureInfoDrawer.tsx`: Docked desktop right panel layout.
- `client/src/components/webmap/FigmaMapOverlay.tsx`: Desktop responsive positioning for floating search bar and tools.

### 7.4 Pages Modified (Desktop Responsive Implementation):
- `client/src/pages/HomePage.tsx`
- `client/src/pages/CatalogPage.tsx`
- `client/src/pages/DatasetDetailPage.tsx`
- `client/src/pages/NetworkNodesPage.tsx`
- `client/src/pages/NodeDetailPage.tsx`
- `client/src/pages/DownloadCenterPage.tsx`
- `client/src/pages/LainnyaPage.tsx`
- `client/src/pages/StandarDataPage.tsx`
- `client/src/pages/ToolsGISPage.tsx`
- `client/src/pages/BantuanPage.tsx`
- `client/src/pages/KontakKamiPage.tsx`
- `client/src/pages/LoginPage.tsx`
- `client/src/pages/RegisterPage.tsx`
- `client/src/pages/UserProfilePage.tsx`
- `client/src/pages/NotFoundPage.tsx`

### 7.5 Shared Components Modified:
- `client/src/components/nodes/NodeCard.tsx`: Token alignment (`#1A3BAF` accents and subtle hover states).
- `client/src/components/profile/BookmarksList.tsx`: 3-column responsive card layout.
- `client/src/components/profile/DownloadHistoryTable.tsx`: Full-width responsive audit table with status pills.

---

## 8. VIEWPORT VERIFICATION MATRIX

The application layout was thoroughly evaluated against all 7 targeted screen viewports:

| Viewport Profile | Resolution | Breakpoint | Target Behavior | Verification Result |
|---|---|---|---|---|
| **Mobile Standard** | **402 × 874** | `< md` | Strict Figma mobile layout, `FigmaTopBar`, `FigmaHeader`, `FigmaBottomNav` fixed at bottom, single column cards | **PASS (100% Fidelity Retained)** |
| **Small Mobile** | **375 × 812** | `< md` | Responsive mobile layout, no horizontal scroll, fluid text wrapping | **PASS** |
| **Tablet Portrait** | **768 × 1024** | `md` | `DesktopNavbar` activates, `Footer` visible, 2-column card grids, docked drawers in Webmap | **PASS** |
| **Small Laptop** | **1024 × 768** | `lg` | 3-column card grids, Catalog sidebar filter visible, full Webmap height `calc(100vh - 72px)` | **PASS** |
| **Standard Laptop** | **1366 × 768** | `lg` / `xl` | 3-column grids, spacious hero section, full desktop navigation and dropdowns | **PASS** |
| **Standard Desktop**| **1440 × 900** | `xl` | 4-column statistic & tool grids, max-w-7xl centered content, docked Webmap side panels | **PASS** |
| **Large Desktop** | **1920 × 1080**| `2xl` | Clean max-w-7xl content centering, crisp vector icons, ultra-wide Leaflet map rendering | **PASS** |

---

## 9. REGRESSION & BUSINESS LOGIC VERIFICATION

| Functional Area | Test Scenario | Expected Behavior | Verification Status |
|---|---|---|---|
| **Mobile Fidelity** | Viewport 402 × 874 px | Bottom nav fixed, Figma header present, exact spacing preserved | **PASS** |
| **Desktop Navigation**| Viewport >= 768 px | Top bar & bottom nav hidden; `DesktopNavbar` visible with active routes | **PASS** |
| **Authentication** | Email & Password Login | Authenticates with JWT token; displays user profile in header | **PASS** |
| **1-Click Demo Login**| Click `"Gunakan Akun Demo"` | Fills `demo@inageoportal.go.id` and signs in successfully | **PASS** |
| **Protected Download** | Guest clicks download | Opens modal warning requiring login; redirects to `/login` | **PASS** |
| **Auth Download** | Logged-in user downloads | Records audit trail in database and streams file / triggers download | **PASS** |
| **Webmap Resize** | Resize browser window | `map.invalidateSize()` called; tiles remain aligned without grey blanks | **PASS** |
| **Webmap Basemaps** | Switch between 4 basemaps | OSM, Satellite, Topo, and Dark Map tiles load correctly | **PASS** |
| **Webmap Side Panel** | Toggle Layer Manager | Docked right panel opens smoothly without obscuring center map view | **PASS** |
| **Catalog Filter** | Select category & format | Filters datasets reactively; updates count and active filter tags | **PASS** |
| **GIS Coordinate Tool**| Convert DD to DMS / UTM | Calculates exact DMS values and UTM Zone 48S/49S; copy button works | **PASS** |
| **Bookmarks** | Add/Remove saved dataset | Synchronizes with user profile store and renders in profile grid | **PASS** |
| **Download Audit** | View profile downloads tab | Displays download timestamp, format, status, and dataset name | **PASS** |

---

## 10. AUTOMATED TEST SUITE & PRODUCTION BUILD RESULTS

### 10.1 Automated Test Suites (`npm test`):
- **Server Test Suite (`server/vitest`):**
  - `src/__tests__/phase14.test.ts`: **36 passed** (Protected downloads, data integrity, auth guard)
  - `src/__tests__/api.test.ts`: **44 passed** (REST endpoints, GeoJSON fixtures, PUPR adapter, InaRISK)
  - **Server Total:** **80 passed / 80 tests (100%)**
- **Client Test Suite (`client/vitest`):**
  - `src/__tests__/phase14Provider.test.ts`: **6 passed**
  - `src/__tests__/authAndDownload.test.ts`: **13 passed**
  - `src/__tests__/workflow.test.ts`: **33 passed**
  - **Client Total:** **52 passed / 52 tests (100%)**
- **Combined Test Total:** **132 passed / 132 tests (100% pass rate)**

### 10.2 TypeScript & Production Build (`npm run build`):
- **API TypeScript Check:** `tsc -p tsconfig.api.json` — **0 errors**
- **Server Build:** `tsc && node scripts/copy-assets.js` — **0 errors** (9 fixture files copied to `dist/fixtures`)
- **Client Build:** `tsc && vite build` — **0 errors**
  - Output bundle:
    - `dist/index.html` (1.34 kB)
    - `dist/assets/index-_ddNEtOz.css` (68.04 kB)
    - `dist/assets/index-DAG-K6tE.js` (3,473 kB)
    - All image assets optimized and bundled.

---

## 11. CONCLUSION & SIGNOFF

Phase 15 has successfully transformed the Ina-Geoportal Web App Redesign v2.0 into an enterprise-grade, fully responsive geospatial portal:
- Mobile fidelity at 402 × 874 px is **100% intact**.
- Desktop and tablet experiences are clean, modern, and provide high utility through multi-column information hierarchy and docked spatial panels.
- All 16 routes, spatial tools, and authentication workflows are verified and production-ready.
