# PostgreSQL (Neon) Migration Procedure

Phase 14 / P0.4 — safe, reversible, non-destructive.

This document describes how to move the data currently living in
`server/prisma/dev.db` (SQLite) to a hosted PostgreSQL database (Neon) without
losing records or breaking existing references.

> **Status:** procedure prepared and rehearsed in dry-run only. No PostgreSQL
> database has been created or contacted yet. Nothing in the local SQLite
> database has been mutated.

---

## 1. Why the migration is safe

| Concern | Finding |
| --- | --- |
| Primary keys | `User.id`, `Dataset.id`, `Bookmark.id`, `DownloadHistory.id` etc. are **UUID strings** (`@default(uuid())`), not auto-increment integers. They can be inserted verbatim. |
| Password hashes | `bcryptjs` hashes (`$2a$` / `$2b$`) are plain strings — portable across databases. |
| Relations | `Bookmark.userId → User.id`, `Bookmark.datasetId → Dataset.id`, `DownloadHistory.userId/datasetId`, `Dataset.categoryId/nodeId` — all reference UUID strings, so no remapping is required. |
| Schema shape | `schema.postgres.prisma` is generated from `schema.prisma` and differs by exactly one line (`provider`). |
| Raw SQL | No raw SQL in controllers; Prisma handles dialect differences. The only raw SQL is a read-only `PRAGMA database_list` in a diagnostic script. |

---

## 2. Current local database facts (verified)

| Item | Value |
| --- | --- |
| Authoritative SQLite file | `server/prisma/dev.db` (110,592 bytes) |
| Records | 6 categories · 11 network nodes · 6 datasets · 4 users · 1 bookmark · 105 download history |
| Stray nested file | `server/prisma/server/prisma/dev.db` (73,728 bytes) — **0 rows in every table** |
| Cause of the stray file | the root `.env` previously contained a `DATABASE_URL` path that Prisma resolved relative to the schema directory, producing a second, empty database. Phase 14 corrected the root `.env` path so both entry points resolve to `server/prisma/dev.db`. |
| Backup artefact | `server/prisma/backups/backup-2026-11-17T04-16-44-071Z.json` + `.summary.json` |

The stray empty file is left in place (nothing is deleted during Phase 14) and
is excluded by `.gitignore` (`*.db`). It can be removed manually after you have
confirmed the authoritative file is the one in use.

---

## 3. Create the Neon database

1. Create a project at <https://console.neon.tech> (free tier: 0.5 GB storage).
2. Copy the **pooled** connection string. It looks like:

   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require
   ```

3. Append Prisma-friendly parameters for serverless:

   ```
   &pgbouncer=true&connection_limit=1
   ```

4. Store it **only** in the Vercel project settings (`DATABASE_URL`) and in your
   local `server/.env` when you are ready to migrate. Never commit it.

> Do not paste the connection string into a report, chat, terminal transcript,
> or source file.

---

## 4. Take a backup first (read-only)

```bash
npm run db:backup --workspace=server
```

Outputs to `server/prisma/backups/`:

- `backup-<timestamp>.json` — full data snapshot with original UUIDs
- `backup-<timestamp>.summary.json` — counts, referential-integrity checks,
  password-hash shape check (prefix + length only, never the hash)

The SQLite file is untouched; the script only reads.

**Keep this backup until the PostgreSQL database has been verified and the
application has been running against it successfully.**

---

## 5. Generate the PostgreSQL client

Prisma cannot read the datasource provider from an environment variable, so the
project keeps two schemas that differ by one line:

| File | Provider | Used for |
| --- | --- | --- |
| `server/prisma/schema.prisma` | `sqlite` | local development |
| `server/prisma/schema.postgres.prisma` | `postgresql` | Neon / production |

`npm run prisma:generate --workspace=server` runs
`server/scripts/prisma-generate.js`, which inspects `DATABASE_URL` and picks the
matching schema automatically. You can force it:

```bash
PRISMA_TARGET=postgres npm run prisma:generate --workspace=server
```

> Generating from the SQLite schema and then connecting to PostgreSQL fails at
> runtime. Always regenerate after switching `DATABASE_URL`.

---

## 6. Create the baseline migration

The repository has **no `prisma/migrations/` history** — development used
`prisma db push`. A reproducible deployment needs a baseline migration.

With `DATABASE_URL` pointing at the (empty) Neon database:

```bash
cd server
npx prisma migrate dev --schema=prisma/schema.postgres.prisma --name init
```

This creates `server/prisma/migrations/<timestamp>_init/migration.sql` and
applies it. **Commit the migrations folder** — `.gitignore` explicitly allows it.

For subsequent deployments use only:

```bash
npx prisma migrate deploy --schema=prisma/schema.postgres.prisma
```

---

## 7. Import the data

Dry run (no writes):

```bash
npm run db:restore --workspace=server
```

Apply (writes rows with their original UUIDs, parents before children):

```bash
npm run db:restore --workspace=server -- --apply
```

The script prints record counts **before** and **after**, plus the counts read
from the snapshot. They must match:

```
categories 6 · networkNodes 11 · datasets 6 · users 4 · bookmarks 1 · downloadHistory 105
```

---

## 8. Verify

1. Counts match the table above.
2. `GET /api/v1/datasets` returns 6 datasets.
3. `POST /api/v1/auth/login` with the demo account succeeds — this proves the
   bcrypt hashes survived the transfer.
4. `GET /api/v1/user/downloads` returns the seeded history for that account.
5. `GET /api/v1/stats/overview` reports non-zero counters.

---

## 9. Rollback

The SQLite database is never modified by any of the steps above.

- Before cut-over: simply point `DATABASE_URL` back at `file:./dev.db` and
  regenerate the client (`PRISMA_TARGET=sqlite`).
- After cut-over: re-import from the JSON backup into a fresh PostgreSQL branch
  (Neon supports branching) — no need to touch SQLite.

---

## 10. Data-integrity repair (provider column)

Historically `User.provider` defaulted to `"google"`, so email/password
registrations were stored with the wrong provider and rendered a "Google
Verified" badge.

- The schema default is now `"local"` and `register()` writes it explicitly.
- Existing rows can be reconciled with observable evidence:

```bash
npm run seed:fix-providers --workspace=server            # dry run
npm run seed:fix-providers --workspace=server -- --apply # write
```

Rule: `has bcrypt password && no googleId → local`, `has googleId → google`.
Nothing else is modified. In the current database this correctly reports
**0 records to fix** (the demo account is genuinely linked to Google).
