"use client";

// Sign-out button Client Component.
// Wraps the signOut Server Action in a form so it can be triggered from the
// navigation header without requiring a separate page.

import { signOut } from "@/app/actions/auth";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
