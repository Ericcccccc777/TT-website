// Shared types for the /ranger admin console. Kept out of the "use server"
// actions module, which may only export async functions.

export type SignInState = { error: string | null };
