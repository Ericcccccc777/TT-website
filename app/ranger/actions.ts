"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { ORPHAN_STALE_DAYS } from "@/lib/ranger/data";
import {
  getAdminUser,
  getRangerServerClient,
  isAdminEmail,
  isAuthorizedAdmin,
} from "@/lib/ranger/auth";
import { RANGER_LANG_COOKIE } from "@/lib/ranger/i18n";
import type { SignInState } from "@/lib/ranger/types";

// Ban/unban changes what the PUBLIC surfaces show. The leaderboard, home and
// dashboard are ISR-cached (revalidate = 60), so invalidate them immediately
// instead of leaving a hidden cheater visible for up to a minute.
function revalidatePublicBoards() {
  revalidatePath("/[locale]/leaderboard", "page");
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]", "page");
}

/**
 * Sign in with email+password (useActionState signature). Verifies the account
 * is on the admin allow-list; a valid-but-non-admin login is rejected and its
 * session immediately discarded so it never gains access.
 */
export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  let email = String(formData.get("email") ?? "").trim();
  // The login form only asks for the local part — complete bare usernames to a
  // full @gmail.com address (a value that already contains "@" is left as-is).
  if (email && !email.includes("@")) email = `${email}@gmail.com`;
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter an email and password." };

  const supabase = await getRangerServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Surface the real reason (admin-only page, so detail is fine + far easier to
  // debug than a generic "wrong password").
  if (error || !data.user) {
    return { error: error?.message ?? "Sign-in failed." };
  }

  if (!isAuthorizedAdmin(data.user)) {
    const u = data.user;
    await supabase.auth.signOut();
    if (isAdminEmail(u.email) && !u.email_confirmed_at) {
      return {
        error:
          "This admin email exists but its email is not confirmed. In Supabase → Authentication → Users, confirm it (or delete and re-create the user with 'Auto Confirm' checked).",
      };
    }
    return { error: `Account ${u.email ?? ""} is not on the Ranger admin allow-list.` };
  }

  revalidatePath("/ranger");
  return { error: null };
}

export async function signOutAction(): Promise<void> {
  const supabase = await getRangerServerClient();
  await supabase.auth.signOut();
  revalidatePath("/ranger");
}

/** Hide a user from the public leaderboard by user_id. Admin-only. */
export async function banAction(formData: FormData): Promise<void> {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Not authorized.");

  const userId = String(formData.get("userId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!userId) throw new Error("Missing userId.");

  const db = getSupabaseAdminClient();
  const { error } = await db
    .from("leaderboard_bans")
    .upsert({ user_id: userId, reason, banned_by: admin.email }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/ranger");
  revalidatePublicBoards();
}

/** Restore a previously hidden user to the public leaderboard. Admin-only. */
export async function unbanAction(formData: FormData): Promise<void> {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Not authorized.");

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Missing userId.");

  const db = getSupabaseAdminClient();
  const { error } = await db.from("leaderboard_bans").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/ranger");
  revalidatePublicBoards();
}

/**
 * Delete a leaderboard row a re-signed-up client left orphaned (its new row carries prev_uid =
 * this uid). SECURITY — the hard part: prev_uid AND the successor's score/created_at are ALL
 * client-writable on the attacker's own row (RLS only pins auth.uid()=user_id; there is no INSERT
 * trigger, so created_at can be forged to any value). So NOTHING on the successor can be trusted —
 * an earlier version that gated on "successor is newer / higher-scored" was fully bypassable.
 * The ONE unforgeable signal is the TARGET's own updated_at: the BEFORE-UPDATE trigger (0002)
 * stamps it now() on every real sync, and an attacker can never write a victim's row (RLS). So the
 * real gate is STALENESS — only delete a row that has not synced in ORPHAN_STALE_DAYS. An active /
 * recently-synced row (incl. the live #1) can therefore NEVER be deleted, whatever a forged
 * successor claims; and an idle-but-alive row deleted in error self-heals (its next sync re-inserts
 * it under the same user_id). prev_uid only surfaces which stale rows look like dupes. (Residual:
 * a legit user idle > ORPHAN_STALE_DAYS could still be targeted by a forged pointer; closing that
 * needs the client to prove control of the old session with its signed token — a larger change.)
 */
export async function deleteOrphanAction(formData: FormData): Promise<void> {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Not authorized.");

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Missing userId.");

  const db = getSupabaseAdminClient();
  const [target, successor] = await Promise.all([
    db.from("leaderboard").select("updated_at").eq("user_id", userId).maybeSingle(),
    db
      .from("leaderboard")
      .select("user_id")
      .eq("prev_uid", userId)
      .neq("user_id", userId) // ignore a self-referential row (prev_uid == its own uid)
      .limit(1)
      .maybeSingle(),
  ]);
  if (target.error) throw new Error(target.error.message);
  if (successor.error) throw new Error(successor.error.message);
  if (!target.data) return; // already gone
  if (!successor.data) throw new Error("Refusing to delete: nothing claims to supersede this row.");

  const updatedAt = (target.data as { updated_at: string }).updated_at;
  const stale = new Date(updatedAt).getTime() < Date.now() - ORPHAN_STALE_DAYS * 864e5;
  if (!stale) {
    throw new Error(
      `Refusing to delete: this row synced within the last ${ORPHAN_STALE_DAYS} days, so it is active, not an orphan (prev_uid is only an unverified hint — a live row is never auto-deletable).`,
    );
  }

  const { error } = await db.from("leaderboard").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/ranger");
  revalidatePublicBoards();
}

/**
 * Acknowledge a specific score-change (history row) as reviewed-OK. The analyzer
 * flags rows heuristically; once acknowledged, the row renders normal and leaves
 * the flagged counts. Admin-only.
 */
export async function acknowledgeAction(formData: FormData): Promise<void> {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Not authorized.");

  const historyId = Number(formData.get("historyId"));
  const userId = String(formData.get("userId") ?? "").trim();
  if (!Number.isFinite(historyId)) throw new Error("Missing historyId.");

  const db = getSupabaseAdminClient();
  const { error } = await db
    .from("leaderboard_history_reviews")
    .upsert({ history_id: historyId, reviewed_by: admin.email }, { onConflict: "history_id" });
  if (error) throw new Error(error.message);

  if (userId) revalidatePath(`/ranger/${userId}`);
}

/** Undo a review acknowledgement (flag the row again). Admin-only. */
export async function unacknowledgeAction(formData: FormData): Promise<void> {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Not authorized.");

  const historyId = Number(formData.get("historyId"));
  const userId = String(formData.get("userId") ?? "").trim();
  if (!Number.isFinite(historyId)) throw new Error("Missing historyId.");

  const db = getSupabaseAdminClient();
  const { error } = await db
    .from("leaderboard_history_reviews")
    .delete()
    .eq("history_id", historyId);
  if (error) throw new Error(error.message);

  if (userId) revalidatePath(`/ranger/${userId}`);
}

/**
 * Set the admin console language (cookie). Not gated on admin on purpose so the
 * language can also be switched from the login screen.
 */
export async function setRangerLangAction(formData: FormData): Promise<void> {
  const lang = formData.get("lang") === "zh" ? "zh" : "en";
  const store = await cookies();
  store.set(RANGER_LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/ranger", "layout");
}
