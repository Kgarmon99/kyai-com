# KYAI Intelligence Platform v1 — Build Report

Date: 2026-09-04
Status: Backend scaffold complete, all tests passing.

## What changed

KYAI.com upgraded from a purely static site to a civic-intelligence backend with serverless API routes while keeping the existing static site generation intact.

### New backend modules

- `lib/schema.sql` — SQLite/Postgres schema for signals, events, profiles, toolkits, regions, submissions, and users.
- `lib/db.mjs` — database layer supporting Vercel Postgres in production and better-sqlite3 locally. Includes schema init, migrations, and seeding from existing static JSON.
- `lib/api-utils.mjs` — CORS helpers, request parsing, API-key auth, role checks, row mappers, submission creation.
- `lib/handlers.mjs` — reusable list/detail/submission handlers.

### New API routes (`api/v1/`)

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /signals`, `/events`, `/profiles`, `/toolkits`, `/regions` | Public | List resources with filters |
| `GET /signals/:id`, etc. | Public | Single resource |
| `POST /submit` | Public | Submit a signal/event/profile/toolkit to review queue |
| `POST /review/:type/:id/:action` | Admin/Editor | Approve, reject, or request changes |
| `GET /personalized` | Public | Role + region tailored brief |
| `POST /ingest` | Admin/Editor | URL → LLM extraction → pending submission |
| `GET /feed/:type.json` | Public | Latest 200 items as stable JSON feeds |

### New scripts

- `scripts/db-init.mjs` — initialize schema
- `scripts/db-seed.mjs` — seed DB from existing static JSON data
- `scripts/create-admin.mjs` — create admin/editor users and API keys
- `scripts/test-api.mjs` — API test suite (12 tests)

### Updated

- `package.json` — added dependencies, scripts, bumped version to 0.2.0
- `scripts/build.mjs` — generates public JSON feeds from DB when available, falls back to static JSON
- `README.md` — added API, env vars, admin setup, deployment notes
- `.gitignore` — ignores local DB files and env files
- `index.html`, `api-client.js` — frontend hooks for the new API

## Test results

```bash
npm test
```

- `validate-collaboration.mjs` — passed
- `smoke-test.mjs` — passed
- `test-newsletter-api.mjs` — passed
- `test-api.mjs` — 12/12 passed

```bash
npm run build
```

- Static client files built successfully into `dist/client`
- Feed JSON generated

## How to run locally

```bash
cp .env.example .env.local
npm install
npm run db:seed
npm run admin:create you@example.com admin --region=Statewide
npm test
npm run build
```

Use the printed API key for admin endpoints:

```bash
curl -H "X-KYAI-API-Key: kyai_..." \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/kentucky-ai-news"}' \
  http://localhost:3000/api/v1/ingest
```

## Deployment

Deploys on Vercel as before. For production:

1. Create a Vercel Postgres database.
2. Set `DATABASE_URL` to the Postgres connection string.
3. Optionally set `OPENAI_API_KEY` for the ingest endpoint.
4. Run `npm run admin:create` locally (or insert an admin user into production DB) to get an API key.

The static site continues to build into `dist/client` and API routes run as Vercel serverless functions.

## Known issues / next steps

- The `/api/v1/ingest` endpoint fetches external URLs; some sites may block the fetch or return paywalls. A future improvement is to add a per-domain fetch strategy.
- The review queue has no email/notification hook yet. GitHub issue integration for public submissions remains the preferred durable intake path.
- No web UI for the review queue yet; it is API-only in this v1.
- Region matching in `/api/v1/personalized` is heuristic string matching; a normalized region taxonomy would improve accuracy.
