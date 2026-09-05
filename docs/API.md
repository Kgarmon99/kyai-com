# KYAI API Reference

The KYAI intelligence platform exposes a small REST API under `/api/v1/`. Public endpoints require no authentication. Write endpoints require an `X-KYAI-API-Key` header.

## Public endpoints

### List resources

- `GET /api/v1/signals`
- `GET /api/v1/events`
- `GET /api/v1/profiles`
- `GET /api/v1/toolkits`
- `GET /api/v1/regions`

Query parameters:

- `region` — filter by region name/key
- `category` / `type` / `status` / `claim_status` / `audience` / `review_status` — type-specific filters
- `limit` — max items (default 50, max 100)
- `offset` — pagination offset

Response shape:

```json
{
  "ok": true,
  "type": "signals",
  "total": 120,
  "limit": 50,
  "offset": 0,
  "items": [ ... ]
}
```

### Single resource

- `GET /api/v1/signals/:id`
- `GET /api/v1/events/:id`
- `GET /api/v1/profiles/:id`
- `GET /api/v1/toolkits/:id`
- `GET /api/v1/regions/:id`

Response shape:

```json
{
  "ok": true,
  "signal": { ... }
}
```

### Public feeds

- `GET /api/v1/feed/signals.json`
- `GET /api/v1/feed/events.json`
- `GET /api/v1/feed/profiles.json`
- `GET /api/v1/feed/toolkits.json`

Returns the latest 200 items in a stable JSON format.

### Personalized brief

`GET /api/v1/personalized?role=founder&region=louisville`

Supported roles: `business`, `teacher`, `student`, `founder`, `civic`, `journalist`.

Returns signals, events, profiles, toolkits, and a recommended action tailored to the role and region.

## Submission and review

### Submit a public lead

`POST /api/v1/submit`

Body:

```json
{
  "type": "signal",
  "payload": {
    "title": "Example",
    "body": "A short description",
    "category": "education",
    "region": "Lexington / Bluegrass",
    "sourceName": "Source name",
    "sourceUrl": "https://example.com"
  }
}
```

Supported types: `signal`, `event`, `profile`, `toolkit`.

The submission lands in a `pending` review queue and returns an ID.

### Review a submission

`POST /api/v1/review/:type/:id/:action`

- `:type` — `signal`, `event`, `profile`, `toolkit`
- `:id` — submission ID returned by `/api/v1/submit`
- `:action` — `approve`, `reject`, or `request_changes`

Requires `X-KYAI-API-Key` header with an admin or editor key.

Optional body:

```json
{
  "reviewerNotes": "Looks good but needs a source link."
}
```

On `approve`, the payload is published to its public table.

## Admin endpoints

### Ingest a URL

`POST /api/v1/ingest`

Requires `X-KYAI-API-Key` header with an admin or editor key.

Body:

```json
{
  "url": "https://example.com/kentucky-ai-news",
  "kind": "signal",
  "category": "education",
  "region": "Louisville"
}
```

If `OPENAI_API_KEY` is configured, the page is fetched and parsed by an LLM. Otherwise a basic heuristic extractor runs. The extracted item is stored as a pending submission for editor review.

## Authentication

Create an admin user and API key locally:

```bash
npm run admin:create test@kyai.com admin --region="Statewide"
```

Use the printed key in requests:

```bash
curl -H "X-KYAI-API-Key: kyai_..." \
  -X POST \
  -d '{"url":"https://example.com"}' \
  /api/v1/ingest
```

## Local development

```bash
cp .env.example .env
npm install
npm run db:seed
npm run admin:create you@example.com admin
npm test
npm run build
```
