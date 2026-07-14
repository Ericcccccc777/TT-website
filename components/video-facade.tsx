"use client";

import Image from "next/image";
import { useState } from "react";
import { DEMO_VIDEO } from "@/lib/seo";

/**
 * Click-to-load YouTube player ("facade" pattern).
 *
 * At rest this is just a self-hosted thumbnail and a pixel play button — no
 * iframe, no YouTube script, no third-party cookie. The embed is mounted only
 * when the visitor presses play, which keeps the home page's first paint inside
 * the project's interactive-in-2-3s floor and keeps the privacy-first promise
 * literally true for anyone who never plays the video.
 *
 * The self-hosted thumbnail (rather than i.ytimg.com) means the block renders
 * even where YouTube's hosts are unreachable; on those networks the player
 * itself will still fail after the click, which we accept.
 */
interface VideoFacadeProps {
  /** Section lead-in shown above the player. */
  heading: string;
  /** Accessible name for the play button. */
  playLabel: string;
  /** Small print: pressing play pulls the video from YouTube. */
  privacyNote: string;
  /** Link text for the escape hatch to YouTube itself. */
  watchOnYouTube: string;
}

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

export function VideoFacade({ heading, playLabel, privacyNote, watchOnYouTube }: VideoFacadeProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="reveal mx-auto mb-16 max-w-3xl">
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
            className="absolute inset-0 h-full w-full"
            src={`${DEMO_VIDEO.embedUrl}?autoplay=1&rel=0&playsinline=1`}
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

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted-light)",
            lineHeight: 1.6,
          }}
        >
          {privacyNote}
        </p>
        <a
          href={DEMO_VIDEO.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap underline underline-offset-2 hover:text-leaf-deep"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted-light)",
          }}
        >
          {watchOnYouTube} →
        </a>
      </div>
    </div>
  );
}
