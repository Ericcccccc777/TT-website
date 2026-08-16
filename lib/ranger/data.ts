import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

/** How long a row must sit un-synced before /ranger treats it as an abandoned orphan (safe to
 *  delete). The row's own updated_at is the only orphan signal an attacker cannot forge (they
 *  can't write a victim's row), so this staleness — not the client-writable prev_uid/score — is
 *  the gate. Single source of truth shared by the UI and deleteOrphanAction. */
export const ORPHAN_STALE_DAYS = 14;

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
  prevUid: string | null; // the uid this row superseded (set when a dead session re-signed-up), else null
  // Quarantine (migration 0016). `score` is already the public figure —
  // rawScore minus heldTokens — so nothing downstream needs to subtract.
  rawScore: number; // what the client says its total is
  heldTokens: number; // sum of the increases not being counted
  // Project showcase (0022) + the admin override (0025). Admin reads come from
  // the BASE table, not `leaderboard_public` — the whole point of this screen is
  // to see what a held player published before deciding whether to publish it.
  projectName: string | null;
  projectDesc: string | null;
  projectUrl: string | null;
  projectImage: string | null;
  /**
   * An admin has allowed this account's project despite its held gains.
   * `"unknown"` means the allowance read itself failed — never collapse that to
   * `false`, which would show a permissions failure as a decision an admin made.
   */
  projectAllowed: boolean | "unknown";
  /**
   * An admin has taken this account's project content down (0029): the server
   * refuses the four project fields on the player's next sync instead of
   * clearing them, because a clear does not survive — the client re-uploads the
   * same content the next time the score moves. Same `"unknown"` discipline as
   * `projectAllowed`, and for the same reason.
   *
   * Note the asymmetry with the allowance: an allowance only decides anything
   * for an account with held gains, but a block decides something for EVERY
   * account, including one that has published nothing — what it governs is the
   * next write, not the stored row.
   */
  projectBlocked: boolean | "unknown";
  blockReason: string | null;
  blockedAt: string | null;
};

/**
 * Full leaderboard for the admin table: every row (banned or not), newest-
 * cheating-suspects-visible, sorted by score desc, each annotated with its ban
 * status. Bypasses RLS via the service role key.
 */
