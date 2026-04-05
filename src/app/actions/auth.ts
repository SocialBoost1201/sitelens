"use server";

// Auth Server Actions — SiteLens
//
// Server Actions run exclusively on the server, making them the correct place
// to call Supabase Auth APIs that must not be exposed to the client.
//
// All auth errors are returned as { error: string } to be displayed in the UI.
// Successful mutations redirect via `redirect()` from `next/navigation`.
//
// Validation is minimal at MVP (type + emptiness). Add Zod if rules grow.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export type AuthActionState =
  | { error: string }
  | { message: string }
  | undefined;

export async function signUp(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Email is required." };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      // Supabase sends a confirmation email. After clicking the link, the user
      // is redirected to /auth/callback which exchanges the code for a session.
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Sign-up succeeded — tell the user to check their email.
  return {
    message:
      "Account created! Check your email and click the confirmation link to sign in.",
  };
}

// ─── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");
  const password = formData.get("password");
  // `next` allows redirecting back to the page the user was trying to reach.
  const next = formData.get("next");
  const destination =
    typeof next === "string" && next.startsWith("/") ? next : "/dashboard";

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Email is required." };
  }
  if (typeof password !== "string" || !password) {
    return { error: "Password is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    // Use a generic message to avoid leaking whether the email exists.
    return { error: "Invalid email or password." };
  }

  // Redirect must happen outside the try/catch — redirect() throws internally.
  redirect(destination);
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
