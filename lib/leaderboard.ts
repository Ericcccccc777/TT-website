import { cache } from "react";
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
  /**
   * Tokens collected through the app in the last 30 days (0031). The rolling
   * board ranks on this; the lifetime board ignores it.
   *
   * Not the same thing as a 30-day slice of `score`: it counts only `update`
   * history rows, so a brand-new player's first sync — which reports every token
   * their local logs ever recorded — does not land here. See 0031's header.
   *
   * OPTIONAL for the same reason the project fields are: `lib/leaderboard-boards.ts`
   * builds this type from an explicit literal with no spread, and a required
   * property would fail `tsc --noEmit` there.
   */
  recent_score?: number;
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
  return readBoard(page, "lifetime");
}

/**
 * The rolling board: same players, ranked by tokens collected through the app in
 * the last 30 days (0031's `recent_score`).
 *
 * Rows at zero are filtered out rather than listed at the bottom. A player who
 * has not synced inside the window has no standing on a board that exists to
 * show recent activity, and padding it with zeroes would make a live board look
 * like the frozen one it is meant to replace.
 */
export async function getRecentLeaderboard(page = 1): Promise<{
  entries: LeaderboardEntry[];
  total: number;
  error: string | null;
}> {
  return readBoard(page, "recent");
}

export type BoardWindow = "lifetime" | "recent";

/** Column each window ranks on. Also the column the rolling board filters on. */
const SORT_COLUMN: Record<BoardWindow, string> = {
  lifetime: "score",
  recent: "recent_score",
};

