# KYAI.com

Open-source website for KYAI, a Kentucky nonprofit initiative for free AI workshops, local AI news tracking, research updates, events, and public discussion.

KYAI is also a contributor-driven civic intelligence project. Start with [CONTRIBUTING.md](CONTRIBUTING.md), the GitHub issue forms, and the public `Build with KYAI` section on the site.

## Local Development

```bash
npm install
npm run build
npm run validate:collab
npm test
```

The deployable static site is generated into `dist/client`.

## Deployment

KYAI deploys on Vercel.

- GitHub: `https://github.com/Kgarmon99/kyai-com`
- Project: `kyai`
- Production alias: `https://kyai-flax.vercel.app`
- Custom domains: `kyai.com`, `www.kyai.com`

### Newsletter Signup

The public newsletter form posts to `/api/newsletter-signup`.

- Preferred durable backend: set `KYAI_NEWSLETTER_WEBHOOK_URL` to a private intake webhook.
- Private GitHub intake: set `KYAI_NEWSLETTER_GITHUB_TOKEN` and optional `KYAI_NEWSLETTER_GITHUB_REPO`.
- Email backend: set `RESEND_API_KEY`, plus optional `KYAI_NEWSLETTER_NOTIFY_TO` and `KYAI_NEWSLETTER_FROM`.

## Current Surface

- Kentucky-branded homepage
- Workshop tracks
- Local AI tracker with filters for education, workforce, research, events, and policy
- Community board starter
- Join-interest form
- Build with KYAI contributor operating system
- Claimable missions, regional maintainer cards, contributor roles, badges, and editorial pipeline
- GitHub issue forms for signals, events, profiles, missions, toolkits, and bugs

## Contributor Rails

- `data/contributor-os.json` powers the public contributor roles, missions, pipeline, regional ownership cards, and badges.
- `.github/ISSUE_TEMPLATE/` contains structured intake forms.
- `EDITORIAL_POLICY.md` defines what can be published.
- `docs/DATA_CONTRACTS.md` defines the fields contributors should provide.
