import { NextResponse } from 'next/server'

const UA = 'signal-digest/1.0'

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  return fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml,*/*' },
    signal: AbortSignal.timeout(ms),
    redirect: 'follow',
  })
}

function isFeedContent(contentType: string, body: string): boolean {
  if (/xml|rss|atom/.test(contentType)) return true
  const t = body.trimStart()
  return t.startsWith('<?xml') || t.startsWith('<rss') || t.startsWith('<feed')
}

function resolveUrl(href: string, base: string): string {
  try { return new URL(href, base).toString() } catch { return href }
}

// Extract name from RSS/Atom feed XML
function extractFeedTitle(xml: string): string | null {
  // RSS: <channel><title>...</title> or <title><![CDATA[...]]>
  const rss = xml.match(/<channel[^>]*>[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?\s*([^\]<]+?)\s*(?:\]\]>)?<\/title>/i)
  if (rss?.[1]) return rss[1].trim()
  // Atom: <feed><title>...</title>
  const atom = xml.match(/<feed[^>]*>[\s\S]*?<title[^>]*>([^<]+)<\/title>/i)
  if (atom?.[1]) return atom[1].trim()
  return null
}

// Extract feed URLs from HTML: <link rel="alternate"> + plain <a> hrefs containing feed/rss/atom
function extractFeedLinks(html: string, baseUrl: string): string[] {
  const results: string[] = []
  let m: RegExpExecArray | null

  const linkRe = /<link[^>]+rel\s*=\s*["']alternate["'][^>]*>/gi
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0]
    if (!/application\/(rss|atom)\+xml/i.test(tag)) continue
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]
    if (href) results.push(resolveUrl(href, baseUrl))
  }

  // Plain <a> links — handle spaces around = (e.g. martinfowler.com uses href = '...')
  const aRe = /<a\s[^>]*href\s*=\s*["']([^"']*(?:feed|rss|atom)[^"']*)["'][^>]*>/gi
  while ((m = aRe.exec(html)) !== null) {
    const href = m[1]
    if (!href || href.startsWith('#') || href.startsWith('javascript')) continue
    const resolved = resolveUrl(href, baseUrl)
    if (!results.includes(resolved)) results.push(resolved)
  }

  return results
}

// Fetch feed, return url + title if valid
async function tryFeed(url: string): Promise<{ url: string; title: string | null } | null> {
  try {
    const res = await fetchWithTimeout(url, 3000)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    const body = await res.text()
    if (!isFeedContent(ct, body)) return null
    return { url, title: extractFeedTitle(body) }
  } catch { return null }
}

// For substack.com/@username profile pages, find the publication URL via the profile chip.
// Works for both *.substack.com subdomains AND custom domains (e.g. newsletter.pragmaticengineer.com).
async function resolveSubstackProfile(username: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`https://substack.com/@${username}`, 6000)
    if (!res.ok) return null
    const html = await res.text()

    // The profile chip has utm_campaign=profile_chips — reliable across substack + custom domains
    const chipMatch = html.match(/href="(https:\/\/[^"]+)\?[^"]*utm_campaign=profile_chips/i)
    if (chipMatch) {
      const pubOrigin = new URL(chipMatch[1]).origin
      return `${pubOrigin}/feed`
    }

    // Fallback: any *.substack.com subdomain that isn't substack.com itself
    const subMatch = html.match(/href="(https:\/\/(?!(?:www\.)?substack\.com)[a-z0-9-]+\.substack\.com)(?:\/[^"]*)?"/i)
    if (subMatch) return `${subMatch[1]}/feed`
  } catch { /* ignore */ }
  return null
}

export async function POST(req: Request) {
  const { url: rawUrl } = await req.json() as { url: string }
  if (!rawUrl) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let url: URL
  try { url = new URL(rawUrl) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  const input = url.toString()

  function ok(result: { url: string; title: string | null }, method: string) {
    return NextResponse.json({
      feedUrl:     result.url,
      feedType:    'rss',
      method,
      originalUrl: input,
      suggestedName: result.title ?? null,
    })
  }

  // ── Step 1: direct feed ────────────────────────────────────────────────────
  const direct = await tryFeed(input)
  if (direct) return ok(direct, 'direct')

  // ── Step 2: Substack @profile URL ─────────────────────────────────────────
  if (url.hostname === 'substack.com' && url.pathname.startsWith('/@')) {
    const username = url.pathname.split('/')[1].slice(1)
    const feedUrl = await resolveSubstackProfile(username)
    if (feedUrl) {
      const result = await tryFeed(feedUrl)
      if (result) return ok(result, 'substack-profile')
    }
  }

  // ── Step 3: fetch page HTML for discovery ─────────────────────────────────
  let html = ''
  try {
    const res = await fetchWithTimeout(input, 5000)
    if (res.ok) html = await res.text()
  } catch { /* ignore */ }

  // ── Step 3a: HTML autodiscovery ────────────────────────────────────────────
  if (html) {
    for (const candidate of extractFeedLinks(html, input)) {
      const result = await tryFeed(candidate)
      if (result) return ok(result, 'html-autodiscovery')
    }
  }

  // ── Step 4: platform patterns ──────────────────────────────────────────────
  const origin = url.origin

  if (url.hostname.endsWith('.substack.com')) {
    const r = await tryFeed(`${origin}/feed`)
    if (r) return ok(r, 'substack-subdomain')
  }
  if (html.includes('ghost')) {
    const r = await tryFeed(`${origin}/rss/`)
    if (r) return ok(r, 'ghost')
  }
  if (html.includes('/wp-content/') || html.includes('wp-json')) {
    const r = await tryFeed(`${origin}/?feed=rss2`)
    if (r) return ok(r, 'wordpress')
  }

  // ── Step 5: generic suffix probe ──────────────────────────────────────────
  for (const suffix of ['/feed', '/rss', '/rss.xml', '/atom.xml', '/feed.xml', '/index.xml', '/rss/', '/feed/']) {
    const candidate = `${origin}${suffix}`
    if (candidate === input) continue
    const r = await tryFeed(candidate)
    if (r) return ok(r, 'suffix-probe')
  }

  // ── Step 6: fallback scrape ────────────────────────────────────────────────
  return NextResponse.json({ feedUrl: input, feedType: 'scrape', method: 'fallback', originalUrl: input, suggestedName: null })
}
