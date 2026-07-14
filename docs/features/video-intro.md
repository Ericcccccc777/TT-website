# Feature: Demo video on the home page

## Status: DRAFT 2026-07-14

## 1. What this feature is for

New visitors land on the home page and have to work out, from words and still pictures, what a "pixel pet that grows from your AI tokens" actually looks like. A one-minute-49-second demo answers that in a way text cannot. This feature puts that demo where visitors already are — inside the "How it works" part of the home page — and tells search engines and AI answer engines that the page has a video, which makes the page _eligible_ for a video thumbnail in search results. Eligible is not the same as guaranteed; see § 6 for the trade-off we knowingly took.

## 2. Happy path

### 2.1 A visitor sees there is a video

The visitor scrolls to "How it works". Above the three steps they see a still frame from the demo with a large play button on it, a short lead-in line ("See it in action"), and the video's length. Nothing has been fetched from the video host at this point — the still frame is served by our own site.

### 2.2 A visitor plays the video

The visitor presses the play button. The still frame is replaced, in place, by a working player and the video starts. The visitor stays on our page the whole time — nothing opens in a new tab, nothing navigates away.

### 2.3 A visitor wants to go to the video host instead

Under the player there is a plain link, "Watch on YouTube". Pressing it opens the video on the video host in a new tab, leaving our page open behind it.

### 2.4 A search engine or AI engine reads the page

The home page declares, in the machine-readable data it already publishes, that it contains this specific video — its title, what it shows, how long it is, when it was published, and where the still frame lives. The site's plain-text summaries for AI crawlers also name the video and link to it.

## 3. Edge-case behavior

### 3.1 The visitor never presses play

#### Behavior (CEO sign-off)

- When the visitor loads the home page and does not press play
- The system makes no request of any kind to the video host, and no third-party cookie is set
- The visitor sees only the still frame, served from our own site

#### Classification

[Required automated test]

#### Smoke test procedure

**Reproduce:**

1. Open the home page in a fresh private window with the browser's network panel open.
2. Filter the network panel for requests to the video host.
3. Scroll to "How it works" and look at the video block. Do not press play.

**Pass criteria:**

- Zero requests to the video host appear in the network panel.
- The browser's cookie list contains no cookie from the video host.
- The still frame and play button are visible.

**Failure signals:**

- Any request to the video host before the click.
- A cookie from the video host appears on page load.

### 3.2 The visitor's network cannot reach the video host

#### Behavior (CEO sign-off)

- When a visitor is on a network that blocks the video host (mainland China, some corporate networks)
- The video block still renders completely — the still frame is served by our own site, so there is no broken image
- If that visitor presses play, the player fails to load. We accept this. We do not detect their location, do not hide the block, and do not show a special message.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Block the video host's domains at the network level (or use a network where they are already blocked).
2. Load the home page and scroll to "How it works".

**Pass criteria:**

- The still frame, play button, length, and lead-in line all render normally. Nothing is broken or blank.

**Failure signals:**

- A broken-image placeholder where the still frame should be.
- The video block collapses and breaks the layout of the section.

### 3.3 The video is later deleted, made private, or renamed

#### Behavior (CEO sign-off)

- When the video no longer exists at the video host
- A visitor who presses play sees the host's own "video unavailable" message inside the player
- We do not build our own fallback for this. The still frame stays correct because we host it ourselves.
- **If the video is taken down permanently**, we must also remove the video block, the machine-readable video declaration, and the video's mentions in the plain-text summaries for AI crawlers — in the same change. Leaving a page that tells search engines "there is a watchable video here" when there is not is a structured-data policy violation, not merely stale content.

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Not routinely reproducible. Check this scenario if the video is ever taken down.

**Pass criteria:**

- The page does not crash; only the player area shows the host's message.
- If the takedown is permanent, the video block and every machine-readable mention of the video are removed together.

**Failure signals:**

- The page errors or the section fails to render.
- The page still declares a video to search engines after the video is gone.

### 3.4 The visitor uses a keyboard or a screen reader

#### Behavior (CEO sign-off)

- When the visitor navigates with the keyboard
- The play control is reachable by tab, shows a visible focus ring, and activates with Enter or Space
- A screen reader announces what the control does and how long the video is

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Load the home page and press Tab repeatedly until focus reaches the video block.
2. Press Enter. Reload, tab back to the control, and press Space.
3. Turn on the operating system's screen reader and tab to the control again.

**Pass criteria:**

- A focus ring is clearly visible on the play control.
- Enter starts the video. Space also starts the video.
- The screen reader announces the control as a button, says it plays the demo video, and reads the length out loud (the length is otherwise only shown as a visual badge).

**Failure signals:**

- The control is skipped by Tab, or focus is invisible.
- Space scrolls the page instead of starting the video.
- The screen reader announces nothing, or announces the control without saying what it does or how long the video is.

### 3.5 A visitor reads the privacy notice

#### Behavior (CEO sign-off)

