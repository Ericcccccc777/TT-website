import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { LEADERBOARD_PAGE_SIZE, type LeaderboardEntry } from "@/lib/leaderboard";

/**
 * Fetchers for the two boards that sit alongside the token board:
 *
 *   /leaderboard/value   players ranked by what their collected tokens cost
 *   /leaderboard/usage   AI vendors — and models — ranked by tokens collected
 *
 * The ranking all comes from views (0017/0020 for value, 0021 for usage), read
 * through the anon client, so the public-read RLS on the base tables — bans
 * included — applies to these boards for free. `getValueBoard` additionally
 * joins the base `leaderboard` table for the display columns, which is RLS-
 * filtered the same way. Errors are returned, never thrown: a board that cannot
 * load degrades to an empty section rather than a 500.
 *
 * All aggregation happens in SQL. Nothing here pulls leaderboard_models into
 * Node; at 1e4 users x 10 models that is 1e5 rows per render.
 */

/*
 * Nothing here reads `leaderboard_attribution` any more.
 *
 * Both boards used to print how thin the per-model window is — the coverage
 * ratio, the date attribution started, and the count of players missing from the
 * value board — and the value board refused to render when that ratio could not
 * be read. All of it was removed by the product owner on 2026-08-08.
 *
 * The view is still there and still correct (0021), so the figures can be put
 * back as a display-layer change; the caveat worth keeping in mind meanwhile is
 * that these boards cover only tokens collected since 2026-07-29 and are not a
 * random sample of anyone's history.
 */

// ── Vendor / model usage ──────────────────────────────────────────────────────

export type ProviderUsage = {
  provider: string;
  tokens: number;
  models: number;
  players: number;
};

export type ModelUsage = {
  provider: string;
  model: string;
  tokens: number;
  players: number;
};

