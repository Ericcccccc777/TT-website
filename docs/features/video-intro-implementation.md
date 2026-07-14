# Demo video on the home page — Implementation Notes

**Spec:** docs/features/video-intro.md (canonical, CEO domain)
**This file:** technical detail, manager domain.

## Functional requirements (EARS)

- **Ubiquitous.** THE SYSTEM SHALL render the demo-video block inside the `#how`
  section of `app/[locale]/page.tsx`, above `<HowSteps>`, in every locale.
- **State-driven.** WHILE the facade has not been clicked, THE SYSTEM SHALL render
  no `<iframe>` and issue no request to any `youtube.com`, `youtube-nocookie.com`,
  or `ytimg.com` host.
- **Event-driven.** WHEN the visitor activates the play control, THE SYSTEM SHALL
  replace the facade with an `<iframe>` whose `src` is
  `https://www.youtube-nocookie.com/embed/I_qqApJl_Bo?autoplay=1&rel=0&playsinline=1`.
- **Ubiquitous.** THE SYSTEM SHALL emit exactly one `VideoObject` node, inside the
  home page's existing JSON-LD `@graph`, and SHALL NOT emit it on any other route.
- **Unwanted-behavior.** IF the visitor's network cannot reach the video host,
  THEN THE SYSTEM SHALL still render the poster frame, because the poster is
  served from this origin (`/token-forest-demo.jpg`).

## UI surface

`components/video-facade.tsx` — client component (`"use client"`, one `useState`).

| State                                             | Renders                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `playing === false` (initial, and what SSR emits) | `<button>` wrapping a `next/image` poster + pixel play badge + duration badge                                |
| `playing === true`                                | `<iframe>` at the no-cookie embed URL, `allowFullScreen`, `referrerPolicy="strict-origin-when-cross-origin"` |

The wrapper is `aspect-video` so there is no layout shift when the poster is
swapped for the iframe. Styling reuses the existing pixel tokens
(`--border-pixel`, `--radius-pixel`, `--shadow-pixel`, `--font-pixel`) so the
block reads as part of the same section as the three `HowSteps` demo boxes.

`PixelPlay` is a local inline `crispEdges` SVG, matching the sprite language of
`PixelHand` / `PixelFloppy` in `components/how-steps.tsx`. It is not exported —
nothing else needs it.

## Data requirements

None. No database, no API, no server state. The video's facts are compile-time
constants.

## External dependencies

- **YouTube** — `youtube-nocookie.com` embed player, mounted on click only. No
  YouTube IFrame API script, no `react-youtube`, no `lite-youtube-embed`
  package: a facade is ~40 lines and a dependency here would be all cost.
- No new npm packages.

## Video constants

`lib/seo.ts` → `DEMO_VIDEO` (frozen object) and `DEMO_VIDEO_DESCRIPTION`
(`Record<Locale, string>`).

| Field        | Value                                                                     | Source                                                 |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| `id`         | `I_qqApJl_Bo`                                                             | URL                                                    |
| `title`      | `Token Forest \| I turned my AI coding tokens into a living pixel forest` | YouTube oEmbed, verbatim                               |
| `uploadDate` | `2026-07-09T22:52:33-07:00`                                               | watch-page `ytInitialPlayerResponse`                   |
| `duration`   | `PT1M49S`                                                                 | `lengthSeconds: 109`                                   |
| `thumbnail`  | `/token-forest-demo.jpg`                                                  | `maxresdefault.jpg`, 1280×720, downloaded to `public/` |

Title, upload date and duration are copied verbatim rather than paraphrased:
Google requires `VideoObject` markup to describe the canonical video, and a
mismatch is a structured-data policy violation, not a cosmetic error.

## ⚠️ The facade's known cost (external audit, Codex, 2026-07-14)

Google's video best-practice guidance says: do not make the video depend on a
user action such as a click, and have the player present in the rendered HTML.
The facade violates both, by design. The counterweight is the `VideoObject`
markup — `embedUrl` + `contentUrl` + `thumbnailUrl` is the documented mechanism
for telling Google about a video it cannot see inline — so the page remains
_eligible_ for video treatment, but eligibility is not assured.

We took the trade knowingly: rendering the iframe for every visitor would
breach the constitution's 2–3 s interactive floor and would make the privacy
notice's "no third-party cookies unless you ask for them" claim false for
everyone who merely scrolls past.

**Verification after release:** run the URL Inspection / Rich Results Test on
`/en` and confirm Google reports the `VideoObject`. If it does not, the CEO
decides whether a video thumbnail is worth loading the player for everyone.
This is recorded in spec § 6 and must not be quietly dropped.

## Structured data

