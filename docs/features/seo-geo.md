# SEO + GEO — being found on Google and by AI assistants

## What this is for

We're promoting Token Forest. This work makes the website findable two ways:

1. **Search engines (SEO)** — Google, Bing can now properly read every page, show
   the right title and a branded preview image when the site is shared, and know
   which language version to show which visitor.
2. **AI assistants (GEO)** — ChatGPT, Claude, Perplexity and Google's AI answers
   can now recognise Token Forest as a real product and describe it accurately,
   including a plain-text summary written specifically for them to read.

## What a visitor / crawler now gets

- Every page has a proper, unique title and description in all four languages
  (English, 中文, 日本語, 한국어), and tells search engines which language is which.
- Sharing any page (Slack, X, WeChat, etc.) shows a branded preview card: the
  pixel apple tree, the "Token Forest" name, and the tagline.
- Search engines are given a map of the site (a sitemap) and a rulebook (robots)
  that explicitly welcomes AI crawlers.
- A machine-readable summary of the product lives at the site's `/llms.txt`
  address, written for AI assistants to quote from.
- The site can be added to a phone home screen (app-style icon and name).

## What still needs a human

- **Point the domain.** `tokenforest.com.au` isn't live yet — DNS has to be
  aimed at the site before search engines can index it.
- **Turn on measurement.** Once the domain is live, register the site with
  Google Search Console and Bing, and (optionally) switch on visitor analytics.
- **Privacy wording.** The site keeps its current "opt-in leaderboard" wording;
  the desktop app's leaderboard default should be reconciled to match before
  launch so the claim stays accurate.

## What comes next (not built yet)

A set of content pages — a FAQ, a few pages targeting what people actually
search for ("Claude Code token tracker", "desktop pet for developers"), a
"compare" page, and one explainer guide — will be added on top of this
foundation to widen how many searches and AI answers can surface Token Forest.

> Full technical detail and the change list live in
> `docs/features/seo-geo-implementation.md`.
