import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

const GITHUB_RELEASES = "https://github.com/YimingRen111/Token-Forest/releases";

export default async function DownloadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DownloadPage");

  return (
    <div className="min-h-screen bg-surface-parchment">
      {/* ── Hero strip ── */}
      <div className="bg-day-sky">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
          <Image
            src="/sprites/AppleTree_8.png"
            alt={t("heroTreeAlt")}
            width={120}
            height={160}
            className="pixelated mb-6 drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)]"
            priority
          />
          <h1
            className="text-leaf-deep"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-display)",
              lineHeight: 1.25,
              textShadow: "var(--shadow-pixel-leaf)",
            }}
          >
            {t("heroHeading")}
          </h1>
          <p
            className="mt-4 max-w-md text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)" }}
          >
            {t("heroBody")}
          </p>

          {/* OS pill buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={GITHUB_RELEASES}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-[2px] bg-leaf-deep px-5 py-3 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
              </svg>
              {t("windowsBtn")}
            </a>
            <a
              href={GITHUB_RELEASES}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-[2px] px-5 py-3 shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                background: "var(--color-surface-card)",
                border: "var(--border-pixel)",
                color: "var(--color-text-forest)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect
                  x="2"
                  y="3"
                  width="20"
                  height="15"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M7 8l3 3-3 3M13 14h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                />
              </svg>
              {t("macLinuxBtn")}
            </a>
          </div>

          <p
            className="mt-3 text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            {t("platformLine")}
          </p>
        </div>
      </div>

      {/* ── What is Token-Forest ── */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <SectionHeading>{t("whatIsHeading")}</SectionHeading>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: "🌱", label: t("petLabel"), body: t("petBody") },
            { icon: "🫧", label: t("visualLabel"), body: t("visualBody") },
            { icon: "🔒", label: t("privacyLabel"), body: t("privacyBody") },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[2px] bg-surface-card p-5"
              style={{ border: "var(--border-pixel)" }}
            >
              <div className="mb-2 text-2xl leading-none">{card.icon}</div>
              <div
                className="mb-1 text-leaf-deep"
                style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
              >
                {card.label}
              </div>
              <div
                className="text-text-muted-light"
                style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
              >
                {card.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Windows quickstart ── */}
      <section className="bg-surface-forest">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <SectionHeading light>{t("windowsHeading")}</SectionHeading>
          <div className="mt-6 space-y-6">
            {/* Step 1 */}
            <QuickstartStep
              num="01"
              title={t("step01Title")}
              body={t.rich("step01Body", {
                link: (chunks) => (
                  <a
                    href={GITHUB_RELEASES}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-leaf-light underline underline-offset-2 hover:text-accent-gold"
                  >
                    {chunks}
                  </a>
                ),
                code: (chunks) => (
                  <code
                    className="rounded-[2px] px-1 text-leaf-light"
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "var(--text-caption)",
                      background: "var(--color-surface-deepest)",
                    }}
                  >
                    {chunks}
                  </code>
                ),
              })}
            />

            {/* Step 2 */}
            <QuickstartStep num="02" title={t("step02Title")} body={t("step02Body")}>
              <TerminalBlock command=".\setup.ps1" />
              <p
                className="mt-2 text-text-muted-dark"
                style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
              >
                {t("step02Note")}
              </p>
            </QuickstartStep>

            {/* Step 3 */}
            <QuickstartStep num="03" title={t("step03Title")} body={t("step03Body")}>
              <TerminalBlock command=".\run.ps1" />
              <p
                className="mt-2 text-text-muted-dark"
                style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
              >
                {t("step03Note")}
              </p>
            </QuickstartStep>
          </div>

          {/* macOS / Linux note */}
          <div className="mt-8 rounded-[2px] border border-leaf-deep/50 bg-surface-panel px-5 py-4">
            <div
              className="mb-1 text-leaf-light"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              {t("macLinuxLabel")}
            </div>
            <p
              className="text-text-muted-dark"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
            >
              {t.rich("macLinuxBody", {
                code: (chunks) => (
                  <code
                    className="rounded-[2px] px-1.5 py-0.5 text-leaf-light"
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "var(--text-caption)",
                      background: "var(--color-surface-deepest)",
                    }}
                  >
                    {chunks}
                  </code>
                ),
              })}
            </p>
          </div>
        </div>
      </section>

      {/* ── System requirements ── */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <SectionHeading>{t("sysReqHeading")}</SectionHeading>
        <ul
          className="mt-4 space-y-2 text-text-muted-light"
          style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)" }}
        >
          {([t("sysReq0"), t("sysReq1"), t("sysReq2"), t("sysReq3")] as string[]).map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 text-leaf-light">✦</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── GitHub CTA ── */}
      <section className="border-t" style={{ borderColor: "var(--color-soil)" }}>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-6 py-10 text-center">
          <Image
            src="/sprites/AppleTree_1.png"
            alt="seedling"
            width={32}
            height={32}
            className="pixelated opacity-70"
          />
          <p
            className="text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            {t("githubBody")}
          </p>
          <a
            href={GITHUB_RELEASES}
            target="_blank"
            rel="noopener noreferrer"
            className="text-leaf-deep underline underline-offset-2 hover:text-accent-gold"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            github.com/YimingRen111/Token-Forest
          </a>
        </div>
      </section>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeading({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <h2
      className={light ? "text-leaf-light" : "text-leaf-deep"}
      style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)", lineHeight: 1.3 }}
    >
      {children}
    </h2>
  );
}

function QuickstartStep({
  num,
  title,
  body,
  children,
}: {
  num: string;
  title: string;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span
        className="shrink-0 text-accent-gold"
        style={{ fontFamily: "var(--font-brand)", fontSize: "var(--text-counter)", lineHeight: 1 }}
      >
        {num}
      </span>
      <div className="flex-1">
        <div
          className="mb-1 text-text-cream"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
        >
          {title}
        </div>
        <div
          className="text-text-muted-dark"
          style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)" }}
        >
          {body}
        </div>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

function TerminalBlock({ command }: { command: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-[2px] px-4 py-3"
      style={{
        background: "var(--color-surface-deepest)",
        border: "2px solid var(--color-leaf-deep)",
      }}
    >
      <span
        className="select-none text-text-muted-dark"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
      >
        PS&gt;
      </span>
      <code
        className="flex-1 text-leaf-light"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-small)" }}
      >
        {command}
      </code>
      <span
        className="animate-cursor-blink text-leaf-light"
        aria-hidden
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
      >
        ▌
      </span>
    </div>
  );
}
