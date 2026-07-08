import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const GITHUB_URL = "https://github.com/Ericcccccc777/Token-Forest-P";

export async function Footer() {
  const t = await getTranslations("Footer");
  const currentYear = new Date().getFullYear();

  const PRODUCT_LINKS = [
    { label: t("download"), href: "/download" },
    { label: t("dashboard"), href: "/dashboard" },
    { label: t("leaderboard"), href: "/leaderboard" },
  ] as const;

  const PROJECT_LINKS = [
    { label: "GitHub", href: GITHUB_URL, external: true },
    { label: t("roadmap"), href: "/#roadmap", external: false },
  ] as const;

  return (
    <footer className="border-t-2 bg-surface-ui" style={{ borderTopColor: "var(--color-soil)" }}>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1fr_auto_auto] sm:gap-8 lg:gap-16">
          {/* ── Brand column ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <Image
                src="/sprites/AppleTree_1.png"
                alt=""
                width={20}
                height={20}
                className="pixelated h-5 w-5 shrink-0"
                aria-hidden
              />
              <span
                className="font-pixel text-small text-[var(--color-text-cream)]"
                aria-label="Token-Forest"
              >
                Token-Forest
              </span>
            </div>
            <p className="max-w-[22ch] font-body text-small leading-relaxed text-[var(--color-text-muted-dark)]">
              {t("tagline")}
            </p>
            <p
              className="font-body text-caption text-[var(--color-text-muted-dark)]"
              style={{ fontSize: "0.6875rem" }}
            >
              {t("privacyBadge")}
            </p>
          </div>

          {/* ── Product column ── */}
          <div className="flex flex-col gap-3">
            <h2
              className="font-pixel text-caption text-[var(--color-text-cream)]"
              style={{ fontSize: "0.6875rem" }}
            >
              {t("product")}
            </h2>
            <nav className="flex flex-col gap-2" aria-label={t("productNavAriaLabel")}>
              {PRODUCT_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="font-body text-small text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:text-leaf-light"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* ── Project column ── */}
          <div className="flex flex-col gap-3">
            <h2
              className="font-pixel text-caption text-[var(--color-text-cream)]"
              style={{ fontSize: "0.6875rem" }}
            >
              {t("project")}
            </h2>
            <nav className="flex flex-col gap-2" aria-label={t("projectNavAriaLabel")}>
              {PROJECT_LINKS.map(({ label, href, external }) => (
                <a
                  key={href}
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="font-body text-small text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:text-leaf-light"
                >
                  {label}
                  {external && (
                    <span className="ml-0.5 opacity-50" aria-hidden>
                      ↗
                    </span>
                  )}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* ── Bottom row: copyright ── */}
        <div className="mt-8 border-t border-soil/40 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="font-body text-small text-[var(--color-text-muted-dark)]">
              {t("copyright", { year: currentYear })}
            </p>
            <nav className="flex items-center gap-4" aria-label={t("legalNavAriaLabel")}>
              <Link
                href="/privacy"
                className="font-body text-small text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:text-leaf-light"
              >
                {t("privacy")}
              </Link>
              <Link
                href="/security"
                className="font-body text-small text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:text-leaf-light"
              >
                {t("security")}
              </Link>
            </nav>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-body text-small text-[var(--color-text-muted-dark)] transition-colors duration-100 hover:text-leaf-light"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
              {t("openSourceOnGithub")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
