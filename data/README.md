# KYAI data

These files are the published record set behind the site. Most KYAI
contributions are changes here rather than changes to code.

**License:** CC BY 4.0 — see [LICENSE](LICENSE) in this directory. The code in
the rest of the repository is MIT.

## The datasets

| File | Powers |
|------|--------|
| `intelligence-feed.json` | The live pulse, standalone signal pages, trust desk, regional feeds |
| `intelligence-sources.json` | Source registry and trust metadata for the desk |
| `regions.json` | Regional intelligence pages and regional brief cards |
| `events.json` | The public Kentucky AI calendar |
| `profiles.json` | People, organization, event, and infrastructure profile cards |
| `toolkits.json` | Toolkit cards and generated `/toolkits/<toolkit>/` pages |
| `contributor-os.json` | Contributor roles, missions, pipeline, maintainer cards, badges |
| `editorial-items.json` | Editorial queue state |

Field-by-field requirements are in [../docs/DATA_CONTRACTS.md](../docs/DATA_CONTRACTS.md).
What is publishable at all is in [../EDITORIAL_POLICY.md](../EDITORIAL_POLICY.md).

## How to contribute a record

Preferred: open the matching
[issue form](../../../issues/new/choose) — signal, event, profile, toolkit, or
mission. An editor reviews the source and publishes it.

Direct pull requests to these files are welcome too. Before opening one:

```bash
npm run validate:collab
npm test
```

Every public signal needs a `title`, `sourceUrl`, `sourceName`, `region`,
`category`, `date`, `whyItMatters`, and `status`. A record without a working
source link will not be published.

## Rules for this directory

**No personal data.** `data/subscribers.json` is gitignored and must stay that
way. Subscriber records live in the database, with an optional gitignored local
mirror at `.local/subscribers.json`. See `subscribers.example.json` for the
shape, and [../SECURITY.md](../SECURITY.md) for why this matters.

**Publication is by allowlist.** `scripts/build.mjs` copies only the files named
in its `PUBLIC_DATA_FILES` list into the built site. A new dataset added here is
*not* published until it is added to that list — which is deliberate, so a
private or working file cannot reach the web by accident. `scripts/smoke-test.mjs`
fails the build if an email field appears in published output.

**Some files are machine-written.** `intelligence-feed.json` is rewritten daily
by `npm run refresh:intel` using `JSON.stringify(value, null, 2)`. This whole
directory is excluded from Prettier so formatting does not fight the
automation — keep two-space indentation and let the scripts handle their own
files.