- When a visitor reads the privacy notice's section about the website
- It states plainly that the home page carries a demo video hosted elsewhere, that nothing is fetched from that host until they press play, and that once they press play the host may set its own cookies and receive their address
- It names **both** ways of reaching the host — pressing play, and following the "Watch on YouTube" link — so a reader is not told they are safe while a second door sits next to the first

#### Classification

[Smoke test only]

#### Smoke test procedure

**Reproduce:**

1. Open the privacy page in each of the four languages.
2. Find the section about the website.

**Pass criteria:**

- The video disclosure paragraph is present and reads naturally in all four languages.

**Failure signals:**

- The paragraph is missing in any language, or contradicts the "no marketing cookies" sentence above it.

## 4. Who can use this

- Anyone. No sign-in, no conditions.
- The video block is shown identically in all four site languages.

## 5. External dependencies (plain language)

- The video itself is hosted by YouTube. If YouTube is down or unreachable, pressing play fails; everything else on the page is unaffected because the still frame and all text are served by us.
- Nothing else on the page depends on the video.

## 6. Deferred / unresolved

- **⚠️ The click-to-load choice may cost us the video thumbnail we are chasing.** The external auditor found that the search engine's own guidance tells sites _not_ to make a video depend on the visitor clicking, and to have the player present in the page as delivered. Our block is the opposite: nothing but a still frame until a click. We are keeping it anyway, because the alternative — loading the player for every visitor — would break both the speed floor this project committed to and the privacy promise the CEO just chose to make honest. So the position is: the page still _declares_ the video in machine-readable form, which is the mechanism the search engine documents for exactly this case, but eligibility for a video thumbnail is **possible, not assured**. **We verify with the search engine's own testing tool after release, and if it reports the video as not recognised, the CEO decides then** whether the thumbnail is worth loading the player for everyone. Do not treat "we added a video" as "we will get a video result".

- **Subtitles.** The video has one English cut, shared by all four languages. Wiring the player to auto-select a subtitle track in the visitor's language was considered and deferred: it requires subtitles to exist on the video host first, which is a content task, not a code task. When subtitles are uploaded, this becomes a small change.
- **Hiding the block for visitors who cannot reach the video host** (e.g. by their network location). Deferred: it would force the home page to be rebuilt per visitor instead of served pre-built, which costs first-paint speed the project has committed to and adds hosting cost — for a benefit no larger than one still image the visitor can simply ignore.
- **Naming the video's channel as an official company channel** in the machine-readable data. Deferred: the video currently lives on a personal channel, and claiming a personal channel as the product's official one would muddy rather than clarify who publishes what. Revisit if a branded channel is created.
- **Making the same video's disclosure appear in the product's own canonical privacy document** (the one this site mirrors). The website's copy has been updated; the canonical document has not.

## 7. Out of scope

- Producing localized cuts of the video.
- Any second video, or a video library / page of its own.
- Putting the video on the download page or anywhere other than the home page.
- Auto-playing the video without a click.
- Tracking whether visitors played the video.

## 8. Decision history

- **Video goes on the home page, not a sub-page and not a link out to the video host.** Sending visitors to the video host gives away the traffic and forfeits any search benefit, because search engines only credit a page that actually carries the video. A sub-page would bury the video behind a click most visitors never make. (CEO, 2026-07-14)
- **The play control is the still frame itself, not a separate button.** The CEO originally asked for a button in "How it works" that leads somewhere. The still frame with a play badge _is_ that button visually, while keeping the visitor on the page. (CEO accepted, 2026-07-14)
- **Nothing loads from the video host until the visitor clicks.** Protects the project's stated first-paint speed floor and keeps the privacy promise literally true for anyone who never plays. (Tech Lead, accepted by CEO)
- **The still frame is hosted by us, not by the video host.** The video host's image servers are unreachable on the same networks that block the video, which would leave a broken image. (Tech Lead)
- **The privacy notice is updated in all four languages.** Once a visitor presses play, a third party can set cookies. Not saying so would make the existing "no marketing cookies" sentence misleading. (CEO chose this over saying nothing, 2026-07-14)
- **Location detection is not used to hide the video.** CEO asked whether visitors in mainland China could be detected and shown no video; declined on cost/benefit grounds — see § 6. (Tech Lead recommended, CEO to confirm at smoke test)
- **Subtitles are not wired up.** CEO decided the four languages share one English cut. (CEO, 2026-07-14)
- **External audit (Codex), 2026-07-14 — CONCERNS, risk 6, no blocking items.** Five advisory findings, all accepted and folded in: the click-to-load / search-eligibility tension (§ 6), removing the video declaration if the video is ever taken down (§ 3.3), disclosing the "Watch on YouTube" link as a second door to the third party (§ 3.5), testing Space and the screen-reader announcement, not only Tab and Enter (§ 3.4), and not promising a video thumbnail we cannot promise (§ 1). Log: `.harness/audits/concerns-video-intro-stage1-20260714-163208.json`.

## 9. (Audit mode only — leave empty in new-feature mode) Code vs spec delta

_(not applicable — new-feature mode)_
