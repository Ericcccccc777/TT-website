import type { Metadata } from "next";
import { getAdminUser } from "@/lib/ranger/auth";
import { getRangerLeaderboard } from "@/lib/ranger/data";
import { RangerLoginForm } from "@/components/ranger/login-form";
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
  // Fixed, locale-independent rendering (no Date.now needed).
  return iso ? iso.replace("T", " ").slice(0, 16) + " UTC" : "—";
}

export default async function RangerPage() {
  const admin = await getAdminUser();

  // ── Not signed in (or not an allow-listed admin) → login card ──
  if (!admin) {
    return (
      <main className="min-h-screen bg-surface-parchment">
        <div className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
          <div>
            <h1
              className="text-leaf-deep"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-h1)",
                lineHeight: 1.3,
              }}
            >
              Ranger
            </h1>
            <p className="mt-2 font-body text-small text-[var(--color-text-muted-light)]">
              Leaderboard moderation. Authorized admins only.
            </p>
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
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-h1)",
                lineHeight: 1.3,
              }}
            >
              Ranger
            </h1>
            <p className="mt-1 font-body text-small text-[var(--color-text-muted-light)]">
              {rows.length} entries · {bannedCount} hidden · signed in as {admin.email}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-[2px] bg-surface-card px-4 py-2 text-text-forest shadow-pixel-sm"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-small)",
                border: "var(--border-pixel)",
              }}
            >
              Sign out
            </button>
          </form>
        </header>

        {error && (
          <p
            className="mt-6 rounded-[2px] bg-surface-card px-4 py-3 font-body text-small text-red-700"
            style={{ border: "var(--border-pixel)" }}
          >
            Could not load the leaderboard: {error}. Check that SUPABASE_SERVICE_ROLE_KEY is set and
            the 0005 migration is applied.
          </p>
        )}

        <div className="mt-8 overflow-x-auto">
          <table
            className="w-full border-collapse text-left"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            <thead>
              <tr>
                {["#", "User", "Tokens", "Region", "Last active", "User ID", "Action"].map((h) => (
                  <th
                    key={h}
                    className="bg-surface-card px-3 py-2 text-leaf-deep"
                    style={{ border: "1px solid var(--color-soil)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-text-muted-light">
              {rows.map((r, i) => (
                <tr key={r.userId} style={{ opacity: r.banned ? 0.55 : 1 }}>
                  <td
                    className="px-3 py-2 align-top"
                    style={{ border: "1px solid var(--color-soil)" }}
                  >
                    {i + 1}
                  </td>
                  <td
                    className="px-3 py-2 align-top text-text-forest"
                    style={{ border: "1px solid var(--color-soil)" }}
                  >
                    {r.username || "—"}
                    {r.banned && (
                      <span className="ml-2 rounded-[2px] bg-red-700 px-1.5 py-0.5 text-[10px] text-white">
                        HIDDEN
                      </span>
                    )}
                    {r.banned && r.banReason && (
                      <div className="mt-0.5 text-[11px] opacity-70">{r.banReason}</div>
                    )}
                  </td>
                  <td
                    className="px-3 py-2 align-top"
                    style={{ border: "1px solid var(--color-soil)" }}
                  >
                    {fmtTokens(r.score)}
                  </td>
                  <td
                    className="px-3 py-2 align-top"
                    style={{ border: "1px solid var(--color-soil)" }}
                  >
                    {r.region || "—"}
                  </td>
                  <td
                    className="px-3 py-2 align-top"
                    style={{ border: "1px solid var(--color-soil)" }}
                  >
                    {fmtWhen(r.updatedAt)}
                  </td>
                  <td
                    className="px-3 py-2 align-top font-mono text-[11px]"
                    style={{ border: "1px solid var(--color-soil)" }}
                  >
                    {r.userId.slice(0, 8)}…
                  </td>
                  <td
                    className="px-3 py-2 align-top"
                    style={{ border: "1px solid var(--color-soil)" }}
                  >
                    {r.banned ? (
                      <form action={unbanAction}>
                        <input type="hidden" name="userId" value={r.userId} />
                        <button
                          type="submit"
                          className="rounded-[2px] bg-leaf-deep px-3 py-1 text-text-cream"
                          style={{ fontFamily: "var(--font-pixel)", fontSize: 10 }}
                        >
                          Unhide
                        </button>
                      </form>
                    ) : (
                      <form action={banAction} className="flex flex-wrap items-center gap-1.5">
                        <input type="hidden" name="userId" value={r.userId} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="reason (optional)"
                          className="w-28 rounded-[2px] bg-surface-card px-2 py-1 text-[11px] text-text-forest"
                          style={{ border: "1px solid var(--color-soil)" }}
                        />
                        <button
                          type="submit"
                          className="rounded-[2px] bg-red-700 px-3 py-1 text-white"
                          style={{ fontFamily: "var(--font-pixel)", fontSize: 10 }}
                        >
                          Hide
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center"
                    style={{ border: "1px solid var(--color-soil)" }}
                  >
                    No leaderboard entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 font-body text-[11px] text-[var(--color-text-muted-light)]">
          Hiding is keyed on the user&apos;s account ID, so renaming or changing region does not
          restore them. The row is kept but filtered out of the public leaderboard and global stats.
        </p>
      </div>
    </main>
  );
}
