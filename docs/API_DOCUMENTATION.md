# API Documentation
# INA-GEOPORTAL WEB APP REDESIGN V2.0

Base URL: `/api/v1`

All responses follow a standard JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "meta": { ... } // for pagination or metadata
}
```
Error response format:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Dataset not found",
    "details": [ ... ]
  }
}
```

---

## 1. Homepage & Global Search

### `GET /api/v1/stats/overview`
Returns summary numbers for Simpul Jaringan, total datasets, and top thematic categories.
- **Response**:
```json
{
  "success": true,
  "data": {
    "totalNodes": 42,
    "totalDatasets": 128,
    "totalDownloads": 1420,
    "topCategories": [
      { "id": "administrasi", "name": "Batas Wilayah", "count": 28 },
      { "id": "transportasi", "name": "Transportasi", "count": 24 },
      { "id": "kebencanaan", "name": "Kebencanaan", "count": 19 },
      { "id": "lingkungan", "name": "Lingkungan & Tutupan Lahan", "count": 18 },
      { "id": "kesehatan", "name": "Kesehatan", "count": 15 },
      { "id": "topografi", "name": "Topografi & RBI", "count": 12 }
    ],
    "isDemo": true
  }
}
```

### `GET /api/v1/search/suggest`
Autocomplete suggestions as the user types in the global search bar.
- **Query Params**:
  - `q` (string, required): query keyword (e.g. `batas`)
  - `limit` (number, optional, default: 5)
- **Response**:
```json
{
  "success": true,
  "data": [
    { "type": "dataset", "id": "ds-001", "title": "Batas Administrasi Kabupaten/Kota Indonesia", "sub": "Badan Informasi Geospasial" },
    { "type": "category", "id": "administrasi", "title": "Batas Wilayah", "sub": "Kategori Tematik" },
    { "type": "node", "id": "node-big", "title": "Badan Informasi Geospasial", "sub": "Kementerian / Lembaga" }
  ]
}
```

---

## 2. Catalog & Datasets

### `GET /api/v1/datasets`
Search and filter datasets.
- **Query Params**:
  - `q` (string): free text search
  - `category` (string): category slug or id
  - `node_id` (string): institution/node id
  - `format` (string): `shp` | `geojson` | `kml` | `wms` | `wfs`
  - `year` (number): production/update year
  - `access_type` (string): `public` | `restricted`
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `sort` (string, default: `newest`): `newest` | `popular` | `title_asc` | `title_desc`
- **Response**:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 6,
    "totalPages": 1
  }
}
```

### `GET /api/v1/datasets/:id`
Retrieves comprehensive ISO 19115 compliant metadata for a single dataset.

### `POST /api/v1/datasets/:id/download`
Processes download requests according to access type.
- **Headers**:
  - `Authorization: Bearer <token>` (Required if `access_type === 'restricted'`)
- **Body**:
```json
{
  "format": "geojson",
  "purpose": "Penelitian Skripsi Terkait Pemetaan Wilayah Bencana"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "/api/v1/datasets/ds-001/file?format=geojson",
    "format": "geojson",
    "accessType": "public",
    "status": "APPROVED",
    "expiresAt": "2026-11-15T12:00:00Z"
  }
}
```

### `GET /api/v1/categories`
Returns thematic categories list with dataset counts.

---

## 3. Network Nodes (Simpul Jaringan)

### `GET /api/v1/nodes`
List network nodes with filtering by type and connection status.
- **Query Params**:
  - `type`: `kl` | `provinsi` | `kabkot`
  - `status`: `online` | `synced` | `offline` | `unknown`
  - `q`: search string
  - `page`, `limit`

### `GET /api/v1/nodes/:nodeId`
Get institution profile, contact info, connection status, and list of published datasets.

---

## 4. Authentication & Profile

### `POST /api/v1/auth/register`
- **Body**: `{ "name": "...", "email": "...", "password": "...", "institution": "..." }`
- **Response**: `{ "success": true, "data": { "token": "...", "user": { ... } } }`

### `POST /api/v1/auth/login`
- **Body**: `{ "email": "...", "password": "..." }`
- **Response**: `{ "success": true, "data": { "token": "...", "user": { ... } } }`

### `GET /api/v1/user/profile`
Protected route. Returns current user profile.

### `GET /api/v1/user/downloads`
Protected route. Returns user's download history audit log.

### `GET /api/v1/user/bookmarks`
Protected route. Returns saved bookmarks.

### `POST /api/v1/user/bookmarks`
- **Body**: `{ "datasetId": "ds-001" }`
- Toggles bookmark state (adds or removes).