async function readBoard(
  page: number,
  window: BoardWindow,
): Promise<{
  entries: LeaderboardEntry[];
  total: number;
  error: string | null;
}> {
  const p = Number.isInteger(page) && page > 0 ? page : 1;
  const from = (p - 1) * LEADERBOARD_PAGE_SIZE;
  const to = from + LEADERBOARD_PAGE_SIZE - 1;
  const sortBy = SORT_COLUMN[window];
  try {
    const client = getSupabaseServerClient();
    const table = client.from("leaderboard_public");
    /*
     * Two literal select strings, not one built from a variable.
     *
     * supabase-js derives the row type from the select string as a *literal*;
     * hand it a `string` and every field collapses to GenericStringError and the
     * mapping below stops type-checking. So the branch is spelled out.
     *
     * The lifetime board deliberately does NOT ask for `recent_score`. It has no
     * use for it, and asking for a column the view does not have yet makes
     * PostgREST fail the entire request — so a shared list would blank the
     * established board for the window between this code deploying and 0031
     * being applied. That ordering hazard has taken this board down once already
     * (0025 revoked columns a view still referenced). Kept apart, only the new
     * page waits for the migration.
     */
    const rows =
      window === "recent"
        ? table
            .select(
              "id, username, score, stage_index, tree, region, trees, created_at, updated_at, project_name, project_desc, project_url, project_image, recent_score",
              { count: "exact" },
            )
            .gt("recent_score", 0)
        : table.select(
            "id, username, score, stage_index, tree, region, trees, created_at, updated_at, project_name, project_desc, project_url, project_image",
            { count: "exact" },
          );
    const { data, count, error } = await rows
      .order(sortBy, { ascending: false })
      // Ties on the rolling board are common early on (two players at 0 gain
      // once the filter is off, or genuinely equal sums). Without a second key
      // Postgres may return them in a different order per request, which makes
      // pagination drop or repeat rows. `id` is unique, so this settles it.
      .order("id", { ascending: true })
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
        const headQuery = client
          .from("leaderboard_public")
          .select("id", { count: "exact", head: true });
        const { count: realCount, error: countError } = await (window === "recent"
          ? headQuery.gt("recent_score", 0)
          : headQuery);
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
        // `in` rather than a plain read: the lifetime branch above does not
        // request this column, so on that path it is genuinely absent from the
        // row type. Defaulted to 0 rather than left undefined — a database that
        // predates 0031 also answers without it, and the rolling board would
        // then render "NaN" where every gain should be. 0 reads as "nothing in
        // the window", which is the truth when we cannot tell.
        recent_score: Number(("recent_score" in row ? row.recent_score : 0) ?? 0),
      };
    }) as LeaderboardEntry[];

    return { entries, total: count ?? 0, error: null };
  } catch (e) {
    return { entries: [], total: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── getPlayer ─────────────────────────────────────────────────────────────────

export type PlayerProfile = {
  entry: LeaderboardEntry;
  /** Position on the lifetime board, 1-based. */
  lifetimeRank: number;
  /** Position on the rolling board, or null when they collected nothing in it. */
  recentRank: number | null;
};

/**
 * One player, addressed by the leaderboard row's public id.
 *
 * Keyed on `id` and not `user_id` deliberately. `leaderboard_public` exposes the
 * row's surrogate key and withholds `user_id` (0026), so a profile URL built on
 * `id` needs no migration, adds no new identifier to the page source, and cannot
 * be turned back into the account id that names the storage object.
 *
 * Returns null when no visible row has that id — which covers a typo, a deleted
 * player, and a banned one identically. The caller renders a 404 for all three;
 * distinguishing them would tell a stranger that a specific banned player exists.
 */
/*
 * Wrapped in `cache` so one request gets one answer.
 *
 * A player's page reads this twice — once building the page's title and share
 * tags, once building the page itself — and they are two separate calls into
 * the database. Two calls can disagree: a blip on the second one returns null,
 * the body renders the ordinary not-found page, and the title still carries the
 * player's name. That contradicts the whole point of the not-found page, which
 * is that a hidden player, a banned one and a made-up one look identical.
 *
 * `cache` makes them one call and one answer per request, so the two halves of
 * the page cannot disagree by construction rather than by luck. It is scoped to
 * a single request, so the card route — a separate request a crawler makes on
 * its own — still does its own read and its own eligibility check.
 */
export const getPlayer = cache(async (id: string): Promise<PlayerProfile | null> => {
  try {
    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from("leaderboard_public")
      .select(
        "id, username, score, stage_index, tree, region, trees, created_at, updated_at, project_name, project_desc, project_url, project_image, recent_score",
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    const tree = (data.tree as string | null) ?? "apple";
    const score = Number(data.score ?? 0);
    const recentScore = Number(data.recent_score ?? 0);

    // Rank by counting who is ahead rather than by paging the board: two
    // head-only counts, no rows transferred, and correct past page one.
    //
    // Both errors are checked, and either one fails the whole profile.
    //
    // A failed count comes back as `count: null`, and `(null ?? 0) + 1` is 1 —
    // so swallowing the error does not degrade the rank, it *fabricates* it,
    // and it fabricates the most conspicuous value there is. Every player whose
    // page loaded during a blip would read "#1", on their own page and on the
    // card that travels into other people's chat threads. Returning null instead
    // routes both surfaces to the fallback they already have for a database that
    // cannot answer (the ordinary not-found page; the generic card), which is the
    // behaviour `docs/features/share-card.md § 3.9` promises.
    //
    // The skipped-on-purpose branch carries an explicit `error: null` so the
    // destructuring stays uniform and a future edit cannot mistake "we did not
    // ask" for "the answer failed".
    //
    // "Ahead of me" has to mean the same thing here as it does on the board, and
    // the board orders by <measure> DESC, id ASC and reads position off the row
    // number. Counting only `score > mine` gets that wrong the moment two people
    // tie: the board shows them as N and N+1, this would call them both N, and
    // the second one's page and share card would disagree with the board they
    // came from. So the tie-break is counted too — same measure, same direction,
    // same second key.
    const rowId = data.id as string;
    const aheadOf = (column: string, value: number) =>
      client
        .from("leaderboard_public")
        .select("id", { count: "exact", head: true })
        .or(`${column}.gt.${value},and(${column}.eq.${value},id.lt.${rowId})`);

    const [lifetimeCount, recentCount] = await Promise.all([
      aheadOf("score", score),
      recentScore > 0
        ? aheadOf("recent_score", recentScore)
        : Promise.resolve({ count: null, error: null }),
    ]);

    if (lifetimeCount.error || recentCount.error) return null;
    const ahead = lifetimeCount.count;
    const aheadRecent = recentCount.count;

    const entry = {
      ...data,
      tree,
      region: (data.region as string | null) ?? "",
      trees: normalizeTrees(data.trees, tree, score, Number(data.stage_index ?? 0)),
      project_name: (data.project_name as string | null) ?? null,
      project_desc: (data.project_desc as string | null) ?? null,
      project_url: (data.project_url as string | null) ?? null,
      project_image: (data.project_image as string | null) ?? null,
      recent_score: recentScore,
    } as LeaderboardEntry;

    return {
      entry,
      lifetimeRank: (ahead ?? 0) + 1,
      recentRank: recentScore > 0 ? (aheadRecent ?? 0) + 1 : null,
    };
  } catch {
    return null;
  }
});

/**
 * Row ids of every player whose project is published — the set of profile pages
 * that are worth putting in front of a search engine. Used by the sitemap.
 *
 * Capped, and the cap is a real limit rather than a formality — say what it
 * means. A sitemap ANNOUNCES pages; it does not authorise them. A
 * project-bearing player past the cap is still indexable and still reachable
 * from the board, they are simply not announced, and a crawler that follows the
 * board finds them anyway. The alternative — an uncapped list that grows with
 * the board — trades that small delay for a file whose tail Google discards
 * regardless. `docs/features/player-page.md` states the cap.
 */
export async function getProfileIdsWithProjects(limit = 500): Promise<string[]> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("leaderboard_public")
    .select("id")
    .not("project_name", "is", null)
    .order("score", { ascending: false })
    // Tie-break on id, exactly as the boards do. Without it, two players on the
    // same score sitting either side of the cap swap places between generations
    // and the sitemap churns — one player dropping out and another appearing on
    // every rebuild, for no reason a crawler can make sense of.
    .order("id", { ascending: true })
    .limit(limit);

  /*
   * Thrown, not swallowed into an empty list.
   *
   * The two are not the same fact. An empty list means "nobody has a project";
   * an error means "we could not find out". Returning the first for the second
   * would publish, for the whole revalidate window, a sitemap that quietly drops
   * every player page — telling a crawler those pages are gone when they are
   * fine. Throwing means the sitemap fails to build and the crawler keeps the
   * copy it already has, which is the truthful outcome: nothing was learned, so
   * nothing changed.
   *
   * This is the same lesson as the rank counts in `getPlayer` above: swallowing
   * a database error does not degrade the answer, it fabricates one.
   */
  if (error) throw new ProfileListUnavailable(error.message);
  return (data ?? []).map((r) => String(r.id));
}

/**
 * The one failure a caller is allowed to shrug off: the database could not
 * answer the question. Branded so that nothing ELSE gets shrugged off with it —
 * a missing Supabase configuration, or a plain programming mistake inside the
 * function, must still be loud, and a bare `catch` cannot tell those apart.
 *
 * `message` carries the database's own words and nothing of a player's: this is
 * a listing query, so there is no row in hand to leak even by accident.
 */
export class ProfileListUnavailable extends Error {
  constructor(detail: string) {
    super(`could not list project profiles: ${detail}`);
    this.name = "ProfileListUnavailable";
  }
}

/**
 * Matched on `name`, not `instanceof`.
 *
 * Same reasoning this repo already applied to `AbortError` in
 * `components/share-button.tsx`: a bundler that ends up with two copies of this
 * module gives `instanceof` two different classes, and the test silently starts
 * failing — which here would mean rethrowing the one error we meant to tolerate
 * and failing a deploy over a sitemap. The name is the stable part.
 */
export function isProfileListUnavailable(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "ProfileListUnavailable"
  );
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
