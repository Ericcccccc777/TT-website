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
