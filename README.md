# KYAI.com

Open-source website for KYAI, a Kentucky nonprofit initiative for free AI workshops, local AI news tracking, research updates, events, and public discussion.

KYAI is also a contributor-driven civic intelligence project. Start with [CONTRIBUTING.md](CONTRIBUTING.md), the GitHub issue forms, and the public `Build with KYAI` section on the site.

## License

This project is deliberately split into two licenses:

| What | License | Notes |
|------|---------|-------|
| Code — `app.js`, `scripts/`, `lib/`, `api/`, styles, templates | [MIT](LICENSE) | Reuse freely, including commercially. |
| Data — everything in [`data/`](data/LICENSE) and the public JSON feeds | [CC BY 4.0](data/LICENSE) | Reuse with attribution to KYAI. |

The KYAI name, wordmark, and logo files in `assets/` are not covered by either
license. Third-party sources that records link to remain the property of their
publishers — KYAI stores a title, a link, and its own summary, never the source
work itself.

By contributing, you agree to publish your contribution under these terms.

## Subscriber data

Subscriber records are personal data. They are stored in the database and in
the Resend audience, and never committed to this repository:
`data/subscribers.json` is gitignored for that reason. `scripts/build.mjs`
copies only an explicit allowlist of public datasets into the built site, and
`scripts/smoke-test.mjs` fails the build if any email field reaches the
published output. See [SECURITY.md](SECURITY.md).

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
- Production alias: `https://ky-ai.vercel.app`
- Custom domain: none yet. `kyai.com` is held by a third-party seller and is
  not KYAI's.

### Vercel Postgres

For production, create a Vercel Postgres (Neon) database and set `DATABASE_URL` in your project environment variables. The API routes use `@vercel/postgres` when `DATABASE_URL` starts with `postgres://`.

### Local SQLite

For local development, set `DATABASE_URL=kyai.db` (or leave it unset to default to `kyai.db` in the repo root). The build and API routes will use `better-sqlite3`.

### Review UI

A lightweight review dashboard is available at `/review.html`. Editors and admins can:

- Enter an API key (stored only in session memory) to authenticate.
- View pending submissions filtered by type and status.
- Approve, reject, or request changes with reviewer notes.
- Browse approved public items across signals, events, profiles, and toolkits.

The dashboard is static HTML/JS and calls the same `/api/v1/` endpoints used by the rest of the site.

### API routes

The following serverless API routes are available under `/api/v1/`:

- `GET /api/v1/signals`, `/api/v1/events`, `/api/v1/profiles`, `/api/v1/toolkits`, `/api/v1/regions`
- `GET /api/v1/signals/:id`, etc.
- `POST /api/v1/submit`
- `GET /api/v1/submissions` (requires `X-KYAI-API-Key`)
- `POST /api/v1/review/:type/:id/:action`
- `GET /api/v1/personalized`
- `POST /api/v1/ingest`
- `GET /api/v1/feed/:type.json`

Public read and submit endpoints require no authentication. Review and ingest endpoints require an `X-KYAI-API-Key` header.

### Newsletter Signup

The public newsletter form posts to `/api/newsletter-signup`. Each signup is
stored durably as a contact in a Resend audience and gets a welcome email. A
weekly digest goes out every Monday at 8:00 AM CT through a Vercel Cron job
that calls `/api/send-weekly-newsletter`, which broadcasts to the same audience.

Setup (all required before subscribers receive email):

1. Create a free account at [resend.com](https://resend.com) and create an
   audience (Audiences, Add audience). Copy the audience ID.
2. Verify a sending domain in Resend (Domains, Add domain). This is required:
   the default `onboarding@resend.dev` sender only delivers to the Resend
   account owner's own address, so subscribers would never get email without it.
3. In Vercel (Project Settings, Environment Variables), set:
   - `RESEND_API_KEY` (starts with `re_`)
   - `KYAI_RESEND_AUDIENCE_ID` (the audience ID from step 1)
   - `KYAI_NEWSLETTER_FROM` (for example `KYAI <updates@kyai.com>`, using the verified domain)
   - `CRON_SECRET` (a random string of at least 16 characters, letters and
     numbers only). Vercel sends this value automatically as a Bearer token
     when the cron job runs; the route rejects every request without it.
     Redeploy after adding or changing it.
   - Optional: `KYAI_NEWSLETTER_NOTIFY_TO` (defaults to kahlil@getmoneybot.com)

To test the weekly send without emailing the audience, run
`KYAI_NEWSLETTER_TEST_TO=you@example.com npm run newsletter:send` locally.

To trigger a manual send in production, call the route with the secret (this
broadcasts to the audience):
`curl -H "Authorization: Bearer $CRON_SECRET" https://ky-ai.vercel.app/api/send-weekly-newsletter`

Optional intake paths (unchanged): set `KYAI_NEWSLETTER_WEBHOOK_URL` for a
private intake webhook, or `KYAI_NEWSLETTER_GITHUB_TOKEN` and optional
`KYAI_NEWSLETTER_GITHUB_REPO` for a private GitHub issue per signup.

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
