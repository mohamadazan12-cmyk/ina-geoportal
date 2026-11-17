# Vercel Deployment Runbook

Phase 14 / P0 — single-project, same-origin architecture.

> Status: prepared and locally verified. **Nothing has been deployed or pushed.**

---

## 1. Architecture

```
https://<project>.vercel.app
├── /                        → client/dist/index.html   (static SPA, CDN)
├── /assets/*                → client/dist/assets/*     (immutable, 1-year cache)
├── /api/v1/*                → api/[...path].ts         (Express function)
├── /api                     → api/index.ts             (Express function)
└── /health                  → rewritten to /api/health (Express function)
```

One origin means:

- no CORS configuration is required (`CORS_ORIGIN` stays empty),
- `VITE_API_URL` can stay at its relative default `/api/v1`,
- cookies and `Authorization` headers are first-party,
- no separate backend host to pay for or manage.

### Serverless entry points

| File | Purpose |
| --- | --- |
| `server/src/app.ts` | builds and exports the Express application. **No `.listen()`.** |
| `server/src/index.ts` | development/local server only. Skips listening under `NODE_ENV=test` or when `VERCEL`/`VERCEL_ENV` is present. |
| `api/index.ts` | Vercel function for the exact `/api` path. |
| `api/[...path].ts` | Vercel catch-all function for `/api/*`; the function receives the original path, so no rewrite is needed for API traffic. |

`api/[...path].ts` exists specifically to avoid depending on rewrite
path-preservation semantics: Vercel's filesystem router maps `/api/v1/...`
directly to the function, so Express always sees the real URL.

---

## 2. Required environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production
and Preview). Never commit them.

| Variable | Required | Notes |
| --- | --- | --- |
| `JWT_SECRET` | ✅ | ≥ 32 chars. Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`. The server refuses to start without a strong value. |
| `DATABASE_URL` | ✅ | Neon pooled connection string with `?sslmode=require&pgbouncer=true&connection_limit=1`. |
| `UPSTASH_REDIS_REST_URL` | ✅ | Shared rate limiter. |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Shared rate limiter. |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Private store: original documents + dataset downloads. |
| `BLOB_PUBLIC_READ_WRITE_TOKEN` | optional | Separate public store for display-only map layers. Falls back to the private token only if you choose to share it. |
| `STORAGE_DRIVER` | optional | `local` or `vercel-blob`. Auto-detects `vercel-blob` when `BLOB_READ_WRITE_TOKEN` is present. |
| `CORS_ORIGIN` | optional | Leave **empty** for same-origin. Comma-separated allow-list if you ever split the hosts. |
| `RATE_LIMIT_ALLOW_MEMORY` | optional | `true` explicitly permits a process-local limiter. **Not recommended in production.** |
| `PRISMA_TARGET` | optional | `postgres` / `sqlite`. Auto-detected from `DATABASE_URL`. |

`NODE_ENV` is set automatically by Vercel (`production`).

### Why the server refuses to boot without Upstash

A per-invocation in-memory counter cannot enforce a shared budget across
serverless instances, so it would silently provide no real protection. The
production path therefore **fails fast** with `RATE_LIMIT_BACKEND_MISSING`
instead of degrading quietly. If you need to deploy before Upstash exists, set
`RATE_LIMIT_ALLOW_MEMORY=true` explicitly and accept the limitation.

---

## 3. Build pipeline on Vercel

```json
{
  "framework": null,
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist"
}
```

- `postinstall` → `server/scripts/prisma-generate.js` → selects
  `schema.postgres.prisma` when `DATABASE_URL` is a `postgres://` URL and runs
  `prisma generate` with the correct `binaryTargets`
  (`native` + `rhel-openssl-3.0.x`).
- `build` → `tsc && node scripts/copy-assets.js` for the server, then
  `tsc && vite build` for the client.
- `copy-assets.js` is required: `tsc` emits only JavaScript, so without it the
  compiled server has no `fixtures/` and every GeoJSON/download request 404s.

---

## 4. Storage

`server/src/services/storage/` exposes a single `StorageDriver` interface with
two implementations:

| Driver | Scope | Behaviour |
| --- | --- | --- |
| `LocalStorageDriver` | dev/test | reads `server/src/fixtures` (or `server/dist/fixtures`) |
| `VercelBlobStorageDriver` | production | `@vercel/blob`; **all objects are private**, bytes are streamed by the API |

Key properties:

- `sanitizeStorageKey()` strips traversal and unsafe characters on every call.
- Every blob object is written with `access: 'private'`; no blob URL is ever
  returned to a client (`getPublicUrl()` → `null`).
- The `public` **scope** is a key namespace (`public/…` vs `private/…`), not an
  access level. Display-only map layers are published through the public
  `/api/v1/datasets/:id/geojson` route, which reads storage server-side and
  returns JSON. Leaflet never contacts blob storage directly, so a private
  download object can never become publicly readable just to render a map.
- Download authorization is unchanged: JWT required, 401 for anonymous,
  404 `FILE_NOT_FOUND` when the object genuinely does not exist.

### Uploading existing fixtures

```bash
# dry run — lists exactly what would be uploaded, uploads nothing
npm run storage:upload --workspace=server

# real upload
npm run storage:upload --workspace=server -- --apply
```

GeoJSON fixtures are uploaded to both namespaces — `public/` for display
layers served by the API and `private/` for authenticated downloads. All
objects remain private; the namespace only separates the two purposes.
`server/src/fixtures/documents/` is empty, so no document is uploaded — the
eight SDG PDFs are genuinely unavailable and no placeholder files are created.

---

## 5. Local verification (before deploying)

```bash
# 1. type-check + build both workspaces
npm run build

# 2. all tests
npm test

# 3. simulate a Vercel cold start against api/index.ts
npx tsx scripts/verify-serverless-entry.ts
```

Expected output of step 3:

```
No port bound on import (serverless-safe).
Default export is callable.
GET /health → 200 (OK)
GET /api/v1/datasets → 200 (datasets=2)
GET /api/v1/__unknown__ → 404 (unmatched route, no crash)
RESULT: PASS
```

Compiled runtime check (runs against `server/dist`, not `tsx` source):

```bash
node scripts/verify-dist-runtime.cjs
```

This additionally verifies the 541-feature real GeoJSON fixture, demo login,
authenticated dataset stream (200), anonymous denial (401), and all eight
unavailable SDG documents (404 behavior).

```bash
npm i -g vercel
vercel link
vercel dev
```

> `npm run build` passing does **not** prove the deployment works. The CLI/dev
> run is the authoritative local check.

---

## 6. Deployment order

1. Create the Neon database and run `docs/POSTGRES_MIGRATION.md` (steps 3–8).
2. Create the Upstash Redis database; copy REST URL + token.
3. Create the Vercel Blob stores; copy the tokens.
4. Generate a fresh production `JWT_SECRET`.
5. Add every environment variable to the Vercel project.
6. Connect the GitHub repository (or run `vercel --prod`).
7. Run `npm run storage:upload --workspace=server -- --apply` **once** against
   the production tokens.
8. Smoke-test: `/health`, `/api/v1/datasets`, login with the demo account,
   one authenticated download, one anonymous download (expect 401).

---

## 7. Rollback

- Vercel → Deployments → *Instant Rollback* to the previous deployment.
- Database: Neon branching — restore a branch created before the migration.
- Storage: uploads are additive; removing a deployment does not delete blobs.
