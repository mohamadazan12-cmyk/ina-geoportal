# System Architecture Document
# INA-GEOPORTAL WEB APP REDESIGN V2.0

## 1. High-Level Architecture Overview
The application follows a decoupled Client-Server architecture:
- **Client (Frontend)**: React 18+ with TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React Router DOM, and React-Leaflet. Designed with strict separation between business logic (custom hooks, services, stores) and presentational components to facilitate seamless Figma UI integration later.
- **Server (Backend)**: Node.js with Express.js, TypeScript, and Prisma ORM. Serves RESTful API v1 with standardized JSON responses, JWT authentication, rate limiting, and geospatial proxying.
- **Database**: SQLite for zero-configuration, robust local development with identical Prisma schema migration path to PostgreSQL/PostGIS.
- **OGC & External Services**: Public WMS/WFS/XYZ services, OpenStreetMap tile servers, and built-in GeoJSON fallback fixtures.

```
+----------------------------------------------------------------------------------+
|                               Client (React + Vite)                              |
|  [Pages & Routes] <---> [Zustand Stores] <---> [TanStack Query & Axios Services] |
|            |                     |                                |              |
|   [Presentational UI]   [useMapStore / useCatalog]                |              |
|   (Ready for Figma)              |                                |              |
|            |            [Leaflet / WebGIS Engine]                 |              |
+------------|---------------------|--------------------------------|--------------+
             |                     |                                |
             | HTTP                | OGC Tiles / WMS / GeoJSON      | REST API
             v                     v                                v
+--------------------------+  +--------------------------+  +----------------------+
| External Tile Providers  |  | Public GeoServers / OGC  |  | Server (Express.js)  |
| - OpenStreetMap          |  | - WMS GetMap             |  | - REST API v1        |
| - CartoDB Dark/Light     |  | - WMS GetFeatureInfo     |  | - JWT Auth           |
| - USGS / ESRI Sat / Topo |  | - WFS GeoJSON / WFS XML  |  | - Catalog / Nodes    |
+--------------------------+  +--------------------------+  +----------|-----------+
                                                                       | Prisma ORM
                                                                       v
                                                            +----------------------+
                                                            | Database (SQLite /   |
                                                            | PostgreSQL)          |
                                                            +----------------------+
```

## 2. Directory Structure
```
project-root/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/           # Shared UI (Button, Modal, Badge, Input, Toast)
│   │   │   ├── layout/           # Navbar, Footer, AppLayout
│   │   │   ├── home/             # Hero, StatsCard, GlobalSearch, QuickAccess
│   │   │   ├── catalog/          # FilterBar, DatasetCard, Pagination, DownloadModal
│   │   │   ├── webmap/           # MapContainer, LayerManager, BasemapSwitcher,
│   │   │   │                     # SpatialTools, FeatureInfoDrawer, LegendDrawer
│   │   │   ├── nodes/            # NodeCard, NodeDetailView
│   │   │   └── profile/          # BookmarkList, DownloadHistoryTable
│   │   ├── pages/                # Route components
│   │   ├── routes/               # AppRoutes & ProtectedRoute
│   │   ├── store/                # useAuthStore, useMapStore, useCatalogStore
│   │   ├── services/             # axios client, api endpoints (datasets, nodes, auth)
│   │   ├── hooks/                # useDatasets, useNodes, useFeatureInfo, useMeasure
│   │   ├── types/                # TypeScript interfaces (Dataset, Node, Layer, User)
│   │   ├── utils/                # formatters, geojsonParser, kmlParser, wmsHelper
│   │   └── constants/            # defaultLayers, basemaps, sampleData
├── server/
│   ├── prisma/                   # schema.prisma, seed.ts, migrations
│   ├── src/
│   │   ├── config/               # env vars, constants
│   │   ├── controllers/          # auth, datasets, nodes, stats, user
│   │   ├── middleware/           # authMiddleware, errorHandler, rateLimiter
│   │   ├── models/               # Prisma client wrapper & DTOs
│   │   ├── repositories/         # datasetRepo, nodeRepo, userRepo
│   │   ├── routes/               # router setup for /api/v1/*
│   │   ├── services/             # authService, datasetService, nodeService
│   │   ├── utils/                # jwt, passwordHash, responseFormatter
│   │   └── validators/           # zod schemas for request validation
│   └── tsconfig.json
├── docs/
├── package.json
└── README.md
```

## 3. Global State Architecture
- **useAuthStore**: JWT token storage, user session, login, register, logout, persistence in localStorage.
- **useMapStore**:
  - `activeLayers`: Array of layers ordered by `zIndex`, with properties: `id, name, description, url, type, opacity, visible, zIndex, legendUrl, attribution, source, format, geojsonData`.
  - `basemap`: `'osm' | 'satellite' | 'topo' | 'dark'`.
  - `selectedFeature`: attribute table payload from GetFeatureInfo or vector click.
  - `mapCenter`, `zoom`: interactive spatial coordinates.
  - actions: `addLayer`, `removeLayer`, `toggleLayerVisibility`, `updateLayerOpacity`, `reorderLayers`, `setBasemap`, `setSelectedFeature`.
- **useCatalogStore**: query parameters, filter selections, active pagination synced with URLSearchParams.
- **TanStack Query**: handles server-state caching, deduping, background refetching, and query key invalidation.
