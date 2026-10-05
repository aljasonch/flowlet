"use client";

import { useActionState } from "react";
import { login, type ActionState } from "@/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    login,
    {}
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-neutral-900/70 p-6 shadow-lg backdrop-blur-md">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Personal Money Manager
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Sign in to access your dashboard
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          {state?.error && (
            <div
              role="alert"
              className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-700 dark:text-red-400"
            >
              {state.error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white/90 dark:bg-neutral-800/90 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white/90 dark:bg-neutral-800/90 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 py-2.5 px-4 text-sm font-medium text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
