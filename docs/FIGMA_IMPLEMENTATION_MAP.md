# Figma Implementation Map
## INA-Geoportal Web App Redesign v2.0 (Mobile Reference)

**Figma Document**: `IMK - Project (Copy)`  
**File ID**: `X73V2XyVQoCdY1rR3zIkQC`  
**Page**: `imk project` (ID `15:299`)  
**Canvas Dimensions**: `402 × 874 px` (Mobile Viewport)  
**Verification Date**: 16 November 2026

---

## 1. Frame Mapping Table

| Figma Page | Figma Frame ID | Figma Frame Name | React Route / Page | Presentation Components | Existing Functional Handlers / APIs | Status |
|---|---|---|---|---|---|---|
| imk project | `65:525` | Beranda (Hi-Fi) | `/` (`HomePage.tsx`) | `FigmaHeader`, `FigmaHeroCard`, `FigmaTabSwitch`, `FigmaStatCards`, `FigmaBottomNav` | `datasetApi.getAll()`, `nodeApi.getAll()`, search autocomplete, tab switch | Implemented & Verified |
| imk project | `75:710` | webmap (Katalog Peta Hi-Fi) | `/katalog` (`CatalogPage.tsx`) | `FigmaCatalogHeader`, `FigmaDatasetCard`, `FigmaBottomNav` | `datasetApi.getAll()` with search & category filters, `/webmap?layerId=...`, detail modal | Implemented & Verified |
| imk project | `81:950` | webmap (Interactive Map Hi-Fi) | `/webmap` (`WebmapPage.tsx` / `WebmapViewer.tsx`) | `FigmaMapHeader`, `FigmaMapSearch`, `FigmaMapControlStack`, `FigmaBottomNav` | Leaflet map engine, zoom in/out, current location fly-to, `BasemapSwitcher`, `LayerManagerDrawer`, `LegendDrawer`, `SpatialTools`, `FeatureInfoDrawer` | Implemented & Verified |
| imk project | `86:1342` | unduh data (Hi-Fi) | `/unduh` (`DownloadCenterPage.tsx`) | `FigmaDownloadCard`, `DownloadModal`, `FigmaBottomNav` | Public download, restricted download + purpose audit trail, OGC Web Service copy | Implemented & Verified |
| imk project | `86:2426` | lainnya (Menu Lainnya Hi-Fi) | `/lainnya` (`LainnyaPage.tsx`) | `FigmaLainnyaCardList`, `FigmaBottomNav` | Navigation to Standar Data, Tools, Bantuan, Kontak Kami | Implemented & Verified |
| imk project | `160:1986` / `166:2690` | Standar data geospasial grid / list | `/standar-data` (`StandarDataPage.tsx`) | `FigmaStandarDataHeader`, `FigmaCategoryTabs`, `FigmaViewToggle`, `FigmaDocCard` | Filter (Semua, Prioritas, Non Prioritas), Grid / List view switch, document preview / detail | Implemented & Verified |
| imk project | `185:1596` | Lainnya > Bantuan | `/bantuan` (`BantuanPage.tsx`) | `FigmaBantuanList`, `FigmaBottomNav` | Download handbook/SNI guides, expandable FAQ, user documentation | Implemented & Verified |
| imk project | `40:245` | Lainnya: Kontak kami | `/kontak` (`KontakKamiPage.tsx`) | `FigmaKontakCard`, `FigmaBottomNav` | Contact information (BIG), operational hours, social media links, support program | Implemented & Verified |
| imk project | `30:997` | Lainnya > Tools | `/tools` (`ToolsGISPage.tsx`) | `FigmaToolCard`, `FigmaBottomNav` | Palapa, Metadata Editor, WebGIS coordinate converters & spatial tools | Implemented & Verified |
| imk project | `15:304` | Beranda (Wireframe) | `/` (Reference) | Wireframe reference for fallback layouts | Reference only | Verified |
| imk project | `18:448` | webmap (Wireframe) | `/webmap` (Reference) | Wireframe reference for map layouts | Reference only | Verified |
| - | - | User Authentication & Profile | `/login`, `/register`, `/profile` | `FigmaHeaderProfileBtn`, Auth forms | `authApi.login()`, `authApi.register()`, `authApi.getProfile()`, Download history, Bookmarks | Maintained |
| - | - | Simpul Jaringan Directory | `/simpul`, `/simpul/:nodeId` | `SimpulDirectory`, `NodeDetail` | `nodeApi.getAll()`, `nodeApi.getById()`, linked datasets | Maintained |

---

## 2. Design Tokens Extraction

### Colors
- **Canvas / Mobile Background**: `#F1F7FA`
- **Primary Blue**: `#1A3BAF`
- **Dark Navy (Hero Card)**: `#0C1D36`
- **Card Surface**: `#FFFFFF`
- **Gray Tab Container**: `#D9D9D9`
- **Text Main (Dark)**: `#1E1E1E`
- **Text Inactive / Placeholder**: `#717171`
- **Text White**: `#FFFFFF`
- **Border Blue Soft**: `rgba(26, 59, 175, 0.5)`
- **Badge Green (Prioritas)**: Fill `#E8F5E9`, Text/Border `#2E7D32`
- **Badge Orange (Year)**: Fill `#FFF3E0`, Text/Border `#EF6C00`
- **Badge Blue (Code)**: Fill `#E3F2FD`, Text/Border `#1565C0`

### Typography
- **Font Family**: `Inter, sans-serif`
- **Hero Title**: `24px Bold` (Line height auto, color `#FFFFFF`)
- **Section Title / Screen Title**: `24px Bold` (color `#1E1E1E`)
- **Stat Numbers**: `28px Bold` (color `#1E1E1E`)
- **Card Title**: `16px SemiBold`
- **Body Regular**: `14px Regular` (color `#1E1E1E` / `#FFFFFF`)
- **Badge / Small Labels / Bottom Nav**: `12px Regular` (color `#1E1E1E` / `#1A3BAF`)

### Spacing & Dimensions
- **Mobile Container**: max-width `430px` (centered on desktop with clean shadow, native 100% width on mobile)
- **Top Header Height**: `68px`
- **Bottom Navigation Height**: `70px` - `83px`
- **Card Corner Radius**: `8px` (`rounded-lg`)
- **Button / Search Bar Corner Radius**: `8px` - `12px` (`rounded-lg` / `rounded-xl`)
- **Badge Corner Radius**: `20px` (`rounded-full`)
- **Floating Map Action Buttons**: `45 × 45 px` (`rounded-full`, bg `#FFFFFF`, shadow-md, Figma node `83:1107`)
- **Map Floating Search Bar**: `w-full h-12` (`rounded-xl`, bg `#FFFFFF/95`, placeholder `"Cari lokasi atau peta"`, Figma node `81:1098`)
- **WebGIS Legend Drawer**: Mobile bottom drawer (`max-w-[390px]`, bg `#FFFFFF/95`, header `#0C1D36`, multi-class dynamic styling)
