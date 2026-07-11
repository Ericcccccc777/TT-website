import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * One leaderboard row as the admin sees it — includes fields hidden from the
 * public board (user_id) plus the ban status. SERVER-ONLY: uses the service
 * role client, so callers MUST verify the admin session first.
 */
export type RangerRow = {
  userId: string;
  username: string;
  score: number;
  tree: string;
  region: string;
  updatedAt: string;
  createdAt: string;
  banned: boolean;
  banReason: string | null;
  bannedAt: string | null;
};

/**
 * Full leaderboard for the admin table: every row (banned or not), newest-
 * cheating-suspects-visible, sorted by score desc, each annotated with its ban
 * status. Bypasses RLS via the service role key.
 */
export async function getRangerLeaderboard(): Promise<{ rows: RangerRow[]; error: string | null }> {
  try {
    const admin = getSupabaseAdminClient();

    const [lb, bans] = await Promise.all([
      admin
        .from("leaderboard")
        .select("user_id, username, score, tree, region, updated_at, created_at")
        .order("score", { ascending: false })
        .limit(500),
      admin.from("leaderboard_bans").select("user_id, reason, created_at"),
    ]);

    if (lb.error) return { rows: [], error: lb.error.message };
    if (bans.error) return { rows: [], error: bans.error.message };

    const banByUser = new Map(
      (bans.data ?? []).map((b) => [
        b.user_id as string,
        b as { reason: string | null; created_at: string },
      ]),
    );

    const rows: RangerRow[] = (lb.data ?? []).map((r) => {
      const ban = banByUser.get(r.user_id as string);
      return {
        userId: r.user_id as string,
        username: (r.username as string | null) ?? "",
        score: Number(r.score ?? 0),
        tree: (r.tree as string | null) ?? "apple",
        region: (r.region as string | null) ?? "",
        updatedAt: r.updated_at as string,
        createdAt: r.created_at as string,
        banned: !!ban,
        banReason: ban?.reason ?? null,
        bannedAt: ban?.created_at ?? null,
      };
    });

    return { rows, error: null };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * One score-change snapshot for the admin per-user history view. Written by the
 * capture trigger (0006) on every score change; `flagged`/`reason` are enriched
 * later by the score-validation gate.
 */
export type HistoryEntry = {
  id: number;
  oldScore: number | null;
  newScore: number;
  delta: number;
  flagged: boolean;
  reason: string | null;
  at: string;
};

/** A single user's admin detail: their leaderboard row + ban status + history. */
export type RangerUserDetail = {
  row: RangerRow | null;
  history: HistoryEntry[];
  acknowledgedIds: number[];
  error: string | null;
};

/**
 * Everything the /ranger/[userId] detail page needs, via the service-role client
 * (bypasses RLS — the caller MUST verify the admin session first). Returns the
 * user's full leaderboard row (incl. rows hidden from the public), their ban
 * status, and their score-change history newest-first.
 */
export async function getRangerUserDetail(userId: string): Promise<RangerUserDetail> {
  try {
    const admin = getSupabaseAdminClient();

    const [lb, ban, hist] = await Promise.all([
      admin
        .from("leaderboard")
        .select("user_id, username, score, tree, region, updated_at, created_at")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("leaderboard_bans")
        .select("reason, created_at")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("leaderboard_history")
        .select("id, old_score, new_score, delta, flagged, reason, at")
        .eq("user_id", userId)
        .order("at", { ascending: false })
        .order("id", { ascending: false })
        .limit(200),
    ]);

    if (lb.error) return { row: null, history: [], acknowledgedIds: [], error: lb.error.message };
    if (ban.error) return { row: null, history: [], acknowledgedIds: [], error: ban.error.message };
    if (hist.error) return { row: null, history: [], acknowledgedIds: [], error: hist.error.message };

    const r = lb.data;
    const b = ban.data as { reason: string | null; created_at: string } | null;
    const row: RangerRow | null = r
      ? {
          userId: r.user_id as string,
          username: (r.username as string | null) ?? "",
          score: Number(r.score ?? 0),
          tree: (r.tree as string | null) ?? "apple",
          region: (r.region as string | null) ?? "",
          updatedAt: r.updated_at as string,
          createdAt: r.created_at as string,
          banned: !!b,
          banReason: b?.reason ?? null,
          bannedAt: b?.created_at ?? null,
        }
      : null;

    const history: HistoryEntry[] = (hist.data ?? []).map((h) => ({
      id: Number(h.id),
      oldScore: h.old_score === null || h.old_score === undefined ? null : Number(h.old_score),
      newScore: Number(h.new_score ?? 0),
      delta: Number(h.delta ?? 0),
      flagged: !!h.flagged,
      reason: (h.reason as string | null) ?? null,
      at: h.at as string,
    }));

    // Which of these history rows an admin has already reviewed-OK.
    const historyIds = history.map((h) => h.id);
    let acknowledgedIds: number[] = [];
    if (historyIds.length) {
      // Non-fatal: if the reviews table (migration 0007) isn't applied yet, show
      // no acknowledgements rather than breaking the whole history view. The
      // "Mark OK" button still needs 0007 to persist a click.
      const rev = await admin
        .from("leaderboard_history_reviews")
        .select("history_id")
        .in("history_id", historyIds);
      if (!rev.error) acknowledgedIds = (rev.data ?? []).map((r) => Number(r.history_id));
    }

    return { row, history, acknowledgedIds, error: null };
  } catch (e) {
    return {
      row: null,
      history: [],
      acknowledgedIds: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
