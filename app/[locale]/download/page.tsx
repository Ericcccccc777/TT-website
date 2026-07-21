import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { BreadcrumbJsonLd, SoftwareAppJsonLd } from "@/components/json-ld";

// 每次发版只改这一处;platformLine 文案会显示它。
const APP_VERSION = "v0.1.8";
const GITHUB_REPO = "https://github.com/Ericcccccc777/Poietic-TokenForest";
const GITHUB_RELEASES = `${GITHUB_REPO}/releases`;
// 平台安装包直链:始终指向最新 Release 的同名资产。
// 资产由 Token-Forest 本体仓的 GitHub Actions 打包(TokenForest-windows.zip / TokenForest-macos.dmg),
// 手动上传到本仓(Poietic-TokenForest)的 Release。文件名须与此处一致。
const DL_WINDOWS = `${GITHUB_RELEASES}/latest/download/TokenForest-windows.zip`;
const DL_MACOS = `${GITHUB_RELEASES}/latest/download/TokenForest-macos.dmg`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata("/download", locale as Locale);
}

export default async function DownloadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DownloadPage");
  const tnav = await getTranslations("TopBar");

  return (
    <div className="min-h-screen bg-surface-parchment">
      <SoftwareAppJsonLd locale={locale as Locale} />
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[
          { name: tnav("home"), path: "/" },
          { name: tnav("download"), path: "/download" },
        ]}
      />
      {/* ── Hero strip ── */}
      <div className="bg-day-sky">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
          <Image
            src="/sprites/AppleTree_8.png"
            alt={t("heroTreeAlt")}
            width={120}
            height={130}
            className="pixelated mb-6 drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)]"
            priority
          />
          <h1
            className="text-leaf-deep"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-display)",
              lineHeight: 1.25,
              /* shadow-pixel-leaf is the same green as the text, causing a
                 doubled / garbled look on the sky background. Use a dark
                 drop shadow instead for a clean pixel pop. */
              textShadow: "2px 2px 0 rgba(0,0,0,0.22)",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
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

          {/* Windows / macOS 安装包直链 + GitHub follow CTA */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={DL_WINDOWS}
              className="inline-flex items-center gap-2.5 rounded-[2px] bg-leaf-deep px-5 py-3 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
              </svg>
              {t("windowsBtn")}
            </a>
            <a
              href={DL_MACOS}
              className="inline-flex items-center gap-2.5 rounded-[2px] bg-leaf-deep px-5 py-3 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
              {t("macBtn")}
            </a>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-[2px] bg-leaf-deep px-5 py-3 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
              {t("githubFollowBtn")}
            </a>
          </div>

          <p
            className="mt-3 text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            {t("platformLine", { version: APP_VERSION })}
          </p>

          {/* macOS/Windows 首次打开指引(未签名 App 放行步骤 + 截图) */}
          <details
            className="mt-6 w-full max-w-xl rounded-[2px] bg-surface-card p-4 text-left"
            style={{ border: "var(--border-pixel)" }}
          >
            <summary
              className="cursor-pointer text-leaf-deep"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              {t("macGuideSummary")}
            </summary>
            <div
              className="mt-3 text-text-muted-light"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)", lineHeight: 1.6 }}
            >
              <p>{t("macGuideIntro")}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>{t("macGuideStep1")}</li>
                <li>{t("macGuideStep2")}</li>
                <li>{t("macGuideStep3")}</li>
                <li>{t("macGuideStep4")}</li>
              </ol>
              <Image
                src="/download_guide_1.png"
                alt={t("macGuideImg1Alt")}
                width={418}
                height={72}
                className="mt-3 h-auto w-full max-w-md rounded-[2px]"
                style={{ border: "var(--border-pixel)" }}
              />
              <Image
                src="/download_guide_2.png"
                alt={t("macGuideImg2Alt")}
                width={948}
                height={338}
                className="mt-3 h-auto w-full rounded-[2px]"
                style={{ border: "var(--border-pixel)" }}
              />
              <p className="mt-4">{t("winGuideNote")}</p>
            </div>
          </details>
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
            <QuickstartStep num="02" title={t("step02Title")} body={t("step02Body")} />

            {/* Step 3 */}
            <QuickstartStep num="03" title={t("step03Title")} body={t("step03Body")} />
          </div>

          {/* packaging status note */}
          <div className="mt-8 rounded-[2px] border border-leaf-deep/50 bg-surface-panel px-5 py-4">
            <div
              className="mb-1 text-leaf-light"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              {t("betaLabel")}
            </div>
            <p
              className="text-text-muted-dark"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
            >
              {t("betaBody")}
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
            alt=""
            width={32}
            height={32}
            className="pixelated opacity-70"
            style={{ width: 32, height: 32, objectFit: "contain" }}
            aria-hidden
          />
          <p
            className="text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            {t("githubBody")}
          </p>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-leaf-deep underline underline-offset-2 hover:text-accent-gold"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            GitHub
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
