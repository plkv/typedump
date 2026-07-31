# Font discovery crawler

Sweeps a few free-font sources over plain HTTP (no LLM, no paid API), drops
anything already in our catalog, keeps the last N months, and writes
`public/discovered-fonts.json`. The password-gated page at **`/new`** (password
`showme`) reads that file so you can eyeball new releases and pick what to add.

## Run

```bash
node scripts/discover/index.mjs            # 3-month window, writes JSON only
node scripts/discover/index.mjs --months=6 # wider rolling window
node scripts/discover/index.mjs --ytd      # since Jan 1 this year
node scripts/discover/index.mjs --since=2026-01-01
node scripts/discover/index.mjs --push     # also git commit + push the JSON
```

## Daily automation (launchd)

```bash
cp scripts/discover/com.typedump.discover.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.typedump.discover.plist
launchctl start com.typedump.discover   # run once now to test
```

Edit the node path / repo path inside the plist if they differ. It runs daily at
08:00 with `--push`, so the live site's `/new` updates on its own. Logs:
`/tmp/typedump-discover.log`.

## Sources

Each source is one file in `sources/`, exporting `{ id, label, priority, run() }`
that returns raw items `{ name, author, source, url, date, image, googleFamily? }`.
Add or remove a source by editing the `SOURCES` array in `index.mjs`.

| Source | Method | Dated? | Notes |
|---|---|---|---|
| Google Fonts | `metadata/fonts` JSON, `dateAdded` | ✅ real | catch-all; renders live preview on the page |
| Fontesk | highest-numbered `post-sitemap*.xml` | ⚠️ regen date | commercial-only: each candidate page is checked, `free-for-personal-use` dropped, `free-for-commercial-use`/`ofl-gpl` kept; capped at 40/source |
| GitHub | search API, two passes | ✅ real | Pass A: repos **created** in window (new projects). Pass B: established repos (stars ≥ 40) whose **latest release** landed in window — date = `published_at`. Denylist strips tools/collections/forks; optional `GITHUB_TOKEN` lifts rate limits |
| Collletttivo | `sitemap.xml` `<lastmod>` | ✅ real | small, pristine OFL; quiet since early 2026 |
| Fontshare | v2 API, `is_new` flag | ❌ none | no reliable date; contributes only when the foundry flags "new" |
| Uncut.wtf | `fonts.json`, `date` YYMMDD | ⚠️ frozen | dormant since Aug 2024 + intermittent JS firewall; best-effort |

### Reality notes (July 2026)

- **Fontesk** dominates by volume but its sitemap `<lastmod>` is the regeneration
  date, not the true post date — treat its dates as approximate. Per-source cap
  keeps it from burying the curated foundries; the `/new` page can filter it out.
- **Uncut, Collletttivo, Fontshare** currently yield little (dormant / dateless).
  The adapters stay in place so they light up when those sites publish again.
- Sources that were evaluated and rejected as not cheaply scannable: Freefaces
  (client-rendered, no dates), Atipo (stale sitemap), Indestructible Type (tiny,
  undated), Velvetyne (429 rate-limit, no feed), Font Squirrel.

## Tuning

`index.mjs` top: `MAX_FONTS` (page ceiling), `MAX_PER_SOURCE` (anti-firehose cap).
Recency window is `--months` (default 3).
