"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getAdminUser, getRangerServerClient, isAuthorizedAdmin } from "@/lib/ranger/auth";
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

  if (error || !data.user) return { error: "Invalid email or password." };

  if (!isAuthorizedAdmin(data.user)) {
    await supabase.auth.signOut();
    return { error: "This account is not authorized for Ranger." };
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
