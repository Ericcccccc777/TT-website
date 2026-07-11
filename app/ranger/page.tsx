import type { Metadata } from "next";
import Link from "next/link";
import { getAdminUser } from "@/lib/ranger/auth";
import { getRangerLeaderboard } from "@/lib/ranger/data";
import { getRangerLang, t } from "@/lib/ranger/i18n";
import { RangerLoginForm } from "@/components/ranger/login-form";
import { RangerLangSwitcher } from "@/components/ranger/lang-switcher";
import { banAction, signOutAction, unbanAction } from "./actions";

// Admin console — never indexed, never cached, always request-time (cookies).
export const metadata: Metadata = {
  title: "Ranger — Leaderboard moderation",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function fmtTokens(n: number): string {
  return n.toLocaleString("en");
}

function fmtWhen(iso: string): string {
  return iso ? iso.replace("T", " ").slice(0, 16) + " UTC" : "—";
}

const CELL = { border: "1px solid var(--color-soil)" } as const;

export default async function RangerPage() {
  const admin = await getAdminUser();
  const lang = await getRangerLang();

  // ── Not signed in (or not an allow-listed admin) → login card ──
  if (!admin) {
    return (
      <main className="min-h-screen bg-surface-parchment">
        <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-leaf-deep"
                style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)", lineHeight: 1.3 }}
              >
                {t(lang, "brand")}
              </h1>
              <p className="mt-2 font-body text-small text-[var(--color-text-muted-light)]">
                {t(lang, "subtitle")}
              </p>
            </div>
            <RangerLangSwitcher current={lang} />
          </div>
          <RangerLoginForm />
        </div>
      </main>
    );
  }

  // ── Signed in as admin → moderation table ──
  const { rows, error } = await getRangerLeaderboard();
  const bannedCount = rows.filter((r) => r.banned).length;

  return (
    <main className="min-h-screen bg-surface-parchment">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1
              className="text-leaf-deep"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)", lineHeight: 1.3 }}
            >
              {t(lang, "brand")}
            </h1>
            <p className="mt-1 font-body text-small text-[var(--color-text-muted-light)]">
              {t(lang, "listStats", { n: rows.length, m: bannedCount, email: admin.email ?? "" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RangerLangSwitcher current={lang} />
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-[2px] bg-surface-card px-4 py-2 text-text-forest shadow-pixel-sm"
                style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-small)", border: "var(--border-pixel)" }}
              >
                {t(lang, "signOut")}
              </button>
            </form>
          </div>
        </header>

        {error && (
          <p
            className="mt-6 rounded-[2px] bg-surface-card px-4 py-3 font-body text-small text-red-700"
            style={{ border: "var(--border-pixel)" }}
          >
            {t(lang, "listLoadError", { e: error })}
          </p>
        )}

        <div className="mt-8 overflow-x-auto">
          <table
            className="w-full border-collapse text-left"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            <thead>
              <tr>
                {[
                  t(lang, "thNum"),
                  t(lang, "thUser"),
                  t(lang, "thTokens"),
                  t(lang, "thRegion"),
                  t(lang, "thLastActive"),
                  t(lang, "thUserId"),
                  t(lang, "thAction"),
                ].map((h, i) => (
                  <th key={i} className="bg-surface-card px-3 py-2 text-leaf-deep" style={CELL}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-text-muted-light">
              {rows.map((r, i) => (
                <tr key={r.userId} style={{ opacity: r.banned ? 0.55 : 1 }}>
                  <td className="px-3 py-2 align-top" style={CELL}>
                    {i + 1}
                  </td>
                  <td className="px-3 py-2 align-top text-text-forest" style={CELL}>
                    {r.username || "—"}
                    {r.banned && (
                      <span className="ml-2 rounded-[2px] bg-red-700 px-1.5 py-0.5 text-[10px] text-white">
                        {t(lang, "hiddenBadge")}
                      </span>
                    )}
                    {r.banned && r.banReason && (
                      <div className="mt-0.5 text-[11px] opacity-70">{r.banReason}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top" style={CELL}>
                    {fmtTokens(r.score)}
                  </td>
                  <td className="px-3 py-2 align-top" style={CELL}>
                    {r.region || "—"}
                  </td>
                  <td className="px-3 py-2 align-top" style={CELL}>
                    {fmtWhen(r.updatedAt)}
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-[11px]" style={CELL}>
                    <Link
                      href={`/ranger/${r.userId}`}
                      className="text-leaf-deep underline underline-offset-2"
                      title={t(lang, "viewHistory")}
                    >
                      {r.userId.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-top" style={CELL}>
                    {r.banned ? (
                      <form action={unbanAction}>
                        <input type="hidden" name="userId" value={r.userId} />
                        <button
                          type="submit"
                          className="rounded-[2px] bg-leaf-deep px-3 py-1 text-text-cream"
                          style={{ fontFamily: "var(--font-pixel)", fontSize: 10 }}
                        >
                          {t(lang, "unhide")}
                        </button>
                      </form>
                    ) : (
                      <form action={banAction} className="flex flex-wrap items-center gap-1.5">
                        <input type="hidden" name="userId" value={r.userId} />
                        <input
                          type="text"
                          name="reason"
                          placeholder={t(lang, "reasonPh")}
                          className="w-28 rounded-[2px] bg-surface-card px-2 py-1 text-[11px] text-text-forest"
                          style={CELL}
                        />
                        <button
                          type="submit"
                          className="rounded-[2px] bg-red-700 px-3 py-1 text-white"
                          style={{ fontFamily: "var(--font-pixel)", fontSize: 10 }}
                        >
                          {t(lang, "hide")}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center" style={CELL}>
                    {t(lang, "noEntries")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 font-body text-[11px] text-[var(--color-text-muted-light)]">
          {t(lang, "listFooter")}
        </p>
      </div>
    </main>
  );
}
