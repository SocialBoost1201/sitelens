"use client";

// Sign-up form Client Component.
// On success, the Server Action returns a message asking the user to confirm
// their email — no redirect (Supabase sends a confirmation link).

import { useActionState } from "react";
import { signUp, type AuthActionState } from "@/app/actions/auth";

export default function SignUpForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    signUp,
    undefined,
  );

  // If sign-up succeeded, show the confirmation message instead of the form.
  if (state && "message" in state) {
    return (
      <div
        role="status"
        className="rounded-md bg-green-50 px-4 py-4 text-sm text-green-800 border border-green-200"
      >
        {state.message}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {state && "error" in state && (
        <div
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Password
          <span className="ml-1 font-normal text-gray-400">(min. 8 characters)</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