`lib/schema.ts` → `videoObject(locale)`, appended to `homeGraph()`'s `@graph`.

- `@id`: `${base}/#demo-video`
- `thumbnailUrl`: absolute (`${base}/token-forest-demo.jpg`) — schema.org requires it
- `contentUrl`: the `watch?v=` URL; `embedUrl`: the no-cookie embed URL
- `inLanguage`: `en` regardless of page locale — the cut is English
- `publisher` → `#organization`, `about` → `#app` (reuses the existing node IDs)

Emitted only from `HomeJsonLd`. Marking up a video on a page that does not show
it is a policy violation, which is why the block and the node ship together and
neither exists on `/download`.

`Organization.sameAs` is deliberately **not** extended with the YouTube channel:
the video sits on a personal channel (`@milesren8771`), and asserting it as the
product's official channel would confuse the entity rather than consolidate it.
See spec § 6.

## i18n

Four new keys under the existing `HowItWorks` namespace (all four locales in
`messages/*.json`):

| Key                   | en                                                     | zh                                     | ja                                        | ko                                     |
| --------------------- | ------------------------------------------------------ | -------------------------------------- | ----------------------------------------- | -------------------------------------- |
| `videoHeading`        | See it in action                                       | 看看它实际的样子                       | 実際の動きを見る                          | 실제 모습 보기                         |
| `videoPlayLabel`      | Play the Token Forest demo video (1 minute 49 seconds) | 播放 Token Forest 演示视频(1 分 49 秒) | Token Forest のデモ動画を再生(1 分 49 秒) | Token Forest 데모 영상 재생 (1분 49초) |
| `videoPrivacyNote`    | Press play and the video loads from YouTube…           | 点击播放后,视频会从 YouTube 加载…      | 再生すると動画は YouTube から読み込まれ…  | 재생을 누르면 영상이 YouTube에서…      |
| `videoWatchOnYouTube` | Watch on YouTube                                       | 在 YouTube 上观看                      | YouTube で見る                            | YouTube에서 보기                       |

`videoPlayLabel` is the button's `aria-label`, so it carries the duration for
screen-reader users, who cannot see the duration badge.

## AI-crawler surfaces

- `app/llms.txt/route.ts` — new `## Demo video` section: title + watch URL.
- `app/llms-full.txt/route.ts` — new `## Demo video` section: title, length, both
  locations, and the English description.

These are the surfaces answer engines actually read; the video is more likely to
be cited from here than inferred from the JSON-LD.

## Privacy notice

`app/[locale]/privacy/page.tsx` — one paragraph appended to the existing
`Website` section, in all four locale documents.

⚠️ **Known drift.** The header of that file states the text mirrors
`Poietic-TokenForest/PRIVACY.md` in the product repo, and says not to edit the
wording here first. This change breaks that rule deliberately: the website now
does something the canonical document does not describe, and shipping the
behaviour without the disclosure was the worse option. **The same paragraph must
be added to the canonical `PRIVACY.md`** — tracked in spec § 6.

## Boundary contracts

- Consumes: the `HowItWorks` next-intl namespace, `HomeJsonLd`, the pixel CSS
  custom properties in `globals.css`.
- Produces: nothing other features consume.
- Touches no leaderboard, ranger, dashboard, or Supabase code.

## Performance

The poster is 191 KB on disk, served through `next/image` (`sizes` capped at
768 px), so the wire cost is well under that. It is not `priority` — the block
sits below the fold. Zero JS beyond one `useState`; no third-party script enters
the critical path. This is what keeps the constitution's
"interactive in 2–3 s" floor intact while adding a video.

## File locations

| File                            | Change                                         |
| ------------------------------- | ---------------------------------------------- |
| `components/video-facade.tsx`   | new — the facade                               |
| `lib/seo.ts`                    | new `DEMO_VIDEO` + `DEMO_VIDEO_DESCRIPTION`    |
| `lib/schema.ts`                 | new `videoObject()`; appended to `homeGraph()` |
| `app/[locale]/page.tsx`         | renders `<VideoFacade>` in `#how`              |
| `messages/{en,zh,ja,ko}.json`   | 4 keys under `HowItWorks`                      |
| `app/[locale]/privacy/page.tsx` | video paragraph × 4 locales                    |
| `app/llms.txt/route.ts`         | `## Demo video`                                |
| `app/llms-full.txt/route.ts`    | `## Demo video`                                |
| `public/token-forest-demo.jpg`  | new — self-hosted poster (1280×720)            |

## Scenario → automated test map

_(fills in at Stage 6)_

| Spec scenario                                 | Test      |
| --------------------------------------------- | --------- |
| 3.1 no request to the video host before click | _pending_ |
