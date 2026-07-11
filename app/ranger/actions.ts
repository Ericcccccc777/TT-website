"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
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
  const email = String(formData.get("email") ?? "").trim();
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
