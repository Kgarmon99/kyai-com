# KYAI.com

Open-source website for KYAI, a Kentucky nonprofit initiative for free AI workshops, local AI news tracking, research updates, events, and public discussion.

KYAI is also a contributor-driven civic intelligence project. Start with [CONTRIBUTING.md](CONTRIBUTING.md), the GitHub issue forms, and the public `Build with KYAI` section on the site.

## Local Development

```bash
npm install
npm run db:init
npm run db:seed
npm run build
npm run validate:collab
npm test
```

The deployable static site is generated into `dist/client`.

### Admin user setup

Create an admin user and API key for review/ingest endpoints:

```bash
npm run admin:create test@example.com "Test Admin" admin --region=Statewide
```

Copy the printed API key and use it as the `X-KYAI-API-Key` header.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Vercel/Neon Postgres string in production; SQLite path locally. |
| `OPENAI_API_KEY` | Optional. Powers the `/api/v1/ingest` URL extraction endpoint. |
| `OPENAI_MODEL` | Optional. Defaults to `gpt-4o-mini`. |
| `KYAI_ALLOWED_ORIGINS` | Optional. Comma-separated CORS origins. Defaults to `*`. |
| `KYAI_NEWSLETTER_*` | Newsletter signup backends (see below). |

See [docs/API.md](docs/API.md) for the full API reference.

## Deployment

KYAI deploys on Vercel.

- GitHub: `https://github.com/Kgarmon99/kyai-com`
- Project: `kyai`
- Production alias: `https://kyai-flax.vercel.app`
- Custom domains: `kyai.com`, `www.kyai.com`

### Vercel Postgres

For production, create a Vercel Postgres (Neon) database and set `DATABASE_URL` in your project environment variables. The API routes use `@vercel/postgres` when `DATABASE_URL` starts with `postgres://`.

### Local SQLite

For local development, set `DATABASE_URL=kyai.db` (or leave it unset to default to `kyai.db` in the repo root). The build and API routes will use `better-sqlite3`.

### API routes

The following serverless API routes are available under `/api/v1/`:

- `GET /api/v1/signals`, `/api/v1/events`, `/api/v1/profiles`, `/api/v1/toolkits`, `/api/v1/regions`
- `GET /api/v1/signals/:id`, etc.
- `POST /api/v1/submit`
- `POST /api/v1/review/:type/:id/:action`
- `GET /api/v1/personalized`
- `POST /api/v1/ingest`
- `GET /api/v1/feed/:type.json`

Public read and submit endpoints require no authentication. Review and ingest endpoints require an `X-KYAI-API-Key` header.

### Newsletter Signup

The public newsletter form posts to `/api/newsletter-signup`.

- Preferred durable backend: set `KYAI_NEWSLETTER_WEBHOOK_URL` to a private intake webhook.
- Private GitHub intake: set `KYAI_NEWSLETTER_GITHUB_TOKEN` and optional `KYAI_NEWSLETTER_GITHUB_REPO`.
- Email backend: set `RESEND_API_KEY`, plus optional `KYAI_NEWSLETTER_NOTIFY_TO` and `KYAI_NEWSLETTER_FROM`.

## Current Surface

- Kentucky-branded homepage
- Workshop tracks
- Local AI tracker with filters for education, workforce, research, events, and policy
- AI Near Me personalization by role, region, local signals, events, profiles, and toolkits
- Shareable regional intelligence pages generated at `/regions/<region>/`
- Source trust desk with review status, confidence, source links, and correction path
- Kentucky AI event calendar for conferences, workshops, public meetings, and open host slots
- Community board starter
- Join-interest form
- Build with KYAI contributor operating system
- Claimable missions, regional maintainer cards, contributor roles, badges, and editorial pipeline
- People/org profile directory with claim/correction links
- Practical toolkit catalog with generated `/toolkits/<toolkit>/` pages
- GitHub issue forms for signals, events, profiles, missions, toolkits, and bugs
- Public JSON feeds at `/feed/signals.json`, `/feed/events.json`, `/feed/profiles.json`, `/feed/toolkits.json`, `/feed/regions.json`

## Contributor Rails

- `data/contributor-os.json` powers the public contributor roles, missions, pipeline, regional ownership cards, and badges.
- `data/regions.json` powers regional intelligence pages and the regional brief cards.
- `data/events.json` powers the public Kentucky AI calendar.
- `data/profiles.json` powers people, organization, event, and infrastructure profile cards.
- `data/toolkits.json` powers the public toolkit cards and generated toolkit pages.
- `data/intelligence-feed.json` powers the live pulse, signal pages, trust desk, and regional feeds.
- `.github/ISSUE_TEMPLATE/` contains structured intake forms.
- `EDITORIAL_POLICY.md` defines what can be published.
- `docs/DATA_CONTRACTS.md` defines the fields contributors should provide.
- `docs/API.md` documents the REST API.
