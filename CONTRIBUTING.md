# Contributing to KYAI

KYAI is an open Kentucky AI intelligence project. The simplest rule is: community can submit, editors publish.

## Start in 10 minutes

1. Pick one lane: signal scout, source reviewer, toolkit builder, workshop host, profile maintainer, developer, designer, or editor.
2. Open the matching GitHub issue form from the site or from the Issues tab.
3. Add source links, Kentucky region, date, category, and why the contribution matters.
4. Wait for review, answer questions, or claim a scoped mission.

Good first contributions:

- Submit one Kentucky AI news lead, public meeting, event, grant, research item, or school update.
- Verify five existing signals for source URL, date, region, people, institution, and status.
- Add one person, organization, program, library, chamber, meetup, or workshop host.
- Improve one toolkit checklist for schools, libraries, small businesses, or civic groups.
- Fix one small site issue with a focused pull request.

## Local Setup

Node.js 24 is the pinned version (see `.nvmrc`); 20 or newer works.

```bash
npm install
npm run build
npm test
```

This is a static Vercel site. The build output lives in `dist/client`.

`npm install` may warn that the optional `better-sqlite3` dependency failed to
build. That is expected without a C++ toolchain and does not block you: the
build, data validation, and smoke tests all run, and the API suite reports that
it is skipping rather than failing. To run the API tests locally, add the driver
with `npm install --no-save better-sqlite3`. CI installs it explicitly, so that
coverage always runs there.

## Licensing your contribution

Code contributions are published under the [MIT License](LICENSE). Data
contributions — anything in `data/`, including records submitted through the
issue forms — are published under [CC BY 4.0](data/LICENSE). Opening a pull
request or submitting a record means you agree to those terms and confirm you
have the right to contribute the material.

Do not paste source article text into a record. KYAI stores a title, a link, and
your own short summary.

## Data Standards

Every public signal should include:

- `title`
- `sourceUrl`
- `sourceName`
- `region`
- `category`
- `date`
- `whyItMatters`
- `status`

Profiles should include a public source, region, type, and reason the listing belongs on KYAI. Toolkits should name the audience, use case, and reviewer needed.

## Review Workflow

1. `Submitted`: issue form or pull request arrives.
2. `Needs review`: editor checks source quality, local relevance, date, and category.
3. `Verified`: contribution has enough source backing to publish.
4. `Published`: update appears on KYAI, a signal page, a toolkit, or the directory.

Corrections are welcome. Add a source and be specific about what should change.

## Pull Requests

Keep pull requests small and reviewable. Include screenshots for UI changes and explain data changes.

Before opening a pull request:

```bash
npm run format
npm test
```

CI runs `npm ci`, `npm run format:check`, `npm run build`, and `npm test`. The
formatter is Prettier, configured in `.prettierrc.json`. The `data/` directory
is excluded from it because scripts write those files.

Security issues go through the private channel in [SECURITY.md](SECURITY.md),
never a public issue or pull request.
