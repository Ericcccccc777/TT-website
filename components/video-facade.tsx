"use client";

import Image from "next/image";
import { useState } from "react";
import { DEMO_VIDEO, DEMO_VIDEO_BILIBILI } from "@/lib/seo";

/**
 * Click-to-load video player ("facade" pattern) with a YouTube + Bilibili source
 * toggle.
 *
 * At rest this is just a self-hosted thumbnail and a pixel play button — no
 * iframe, no third-party script, no third-party cookie. An embed is mounted only
 * when the visitor presses play (or the source-switch button), which keeps the
 * home page's first paint inside the project's interactive-in-2-3s floor and
 * keeps the privacy-first promise literally true for anyone who never plays.
 *
 * `defaultSource` is the one the page arms first — Bilibili on the Chinese page
 * (YouTube is unreachable in mainland China), YouTube elsewhere. Either way the
 * switch button lets the visitor pick the other one, so a Chinese speaker abroad
 * or an English-browser visitor inside China is never stuck with a dead player.
 *
 * The self-hosted thumbnail (rather than i.ytimg.com / a Bilibili cover) means
 * the block renders even where a host is unreachable; only the player itself
 * fails after the click on those networks, which we accept.
 */
type Source = "youtube" | "bilibili";

interface VideoFacadeProps {
  /** Section lead-in shown above the player. */
  heading: string;
  /** Accessible name for the play button. */
  playLabel: string;
  /** Small print: pressing play pulls the video from a third-party host. */
  privacyNote: string;
  /** Source armed on first load (zh -> bilibili, others -> youtube). */
  defaultSource: Source;
  /** Switch-button label shown while Bilibili is active. */
  switchToYoutube: string;
  /** Switch-button label shown while YouTube is active. */
  switchToBilibili: string;
}

const EMBED: Record<Source, string> = {
  youtube: `${DEMO_VIDEO.embedUrl}?autoplay=1&rel=0&playsinline=1`,
  bilibili: `${DEMO_VIDEO_BILIBILI.embedUrl}&autoplay=1&high_quality=1`,
};

/** Pixel play triangle, drawn crisp to match the site's sprite language. */
function PixelPlay({ width = 34 }: { width?: number }) {
  return (
    <svg viewBox="0 0 10 12" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#faf5ea">
        <rect x="2" y="1" width="2" height="10" />
        <rect x="4" y="2" width="2" height="8" />
        <rect x="6" y="4" width="2" height="4" />
      </g>
    </svg>
  );
}

export function VideoFacade({
  heading,
  playLabel,
  privacyNote,
  defaultSource,
  switchToYoutube,
  switchToBilibili,
}: VideoFacadeProps) {
  const [source, setSource] = useState<Source>(defaultSource);
  const [playing, setPlaying] = useState(false);

  const other: Source = source === "youtube" ? "bilibili" : "youtube";
  const switchLabel = other === "youtube" ? switchToYoutube : switchToBilibili;

  return (
    <div className="reveal mx-auto mt-16 max-w-3xl">
      <p
        className="mb-3 text-center text-leaf-deep"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)", lineHeight: 1.3 }}
      >
        {heading}
      </p>

      <div
        className="relative aspect-video w-full overflow-hidden"
        style={{
          border: "var(--border-pixel)",
          borderRadius: "var(--radius-pixel)",
          background: "var(--color-surface-deepest)",
          boxShadow: "var(--shadow-pixel)",
        }}
      >
        {playing ? (
          <iframe
            key={source}
            className="absolute inset-0 h-full w-full"
            src={EMBED[source]}
            title={DEMO_VIDEO.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={playLabel}
            className="group absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
          >
            <Image
              src={DEMO_VIDEO.thumbnail}
              alt=""
              width={DEMO_VIDEO.thumbnailWidth}
              height={DEMO_VIDEO.thumbnailHeight}
              sizes="(max-width: 768px) 100vw, 768px"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />

            {/* play badge */}
            <span
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-[transform,box-shadow] duration-100 group-hover:-translate-x-[calc(50%+2px)] group-hover:-translate-y-[calc(50%+2px)] group-hover:shadow-pixel-lg"
              style={{
                width: "4.5rem",
                height: "4.5rem",
                paddingLeft: "0.4rem",
                border: "var(--border-pixel)",
                borderRadius: "var(--radius-pixel)",
                background: "var(--color-leaf-deep)",
                boxShadow: "var(--shadow-pixel)",
              }}
              aria-hidden
            >
              <PixelPlay />
            </span>

            {/* duration badge */}
            <span
              className="absolute bottom-2 right-2 px-1.5 py-1"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.6rem",
                lineHeight: 1,
                color: "var(--color-text-cream)",
                background: "rgb(0 0 0 / 65%)",
                borderRadius: "var(--radius-pixel)",
              }}
              aria-hidden
            >
              {DEMO_VIDEO.durationLabel}
            </span>
          </button>
        )}
      </div>

      {/* Source switch — pixel button in the site's secondary style. Switching
          also starts playback of the chosen source (it is a deliberate click). */}
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => {
            setSource(other);
            setPlaying(true);
          }}
          className="inline-flex items-center gap-2 rounded-[2px] px-4 py-2 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-caption)",
            background: "var(--color-surface-card)",
            border: "var(--border-pixel)",
            boxShadow: "var(--shadow-pixel)",
            color: "var(--color-text-forest)",
          }}
        >
          {switchLabel}
        </button>
      </div>

      {/* Small print. Deliberately quiet — it is a disclosure, not a caption, and it sits
          under a block whose whole point is that nothing has loaded yet. */}
      <p
        className="mt-3"
        style={{
          fontFamily: "var(--font-body)",
          // Explicit 10px. The --text-* tokens are Tailwind @theme "size / line-height"
          // pairs — valid as the `text-caption` class, but invalid (and ignored) as an
          // inline font-size, so var(--text-caption) here silently fell back to the
          // inherited body size instead of shrinking. This value actually renders small.
          fontSize: "0.625rem",
          color: "var(--color-text-muted-light)",
          lineHeight: 1.6,
          textAlign: "center",
        }}
      >
        {privacyNote}
      </p>
    </div>
  );
}
