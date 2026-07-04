import { getSupabaseServerClient } from "@/lib/supabase/server-client";

// ── Types ─────────────────────────────────────────────────────────────────────

/** One of a user's trees, from the desktop app's per-tree snapshot. */
export type TreeSnapshot = {
  kind: string; // species: "apple" | "cherry" | "cactus" | …
  tokens: number; // this tree's OWN token total
  stage_index: number; // 0–7, this tree's own growth stage
};

export type LeaderboardEntry = {
  id: string;
  username: string;
  score: number; // bigint in DB; JS number is safe up to 2^53. = grand total across all trees.
  stage_index: number; // 0–7, mirrors the 8 desktop app growth stages (the current tree's stage)
  tree: string; // current/main tree species: "apple" | "cherry" | … (defaults to "apple")
  region: string; // ISO 3166-1 alpha-2 country code, or "" if unset
  created_at: string;
  updated_at: string;
  /**
   * Per-tree breakdown, MAIN (current) tree first, then the user's other grown
   * trees by token count. Each carries its own token total + stage. Derived from
   * the DB `trees` jsonb ({ kind: {tokens, stage} }); falls back to a single
   * entry built from the top-level fields when `trees` is empty (legacy rows /
   * app builds that predate the column).
   */
  trees: TreeSnapshot[];
};

/**
 * Normalize the DB `trees` jsonb ({ "<kind>": {tokens, stage}, … }) into an
 * ordered list: the current/main species first, then the other grown trees by
 * tokens desc. Trees with 0 tokens are dropped. If nothing usable is present,
 * returns a single synthetic entry from the row's top-level fields so the UI
 * always has the main tree to show.
 */
function normalizeTrees(
  raw: unknown,
  mainKind: string,
  fallbackTokens: number,
  fallbackStage: number,
): TreeSnapshot[] {
  const list: TreeSnapshot[] = [];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [kind, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v && typeof v === "object") {
        const tokens = Number((v as { tokens?: unknown }).tokens ?? 0);
        const stage = Number((v as { stage?: unknown }).stage ?? 0);
        if (Number.isFinite(tokens) && tokens > 0) {
          list.push({ kind, tokens, stage_index: Number.isFinite(stage) ? stage : 0 });
        }
      }
    }
  }

  if (list.length === 0) {
    return [{ kind: mainKind, tokens: fallbackTokens, stage_index: fallbackStage }];
  }

  list.sort((a, b) => b.tokens - a.tokens);
  const mainIdx = list.findIndex((t) => t.kind === mainKind);
  if (mainIdx > 0) {
    const [main] = list.splice(mainIdx, 1);
    list.unshift(main);
  }
  return list;
}

export type GlobalStats = {
  totalTrees: number;
  totalTokens: number;
};

// ── getLeaderboard ────────────────────────────────────────────────────────────

/**
 * Fetches the top 100 leaderboard entries, ordered by score descending.
 * Reads the `leaderboard` table via the anon client (RLS: public read policy).
 * Returns an empty array on error so the page degrades gracefully.
 */
export async function getLeaderboard(): Promise<{
  entries: LeaderboardEntry[];
  error: string | null;
}> {
  try {
    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from("leaderboard")
      .select("id, username, score, stage_index, tree, region, trees, created_at, updated_at")
      .order("score", { ascending: false })
      .limit(100);

    if (error) {
      return { entries: [], error: error.message };
    }

    // Normalise the extension columns: older/synthetic rows may have null
    // tree/region/trees until the desktop app upserts them.
    const entries = (data ?? []).map((row) => {
      const tree = (row.tree as string | null) ?? "apple";
      return {
        ...row,
        tree,
        region: (row.region as string | null) ?? "",
        trees: normalizeTrees(
          row.trees,
          tree,
          Number(row.score ?? 0),
          Number(row.stage_index ?? 0),
        ),
      };
    }) as LeaderboardEntry[];

    return { entries, error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : String(e) };
  }
}

// ── getGlobalStats ────────────────────────────────────────────────────────────

/**
 * Calls the get_leaderboard_stats() SQL function (security definer, accessible
 * to anon) and returns aggregated totals for the leaderboard banner.
 * Falls back to zeros on any error so the page always renders.
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  try {
    const client = getSupabaseServerClient();
    const { data, error } = await client.rpc("get_leaderboard_stats");

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { totalTrees: 0, totalTokens: 0 };
    }

    const row = data[0] as { total_trees: number; total_tokens: number };
    return {
      totalTrees: Number(row.total_trees ?? 0),
      totalTokens: Number(row.total_tokens ?? 0),
    };
  } catch {
    return { totalTrees: 0, totalTokens: 0 };
  }
}
