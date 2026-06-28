"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useState } from "react";

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

// ── Language Switcher ──────────────────────────────────────────────────────

function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const localeNames: Record<string, string> = {
    zh: t("zh"),
    en: t("en"),
    ja: t("ja"),
    ko: t("ko"),
  };

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.replace(pathname, { locale: e.target.value as (typeof routing.locales)[number] });
  }

  return (
    <div className="relative flex items-center">
      <select
        value={locale}
        onChange={handleChange}
        aria-label={t("ariaLabel")}
        className="cursor-pointer appearance-none rounded-[2px] border border-[var(--color-soil)] bg-surface-ui py-1.5 pl-2 pr-7 text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:border-leaf-light hover:text-leaf-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "0.6875rem" /* --text-caption */,
          minHeight: "2rem" /* ≥ 32px; in the 56px header this is fine */,
          lineHeight: 1.4,
        }}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
      {/* Custom caret */}
      <span
        className="pointer-events-none absolute right-2 text-[var(--color-text-muted-dark)]"
        style={{ fontSize: "0.55rem", pointerEvents: "none" }}
        aria-hidden
      >
        ▾
      </span>
    </div>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────────

const GITHUB_URL = "https://github.com/YimingRen111/Token-Forest";

export function TopBar() {
  const t = useTranslations("TopBar");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_LINKS = [
    { label: t("home"), href: "/" as const },
    { label: t("download"), href: "/download" as const },
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
          <span className="text-base leading-none" aria-hidden>
            🌳
          </span>
          <span
            className="hidden font-pixel text-[11px] leading-none text-leaf-deep sm:block"
            style={{ textShadow: "1px 1px 0 rgb(0 0 0 / 20%)" }}
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
        <div className="flex shrink-0 items-center gap-2">
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