export async function getRangerLeaderboard(): Promise<{
  rows: RangerRow[];
  deletableOrphanIds: string[];
  error: string | null;
}> {
  try {
    const admin = getSupabaseAdminClient();

    const [lb, bans, allows, blocks] = await Promise.all([
      admin
        .from("leaderboard")
        .select(
          "user_id, username, score, raw_score, held_tokens, tree, region, updated_at, created_at, prev_uid, project_name, project_desc, project_url, project_image",
        )
        .order("score", { ascending: false })
        .limit(500),
      admin.from("leaderboard_bans").select("user_id, reason, created_at"),
      admin.from("leaderboard_project_allowances").select("user_id"),
      admin.from("leaderboard_project_blocks").select("user_id, reason, created_at"),
    ]);

    if (lb.error) return { rows: [], deletableOrphanIds: [], error: lb.error.message };
    if (bans.error) return { rows: [], deletableOrphanIds: [], error: bans.error.message };

    // Non-fatal on purpose, and null (not an empty set) when the read failed.
    // The allowances table (0025) only annotates the project column; failing the
    // whole call over it would blank the board and take ban/unban and orphan
    // cleanup — features that predate this table — down with it. Same defensive
    // posture as the reviews fetch in getRangerUserDetail. Rows then report
    // their allowance as "unknown" rather than as a decision nobody made.
    const allowedUsers = allows.error
      ? null
      : new Set((allows.data ?? []).map((a) => a.user_id as string));

    // Same posture, same reason: the takedown table (0029) only annotates the
    // project column, and failing the whole call over it would take ban/unban
    // and orphan cleanup down with it. `null` — not an empty map — when the read
    // failed, so rows report "unknown" instead of "nobody has been blocked".
    const blockByUser = blocks.error
      ? null
      : new Map(
          (blocks.data ?? []).map((b) => [
            b.user_id as string,
            b as { reason: string | null; created_at: string },
          ]),
        );

    const banByUser = new Map(
      (bans.data ?? []).map((b) => [
        b.user_id as string,
        b as { reason: string | null; created_at: string },
      ]),
    );

    const rows: RangerRow[] = (lb.data ?? []).map((r) => {
      const ban = banByUser.get(r.user_id as string);
      const block = blockByUser?.get(r.user_id as string);
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
        prevUid: (r.prev_uid as string | null) ?? null,
        rawScore: Number(r.raw_score ?? r.score ?? 0),
        heldTokens: Number(r.held_tokens ?? 0),
        projectName: (r.project_name as string | null) ?? null,
        projectDesc: (r.project_desc as string | null) ?? null,
        projectUrl: (r.project_url as string | null) ?? null,
        projectImage: (r.project_image as string | null) ?? null,
        projectAllowed: allowedUsers ? allowedUsers.has(r.user_id as string) : "unknown",
        projectBlocked: blockByUser ? !!block : "unknown",
        blockReason: block?.reason ?? null,
        blockedAt: block?.created_at ?? null,
      };
    });

    // Which rows an admin may hard-delete as an abandoned orphan: something else claims to
    // supersede them (prev_uid, self-refs excluded) AND the row has itself gone stale. The row's
    // own updated_at is the only orphan signal an attacker cannot forge (they can't write a
    // victim's row), so a live/recent row is never deletable. Mirrors deleteOrphanAction's gate.
    const supersededUids = new Set<string>();
    for (const r of rows) if (r.prevUid && r.prevUid !== r.userId) supersededUids.add(r.prevUid);
    const staleBefore = Date.now() - ORPHAN_STALE_DAYS * 864e5;
    const deletableOrphanIds = rows
      .filter((r) => supersededUids.has(r.userId) && new Date(r.updatedAt).getTime() < staleBefore)
      .map((r) => r.userId);

    return { rows, deletableOrphanIds, error: null };
  } catch (e) {
    return { rows: [], deletableOrphanIds: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * One score-change snapshot for the admin per-user history view. Written by the
 * capture trigger (0006) on every score change; `flagged`/`reason` are enriched
 * later by the score-validation gate.
 *
 * The `bkt*` fields (0008) are the desktop client's evidence for HOW this delta
 * was earned: it buckets the tokens by the Claude Code log's own timestamps into
 * 5-minute windows and uploads four aggregates. Deliberately NOT the per-window
 * timeline — that would be a minute-by-minute record of when someone works and
 * sleeps. All four are null for clients older than the feature, and also when the
 * client's own ledger can't account for the full delta (it declines to assert a
 * summary it can't back). Null therefore means "no evidence", never "suspicious".
 */
export type HistoryEntry = {
  id: number;
  oldScore: number | null;
  newScore: number;
  delta: number;
  flagged: boolean;
  reason: string | null;
  at: string;
  bktN: number | null; // how many 5-minute windows this delta spans
  bktMax: number | null; // tokens in the busiest one
  bktSum: number | null; // Σ over all of them — must equal `delta`
  bktSpan: number | null; // seconds from earliest window to latest
  appVersion: string | null; // which client produced it
  trueDelta: number | null; // the real increase; `delta` restates the total on a re-insert
  quarantined: boolean; // not counted toward the public score
  holdReasons: string[];
  decidedBy: string | null; // a human ruled on this event; re-evaluation leaves it alone
  decidedAt: string | null;
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

    // The bucket-summary columns arrive with migration 0008. Ask for them, and if
    // the migration hasn't been applied yet fall back to the pre-0008 column set
    // rather than blanking the whole history view (same defensive posture as the
    // reviews fetch below). Once 0008 is live the first query simply succeeds.
    const HIST_BASE =
      "id, old_score, new_score, delta, true_delta, flagged, reason, at, quarantined, hold_reasons, decided_by, decided_at";
    const HIST_BKT = `${HIST_BASE}, bkt_n, bkt_max, bkt_sum, bkt_span, app_version`;
    const histQuery = (cols: string) =>
      admin
        .from("leaderboard_history")
        .select(cols)
        .eq("user_id", userId)
        .order("at", { ascending: false })
        .order("id", { ascending: false })
        .limit(200);

    const [lb, ban, histWide, allow, block] = await Promise.all([
      admin
        .from("leaderboard")
        .select(
          "user_id, username, score, raw_score, held_tokens, tree, region, updated_at, created_at, prev_uid, project_name, project_desc, project_url, project_image",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("leaderboard_bans")
        .select("reason, created_at")
        .eq("user_id", userId)
        .maybeSingle(),
      histQuery(HIST_BKT),
      admin
        .from("leaderboard_project_allowances")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("leaderboard_project_blocks")
        .select("reason, created_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const hist = histWide.error ? await histQuery(HIST_BASE) : histWide;

    if (lb.error) return { row: null, history: [], acknowledgedIds: [], error: lb.error.message };
    if (ban.error) return { row: null, history: [], acknowledgedIds: [], error: ban.error.message };
    if (hist.error)
      return { row: null, history: [], acknowledgedIds: [], error: hist.error.message };

    const r = lb.data;
    const b = ban.data as { reason: string | null; created_at: string } | null;
    // Non-fatal like the allowance beside it: a takedown record we cannot read
    // must not blank the history view. Kept null on error so the reason/date
    // below cannot be mistaken for "no block on file".
    const blk = block.error
      ? null
      : (block.data as { reason: string | null; created_at: string } | null);
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
          prevUid: (r.prev_uid as string | null) ?? null,
          rawScore: Number(r.raw_score ?? r.score ?? 0),
          heldTokens: Number(r.held_tokens ?? 0),
          projectName: (r.project_name as string | null) ?? null,
          projectDesc: (r.project_desc as string | null) ?? null,
          projectUrl: (r.project_url as string | null) ?? null,
          projectImage: (r.project_image as string | null) ?? null,
          // A failed read is NOT "no allowance": reporting it as one would make
          // the detail page offer an Allow button for an account that may
          // already be allowed, and that click would throw on the same error.
          projectAllowed: allow.error ? "unknown" : !!allow.data,
          // Same argument one step further: reporting an unreadable takedown as
          // "not blocked" would offer a Block button whose click throws on the
          // very error that produced the wrong state.
          projectBlocked: block.error ? "unknown" : !!blk,
          blockReason: blk?.reason ?? null,
          blockedAt: blk?.created_at ?? null,
        }
      : null;

    // `num` keeps "column absent (pre-0008)" and "column present but NULL (client
    // sent no summary)" collapsed into the same null — analysis treats both as
    // "no evidence" anyway.
    const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

    // Cast via unknown: the select string is built at runtime (wide vs. pre-0008
    // fallback), so the client can't infer a row type from it.
    const rawHistory = (hist.data ?? []) as unknown as Record<string, unknown>[];

    const history: HistoryEntry[] = rawHistory.map((h) => ({
      id: Number(h.id),
      oldScore: num(h.old_score),
      newScore: Number(h.new_score ?? 0),
      delta: Number(h.delta ?? 0),
      flagged: !!h.flagged,
      reason: (h.reason as string | null) ?? null,
      at: h.at as string,
      bktN: num(h.bkt_n),
      bktMax: num(h.bkt_max),
      bktSum: num(h.bkt_sum),
      bktSpan: num(h.bkt_span),
      appVersion: (h.app_version as string | null) ?? null,
      // Quarantine (0016). trueDelta is the real increase — `delta` restates the
      // whole score on a re-insert, so it must not be summed.
      trueDelta: num(h.true_delta),
      quarantined: !!h.quarantined,
      holdReasons: (h.hold_reasons as string[] | null) ?? [],
      decidedBy: (h.decided_by as string | null) ?? null,
      decidedAt: (h.decided_at as string | null) ?? null,
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

// ── Cross-user comparison series ──────────────────────────────────────────────

/** One player's token total over time, sampled daily, for the comparison chart. */
export type UserSeries = {
  key: string; // user_id
  name: string;
  banned: boolean;
  points: { t: number; v: number }[]; // t = ms epoch (UTC midnight), v = cumulative tokens
};

/**
 * Daily cumulative-token curves for the top `topN` players over the last `days`.
 *
 * Why the score is *carried forward* rather than plotted as raw points: leaderboard_history
 * only records rows when the score CHANGES. A player who takes a week off produces no rows,
 * and joining their last point straight to their next one would draw a slope through that
 * week — inventing growth that never happened. A cumulative total is a step function: it
 * holds flat until the next sync lands. So we sample each day at "the last score known on
 * or before that day", which is what actually stood on the board that day.
 *
 * A player's line starts on the day of their first history row, not at the left edge —
 * a flat zero run before someone joined would be a lie about when they existed.
 *
 * Capped at MAX_SERIES (8): a 9th categorical hue would be indistinguishable under CVD.
 */
export async function getRangerTokenSeries(
  days = 30,
  topN = 8,
): Promise<{ series: UserSeries[]; error: string | null }> {
  try {
    const admin = getSupabaseAdminClient();
    const sinceMs = Date.now() - days * 864e5;

    const [lb, bans] = await Promise.all([
      admin
        .from("leaderboard")
        .select("user_id, username, score")
        .order("score", { ascending: false })
        .limit(topN),
      admin.from("leaderboard_bans").select("user_id"),
    ]);
    if (lb.error) return { series: [], error: lb.error.message };

    const top = (lb.data ?? []) as { user_id: string; username: string | null }[];
    if (top.length === 0) return { series: [], error: null };

    const ids = top.map((r) => r.user_id);
    const bannedIds = new Set((bans.data ?? []).map((b) => b.user_id as string));

    // Every history row for these players — including ones older than the window, because
    // the day the window opens needs a score to carry forward from.
    const hist = await admin
      .from("leaderboard_history")
      .select("user_id, new_score, at")
      .in("user_id", ids)
      .order("at", { ascending: true })
      .limit(5000);
    if (hist.error) return { series: [], error: hist.error.message };

    const byUser = new Map<string, { t: number; v: number }[]>();
    for (const h of (hist.data ?? []) as { user_id: string; new_score: number; at: string }[]) {
      const arr = byUser.get(h.user_id) ?? [];
      arr.push({ t: new Date(h.at).getTime(), v: Number(h.new_score ?? 0) });
      byUser.set(h.user_id, arr);
    }

    const dayMs = 864e5;
    const firstDay = Math.floor(sinceMs / dayMs) * dayMs;
    const lastDay = Math.floor(Date.now() / dayMs) * dayMs;

    const series: UserSeries[] = top.map((r) => {
      const raw = byUser.get(r.user_id) ?? [];
      const points: { t: number; v: number }[] = [];
      let i = 0;
      let carried: number | null = null;
      for (let day = firstDay; day <= lastDay; day += dayMs) {
        const cutoff = day + dayMs; // "known by the end of this day"
        while (i < raw.length && raw[i].t < cutoff) carried = raw[i++].v;
        if (carried !== null) points.push({ t: day, v: carried });
      }
      return {
        key: r.user_id,
        name: r.username?.trim() || `#${r.user_id.slice(0, 6)}`,
        banned: bannedIds.has(r.user_id),
        points,
      };
    });

    return { series: series.filter((s) => s.points.length > 0), error: null };
  } catch (e) {
    return { series: [], error: e instanceof Error ? e.message : String(e) };
  }
}