/** Every vendor with attributed usage, biggest first. A dozen rows at most. */
export async function getProviderUsage(): Promise<{
  rows: ProviderUsage[];
  error: string | null;
}> {
  try {
    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from("leaderboard_provider_usage")
      .select("provider, tokens, models, players")
      .order("tokens", { ascending: false })
      .order("provider", { ascending: true }); // stable tie-break

    if (error) return { rows: [], error: error.message };
    return {
      rows: (data ?? []).map((r) => ({
        provider: String(r.provider ?? ""),
        tokens: Number(r.tokens ?? 0),
        models: Number(r.models ?? 0),
        players: Number(r.players ?? 0),
      })),
      error: null,
    };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Models ranked by tokens, optionally narrowed to one vendor.
 *
 * The sort tie-breaks on `(provider, model)`, not `model`: the view groups on
 * that pair because a model *name* is copied verbatim out of a user's local logs
 * and the same string can legitimately appear under two vendors. Ordering by
 * `model` alone is not a total order, and rows would swap between pages.
 */
export async function getModelUsage(
  provider?: string,
  limit = 100,
): Promise<{ rows: ModelUsage[]; total: number; error: string | null }> {
  try {
    const client = getSupabaseServerClient();
    // `count: exact` so the page can say "top 100 of 340" instead of quietly
    // ending the list. Model IDs are open-ended user input, so the row count
    // grows without bound and a silent cut would read as "that is all of them".
    let q = client
      .from("leaderboard_model_usage")
      .select("provider, model, tokens, players", { count: "exact" })
      .order("tokens", { ascending: false })
      .order("provider", { ascending: true })
      .order("model", { ascending: true })
      .limit(limit);
    if (provider) q = q.eq("provider", provider);

    const { data, count, error } = await q;
    if (error) return { rows: [], total: 0, error: error.message };
    return {
      rows: (data ?? []).map((r) => ({
        provider: String(r.provider ?? ""),
        model: String(r.model ?? ""),
        tokens: Number(r.tokens ?? 0),
        players: Number(r.players ?? 0),
      })),
      total: count ?? 0,
      error: null,
    };
  } catch (e) {
    return { rows: [], total: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Value board ───────────────────────────────────────────────────────────────

export type ValueEntry = LeaderboardEntry & {
  valueUsd: number;
  /**
   * How much of valueUsd came from a borrowed (same-family) price. Not rendered
   * any more — the product owner dropped that line on 2026-08-12 and left the `≈`
   * prefix to carry the caveat. Still selected, because restoring the line is a
   * display-layer change.
   */
  estimatedUsd: number;
  unpricedTokens: number;
};

/**
 * One page of players ranked by what their collected tokens would have cost.
 *
 * Two round trips, not one: leaderboard_value is a view with no foreign key, so
 * PostgREST cannot embed leaderboard into it. The second call is a single
 * `in.(…)` over at most 50 ids.
 *
 * Who is missing, and who is not: players with no per-model rows at all are
 * absent from the view entirely, so they never rank here — they are not worth
 * $0, they are unmeasured. A player whose models are simply missing from the
 * price table *does* appear, at a real `$0.00`. The page has to say which is
 * which, or the empty-looking bottom of the board reads as a lie.
 */
export async function getValueBoard(page = 1): Promise<{
  entries: ValueEntry[];
  total: number;
  error: string | null;
}> {
  const p = Number.isInteger(page) && page > 0 ? page : 1;
  const from = (p - 1) * LEADERBOARD_PAGE_SIZE;
  const to = from + LEADERBOARD_PAGE_SIZE - 1;
  try {
    const client = getSupabaseServerClient();
    const { data, count, error } = await client
      .from("leaderboard_value")
      .select("user_id, value_usd, estimated_usd, unpriced_tokens", { count: "exact" })
      .order("value_usd", { ascending: false })
      .order("user_id", { ascending: true }) // total order, so pages never overlap
      .range(from, to);

    if (error) {
      // Same split as getLeaderboard: an offset past the end is a typed-in page
      // number, not an outage, and PostgREST reports both as an error. Without
      // this the value board's redirect cannot tell "page 9 of 3" from "the
      // database is down", and silently 307s a real failure to page 1.
      if (error.code === "PGRST103") {
        const { count: realCount, error: countError } = await client
          .from("leaderboard_value")
          .select("user_id", { count: "exact", head: true });
        if (countError) return { entries: [], total: 0, error: countError.message };
        return { entries: [], total: realCount ?? 0, error: null };
      }
      return { entries: [], total: 0, error: error.message };
    }

    const values = data ?? [];
    if (values.length === 0) return { entries: [], total: count ?? 0, error: null };

    const ids = values.map((v) => String(v.user_id));
    const { data: players, error: pErr } = await client
      .from("leaderboard")
      .select(
        "id, user_id, username, score, stage_index, tree, region, trees, created_at, updated_at",
      )
      // Join on user_id, NOT id. `leaderboard.id` is a surrogate key generated by
      // 0001; `leaderboard.user_id` is the auth identity added by 0002, and that
      // is what leaderboard_models — and therefore leaderboard_value — keys on.
      // Matching the wrong column silently returns nothing and the board renders
      // as "no data" forever.
      .in("user_id", ids);

    if (pErr) return { entries: [], total: 0, error: pErr.message };

    const byId = new Map((players ?? []).map((r) => [String(r.user_id), r]));
    const entries: ValueEntry[] = [];
    for (const v of values) {
      const row = byId.get(String(v.user_id));
      // No matching leaderboard row means RLS filtered it out of the second
      // query — the player is banned. Dropping the value row keeps them off this
      // board too, instead of showing a nameless entry.
      if (!row) continue;
      const tree = (row.tree as string | null) ?? "apple";
      const score = Number(row.score ?? 0);
      const stage = Number(row.stage_index ?? 0);
      entries.push({
        id: String(row.id),
        username: String(row.username ?? ""),
        score,
        stage_index: stage,
        tree,
        region: (row.region as string | null) ?? "",
        created_at: String(row.created_at ?? ""),
        updated_at: String(row.updated_at ?? ""),
        trees: [{ kind: tree, tokens: score, stage_index: stage }],
        valueUsd: Number(v.value_usd ?? 0),
        estimatedUsd: Number(v.estimated_usd ?? 0),
        unpricedTokens: Number(v.unpriced_tokens ?? 0),
      });
    }

    return { entries, total: count ?? 0, error: null };
  } catch (e) {
    return { entries: [], total: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
