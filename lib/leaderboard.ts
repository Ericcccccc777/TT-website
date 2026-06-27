import { getSupabaseServerClient } from "@/lib/supabase/server-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  id: string;
  username: string;
  score: number; // bigint in DB; JS number is safe up to 2^53
  stage_index: number; // 0–7, mirrors the 8 desktop app growth stages
  created_at: string;
  updated_at: string;
};

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
      .select("id, username, score, stage_index, created_at, updated_at")
      .order("score", { ascending: false })
      .limit(100);

    if (error) {
      return { entries: [], error: error.message };
    }

    return { entries: (data ?? []) as LeaderboardEntry[], error: null };
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
