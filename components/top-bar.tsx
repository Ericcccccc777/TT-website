"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// Hydration-safe "am I on the client?" flag (SSR snapshot: false) — replaces
// the setState-in-effect mounted pattern without a cascading second render.
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

// ── Icon components ────────────────────────────────────────────────────────

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden
    >
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </>
      )}
    </svg>
  );
}

// ── Language switcher icons ────────────────────────────────────────────────

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden
      className={className}
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M1.75 8h12.5M8 1.75v12.5" />
      <path d="M8 1.75c2.2 2.4 2.2 9.85 0 12.5M8 1.75c-2.2 2.4-2.2 9.85 0 12.5" />
    </svg>
  );
}

function LocaleCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 7.5 6 11l5.5-7"
        stroke="var(--color-leaf-light)"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

// ── Language Switcher ──────────────────────────────────────────────────────
// Custom themed dropdown (replaces the OS-rendered native <select>).
// Menu-button pattern: aria-haspopup + roving-tabindex menuitemradio items,
// full keyboard support, click-outside-to-close. Locale switch still goes
// through next-intl's router.replace(pathname, { locale }) — path preserved.

function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const locales = routing.locales;
  const localeNames: Record<string, string> = {
    zh: t("zh"),
    en: t("en"),
    ja: t("ja"),
    ko: t("ko"),
  };

  const activeIndex = Math.max(0, locales.indexOf(locale as (typeof locales)[number]));

  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(activeIndex);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // The popup is rendered through a portal (client-only).
  const mounted = useMounted();

  // Position the portal popup just under the trigger, right-aligned to it.
  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  }, []);

  // Keep the popup aligned to the trigger while open (scroll / resize).
  useEffect(() => {
    if (!open) return;
    updateCoords();
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open, updateCoords]);

  // Close when clicking/tapping outside the trigger AND the (portaled) popup.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move DOM focus to the focused menu item while the popup is open.
  useEffect(() => {
    if (open) itemRefs.current[focusedIndex]?.focus();
  }, [open, focusedIndex]);

  function openMenu(index: number) {
    updateCoords();
    setFocusedIndex(index);
    setOpen(true);
  }

  function closeMenu(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function selectLocale(loc: (typeof locales)[number]) {
    closeMenu();
    if (loc !== locale) router.replace(pathname, { locale: loc });
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      openMenu(event.key === "ArrowDown" ? 0 : locales.length - 1);
    }
  }

  function onItemKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((index + 1) % locales.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((index - 1 + locales.length) % locales.length);
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(locales.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu(activeIndex))}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("ariaLabel")}: ${localeNames[locale]}`}
        className="flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[var(--color-soil)] bg-surface-ui px-2 py-1.5 text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:border-leaf-light hover:text-leaf-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "0.6875rem" /* --text-caption */,
          minHeight: "2rem" /* ≥ 32px; in the 56px header this is fine */,
          lineHeight: 1.4,
        }}
      >
        <GlobeIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{localeNames[locale]}</span>
        <span
          aria-hidden
          className="transition-transform duration-100"
          style={{ fontSize: "0.55rem", transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {open &&
        mounted &&
        coords &&
        createPortal(
          <ul
            ref={popupRef}
            role="menu"
            aria-label={t("ariaLabel")}
            className="fixed flex min-w-[9rem] flex-col gap-0.5 p-1"
            style={{
              top: coords.top,
              right: coords.right,
              zIndex: 1000,
              background: "var(--color-surface-panel)",
              border: "var(--border-pixel)",
              borderRadius: "var(--radius-pixel)",
              boxShadow: "var(--shadow-pixel)",
            }}
          >
            {locales.map((loc, index) => {
              const isActive = loc === locale;
              return (
                <li key={loc} role="none">
                  <button
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    tabIndex={focusedIndex === index ? 0 : -1}
                    onClick={() => selectLocale(loc)}
                    onKeyDown={(event) => onItemKeyDown(event, index)}
                    className={[
                      "flex w-full cursor-pointer items-center gap-2 rounded-[2px] px-2 py-1.5 text-left transition-colors duration-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-leaf-light",
                      isActive
                        ? "bg-leaf-deep/25 text-leaf-light"
                        : "text-[var(--color-text-muted-dark)] hover:bg-leaf-deep/15 hover:text-leaf-light",
                    ].join(" ")}
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "0.6875rem",
                      minHeight: "2.25rem",
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                      aria-hidden
                    >
                      {isActive ? <LocaleCheckIcon /> : null}
                    </span>
                    <span>{localeNames[loc]}</span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────────

const GITHUB_URL = "https://github.com/Ericcccccc777/Token-Forest-P";

export function TopBar() {
  const t = useTranslations("TopBar");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_LINKS = [
    { label: t("home"), href: "/" as const },
    { label: t("download"), href: "/download" as const },
    { label: t("dashboard"), href: "/dashboard" as const },
    { label: t("leaderboard"), href: "/leaderboard" as const },
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header
      className="sticky top-0 z-50 border-b-2 border-soil bg-surface-ui/[0.97] backdrop-blur-sm"
      style={{ borderBottomColor: "var(--color-soil)" }}
    >
      {/* ── Main bar ── */}
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand wordmark */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf-light"
          aria-label={t("logoAriaLabel")}
        >
          <Image
            src="/logo.svg"
            alt=""
            width={24}
            height={24}
            className="pixelated h-6 w-6 shrink-0"
            aria-hidden
            priority
          />
          <span
            className="hidden font-pixel text-[14px] font-bold leading-none text-[var(--color-text-cream)] sm:block"
            style={{ textShadow: "1px 1px 0 rgb(0 0 0 / 25%)" }}
          >
            Token-Forest
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden items-center gap-1 md:flex" aria-label={t("mainNavAriaLabel")}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={[
                "rounded-pixel px-3 py-1.5 font-body text-small transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light",
                isActive(href)
                  ? "bg-leaf-deep/20 text-leaf-light"
                  : "text-[var(--color-text-muted-dark)] hover:text-leaf-light",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("githubAriaLabel")}
            className="ml-2 rounded-pixel p-1.5 text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:text-leaf-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
          >
            <GitHubIcon className="h-4 w-4" />
          </a>
        </nav>

        {/* ── Right-side actions ── */}
        <div className="flex shrink-0 items-center gap-3 md:gap-4">
          {/* Language switcher */}
          <LocaleSwitcher />

          {/* Download CTA — desktop */}
          <Link
            href="/download"
            className="hidden items-center gap-1.5 rounded-pixel bg-leaf-deep px-3 py-1.5 font-pixel text-caption text-[var(--color-text-cream)] shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none md:flex"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden>
              <path d="M8 1v8.293L5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 9.293V1H8Zm-6 10a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H2Z" />
            </svg>
            {t("downloadLabel")}
          </Link>

          {/* Mobile: compact download */}
          <Link
            href="/download"
            className="inline-flex min-h-[36px] items-center rounded-pixel bg-leaf-deep px-3 py-1.5 font-pixel text-caption text-[var(--color-text-cream)] shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none md:hidden"
            aria-label={t("downloadLabel")}
          >
            {t("downloadLabel")}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            className="flex h-11 w-11 items-center justify-center rounded-pixel text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:text-leaf-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light md:hidden"
          >
            <HamburgerIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-[var(--color-soil)]/40 bg-surface-ui px-4 pb-4 pt-2 md:hidden"
        >
          <nav className="flex flex-col gap-0.5" aria-label={t("mobileNavAriaLabel")}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={[
                  "flex min-h-[44px] items-center rounded-pixel px-3 font-body text-small transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light",
                  isActive(href)
                    ? "bg-leaf-deep/20 text-leaf-light"
                    : "text-[var(--color-text-muted-dark)] hover:text-leaf-light",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[44px] items-center gap-2 rounded-pixel px-3 font-body text-small text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:text-leaf-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
            >
              <GitHubIcon className="h-4 w-4" />
              GitHub
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
