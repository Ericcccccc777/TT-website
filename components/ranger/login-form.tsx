"use client";

import { useActionState } from "react";
import { signInAction } from "@/app/ranger/actions";
import type { SignInState } from "@/lib/ranger/types";

const INITIAL: SignInState = { error: null };

export function RangerLoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-body text-small text-[var(--color-text-muted-light)]">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          className="rounded-[2px] bg-surface-card px-3 py-2 font-body text-text-forest"
          style={{ border: "var(--border-pixel)" }}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-body text-small text-[var(--color-text-muted-light)]">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="rounded-[2px] bg-surface-card px-3 py-2 font-body text-text-forest"
          style={{ border: "var(--border-pixel)" }}
        />
      </label>

      {state.error && (
        <p className="font-body text-small text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-[2px] bg-leaf-deep px-5 py-2.5 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
