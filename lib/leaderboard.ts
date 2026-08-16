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
  /**
   * Project showcase, written in the desktop app and shown in an expandable
   * panel under the row. All four arrive already filtered by 0025's view: a row
   * whose gains are held (without an admin allowance), or whose project name is
   * blank, reports them as null — the website never sees the values, so it
   * cannot leak them.
   *
   * OPTIONAL on purpose. `lib/leaderboard-boards.ts:122` extends this type and
   * builds it from an explicit literal with no spread; four required properties
   * would fail `tsc --noEmit` there and force an edit to the value board, which
   * this feature deliberately leaves alone.
   */
  project_name?: string | null;
  project_desc?: string | null;
  project_url?: string | null;
  project_image?: string | null;
};

/** A row has a project iff it has a name to head the panel with. */
export function hasProject(e: LeaderboardEntry): boolean {
  return (e.project_name ?? "").trim().length > 0;
}

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

/** Leaderboard rows per page. Page 2 shows ranks 51–100, etc. */
export const LEADERBOARD_PAGE_SIZE = 50;

/**
 * One page of leaderboard entries (score descending) plus the total number of
 * ranked players, for the pager. Reads `leaderboard_public` (0025) via the anon
 * client — a `security_invoker` view, so the base table's RLS public-read policy
 * still excludes banned/hidden rows from BOTH the returned rows and the count,
 * and pagination is over visible players only. The view also decides which rows
 * report their project fields; see its header.
 * Returns empty + total 0 on error so the page degrades gracefully.
 *
 * The page reads this per request (it is a paginated, dynamically-rendered
 * route), which also means a ban takes effect on the very next view.
 */
export async function getLeaderboard(page = 1): Promise<{
  entries: LeaderboardEntry[];
  total: number;
  error: string | null;
}> {
  const p = Number.isInteger(page) && page > 0 ? page : 1;
  const from = (p - 1) * LEADERBOARD_PAGE_SIZE;
  const to = from + LEADERBOARD_PAGE_SIZE - 1;
  try {
    const client = getSupabaseServerClient();
    const { data, count, error } = await client
      .from("leaderboard_public")
      .select(
        "id, username, score, stage_index, tree, region, trees, created_at, updated_at, project_name, project_desc, project_url, project_image",
        { count: "exact" },
      )
      .order("score", { ascending: false })
      .range(from, to);

    if (error) {
      // "Past the last page" is not a failure, but PostgREST reports it down the
      // same channel as one: an offset beyond the end answers PGRST103 with a
      // null count, exactly where a revoked grant or a dead database would put
      // its message. Keep the two apart, because the page does opposite things
      // with them — a typed `?page=99` is redirected to the last real page, a
      // genuine failure has to stay put and show the error. Collapsing them
      // means one of the two behaves as the other.
      if (error.code === "PGRST103") {
        // supabase-js drops the count that PostgREST puts on the 416, so the
        // real total has to be fetched separately. Returning 0 here would make
        // totalPages 1 and send every out-of-range page to page 1 — the exact
        // opposite of what the caller's redirect promises. Invisible while the
        // board fits on one page; wrong from the 51st player onwards.
        const { count: realCount, error: countError } = await client
          .from("leaderboard_public")
          .select("id", { count: "exact", head: true });
        if (countError) return { entries: [], total: 0, error: countError.message };
        return { entries: [], total: realCount ?? 0, error: null };
      }
      return { entries: [], total: 0, error: error.message };
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
        // Kept nullable rather than defaulted to "": 0022's trigger already
        // normalises blanks to NULL on write, so null is the one shape that
        // means "not filled in" and the panel never has to test for "".
        project_name: (row.project_name as string | null) ?? null,
        project_desc: (row.project_desc as string | null) ?? null,
        project_url: (row.project_url as string | null) ?? null,
        project_image: (row.project_image as string | null) ?? null,
      };
    }) as LeaderboardEntry[];

    return { entries, total: count ?? 0, error: null };
  } catch (e) {
    return { entries: [], total: 0, error: e instanceof Error ? e.message : String(e) };
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
