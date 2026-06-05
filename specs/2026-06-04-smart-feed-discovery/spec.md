# Spec: Smart feed discovery + source type

**Date:** 2026-06-04
**Status markers:** ✅ implemented · ❌ not yet · 🟠 open decision · ⏸ deferred

---

## Problem

The current Add Source form requires a working RSS/Atom feed URL to be known up front. Users paste arbitrary URLs — profile pages, blog homepages, Substack profile URLs, iOS share links — which silently create broken sources or sources with garbage feed URLs. The system has no way to recover; Discover then fails quietly.

---

## What this spec covers

1. A server-side **feed resolver** that accepts any URL and returns the best feedable form of it
2. An updated **Add Source form** that resolves on URL entry before saving
3. A `feed_type` column on sources (`rss | scrape`) so the gather step knows how to process the source
4. **Phase 2 (deferred):** scrape-mode discover — HTML page crawl for article candidates

---

## Feed resolution algorithm

`POST /api/sources/resolve-feed` accepts `{ url: string }` and attempts discovery in priority order:

### Step 1 — Direct feed check
Fetch the URL. If the response `Content-Type` contains `xml`, `rss`, or `atom`, or the body starts with `<?xml` or `<rss` or `<feed`, accept it directly.
→ `{ feedUrl: url, feedType: 'rss', method: 'direct' }`

### Step 2 — HTML link autodiscovery
Fetch the URL as HTML. Search for:
```html
<link rel="alternate" type="application/rss+xml" href="...">
<link rel="alternate" type="application/atom+xml" href="...">
```
Resolve relative hrefs against the base URL.
→ `{ feedUrl: discovered, feedType: 'rss', method: 'html-autodiscovery' }`

### Step 3 — Platform-specific patterns

| Platform | Detection | Feed URL pattern |
|---|---|---|
| Substack | hostname ends `.substack.com` OR path contains `/@username` | `https://{subdomain}.substack.com/feed` or `https://substack.com/@{username}/feed` |
| WordPress | homepage HTML contains `/wp-content/` or `wp-json` | `{origin}/?feed=rss2` |
| Ghost | homepage HTML contains `ghost` meta generator | `{origin}/rss/` |
| Beehiiv | hostname ends `.beehiiv.com` | `{origin}/feed` |
| Medium | path matches `/@username` on medium.com | `https://medium.com/feed/@{username}` |

### Step 4 — Generic suffix probe
Try in order, stop at first 200 + valid XML:
`/feed` · `/rss` · `/rss.xml` · `/atom.xml` · `/feed.xml` · `/index.xml` · `/feed/` · `/rss/`

### Step 5 — Fallback
No feed found. Return `{ feedUrl: url, feedType: 'scrape', method: 'fallback' }`.
The source is saved with `feedType = 'scrape'` and the original URL as `feedUrl`.

---

## API

### `POST /api/sources/resolve-feed`
**Request:** `{ url: string }`
**Response:**
```json
{
  "feedUrl": "https://ankitaviator.substack.com/feed",
  "feedType": "rss",
  "method": "html-autodiscovery",
  "originalUrl": "https://substack.com/@ankitaviator/notes"
}
```
**Errors:** `{ error: string }` if the URL is unreachable or unparseable.

Timeout: 8s total across all probing steps.

---

## Schema change

Add `feed_type` text column to `sources` table, default `'rss'`.

```sql
ALTER TABLE sources ADD COLUMN feed_type text NOT NULL DEFAULT 'rss';
```

`feedType` type: `'rss' | 'scrape'`

---

## Add Source form UX

```
[ Source URL ]  ← user pastes any URL here
                  → on blur: calls resolve-feed
                  → shows spinner, then result:

  ✓ RSS feed found: https://ankitaviator.substack.com/feed  [change]
  or
  ⚠ No feed found — will scrape page for article links  [change]

[ Name ]  ← auto-populated from page <title> if blank
[ Slug ]  ← auto-derived from name if blank  
[ Feed URL ]  ← editable, pre-filled from resolver
[ Perspective / Tier ]
```

- "Change" on the resolved feed URL opens it for manual editing
- If resolver returns `scrape`, show a brief note: "Scrape sources check the page for article links on each Discover run. Less reliable than a feed."
- The existing "Feed URL" label changes to "Source URL" to remove the assumption that it's always a feed

---

## Gather route changes — rss type

The existing `fetchRssFeed` in `src/app/api/topics/[id]/gather/route.ts` only parses `<item>` (RSS 2.0). It needs to also handle `<entry>` (Atom 1.0) — currently Martin Fowler's feed (`martinfowler.com/feed.atom`) returns 0 candidates as a result.

Add Atom parsing alongside the existing RSS parser:
- RSS: `<item>` blocks with `<title>`, `<link>`, `<pubDate>`, `<content:encoded>`
- Atom: `<entry>` blocks with `<title>`, `<link href="...">`, `<published>` or `<updated>`, `<content>`

---

## Gather route changes — scrape type ⏸ Phase 2

When `source.feedType === 'scrape'`, the discover step should:

1. Fetch `source.feedUrl` as HTML
2. Extract all `<a href>` links that are on the same domain and look like article paths (not nav/footer/category pages):
   - Depth ≥ 2 path segments
   - Not a query-string-only URL
   - Not matching known non-article patterns (`/tag/`, `/category/`, `/author/`, `/page/`, `#`)
3. For each candidate link, create a `discovered` article with:
   - `url` = the link
   - `title` = anchor text (provisional — replaced on gather step)
   - `publishedDate` = today's date (provisional — replaced on gather step if URL contains date)
   - `status = 'discovered'`
4. Skip URLs already in the articles table (existing dedup logic handles this)

**Known limitations for scrape mode:**
- No reliable publish date until the article is individually fetched
- Anchor text is often truncated/misleading — title updates on fetch
- Some pages load links via JavaScript — a static HTML fetch will miss them
- robots.txt compliance is not yet enforced (Phase 3)

---

## Python pipeline — what needs to change

The Python `rss-sweep.py` already has a `type` field in `config.md` (`rss` | `scrape`) and skips scrape sources (comment: "Claude handles those via WebFetch"). The Next.js app and the Python pipeline are now parallel systems for this topic; no Python changes are required while both run independently.

**If the Python pipeline is retired for ai-adoption:** no further changes needed.

**If the Python pipeline continues alongside the Next.js app:**
- The `config.md` sources table would need to stay in sync with the DB sources table manually
- The `feed_type` value from the DB (`rss` | `scrape`) maps directly to the `Type` column in `config.md`
- Recommend: retire the Python pipeline for this topic once the Next.js gather is validated

---

## Additional considerations

### 1. Substack notes vs posts
`/@username/notes` is Substack's short-form feed — it has no RSS. The resolution algorithm should detect this and redirect to the post feed (`/@username/feed`) rather than fall through to scrape mode. The post feed contains long-form articles; notes are out of scope for this pipeline.

### 2. Atom feeds broken today
`martinfowler.com/feed.atom` is an Atom feed. The current `fetchRssFeed` function only parses `<item>` and will silently return 0 items. This is a **current bug** — the Atom fix should land as part of this spec (gather route changes, rss type section above).

### 3. Feed URL vs source ID
The Ankit incident (2026-06-04) showed that the source `id` column was being populated with the raw URL pasted by the user, and the `slug` field was likewise wrong. The Add Source form must:
- Auto-derive `slug` from `name` (lowercase, hyphenated), not from the URL
- Set `id` = `slug` (the existing convention)

### 4. Feed validation before save
After resolution, the form should do a shallow validation: fetch the resolved feedUrl and confirm it returns parseable XML. This catches cases where a feed URL was guessed correctly by pattern but is actually a 404.

### 5. robots.txt
Scrape mode should check and honour `robots.txt` before crawling. Not required for Phase 1 (rss only), but must land before scrape mode ships.

### 6. Timeout budget
The resolver makes up to ~8 HTTP requests across Steps 1–4. Cap each individual request at 3s, total budget 8s. If budget exhausted mid-probe, return best result found so far (or fallback).

---

## Implementation steps

### Step A — Schema migration ✅
- Add `feed_type text NOT NULL DEFAULT 'rss'` to `sources` table
- Run `npm run db:push`
- Update `src/db/schema.ts`
- Update `src/lib/types.ts` — add `feedType: 'rss' | 'scrape'` to `SourceInstance`

### Step B — `POST /api/sources/resolve-feed` ✅
- New route: `src/app/api/sources/resolve-feed/route.ts`
- Implements Steps 1–5 of the resolution algorithm
- Timeout: 8s total

### Step C — Add Source form update ✅
- URL field triggers resolve-feed on blur
- Shows resolved result inline (feed found / no feed)
- Auto-populates name + slug from page `<title>` if blank
- Passes `feedType` to the sources POST API

### Step D — Atom feed support in gather ✅
- Update `fetchRssFeed` in `src/app/api/topics/[id]/gather/route.ts` to parse `<entry>` (Atom) in addition to `<item>` (RSS)
- Test against `martinfowler.com/feed.atom`

### Step E — Sources API: accept feedType ✅
- `POST /api/topics/[id]/sources` — accept and persist `feedType`

### Step G — Smart discover with high-water mark ✅

`lastDiscoveredAt` timestamp column on `sources` (nullable). Gather route computes effective lookback per source:

| State | Effective lookback |
|---|---|
| `lastDiscoveredAt` is null (new source) | Full `lookbackDays` — one-time backfill |
| `lastDiscoveredAt` set | `daysSinceLastRun + 1` day buffer (capped at `lookbackDays`) |
| `force=true` query param | Always full `lookbackDays`, ignores mark |

After each successful source scan, `lastDiscoveredAt` is stamped to now.

UI: Discover button is split — left half runs smart discover, right `⟳` runs force rescan.

### Step H — Source filter click in pipeline queue ✅

When the SourcesSection is expanded, clicking a source row filters the ArticleQueue below to show only articles from that source. Click again (or click "All") to clear.

Requires lifting source filter state up from ArticleQueue into the pipeline page (or using a shared client state between SourcesSection and ArticleQueue).

### Step F — Scrape-mode discover ⏸ Phase 2
- Gather route: when `feedType === 'scrape'`, fetch HTML and extract article candidates
- robots.txt check required before this ships
