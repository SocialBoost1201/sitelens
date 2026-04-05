// Sign-in page — SiteLens
// Uses a Client Component form with useActionState for inline error display.
// The signIn Server Action handles Supabase auth and redirects on success.

import { Suspense } from "react";
import SignInForm from "./sign-in-form";

export const metadata = {
  title: "Sign In — SiteLens",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SiteLens</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue.
          </p>
        </div>
        {/* Suspense required because SignInForm reads searchParams for the
            `next` redirect param — that suspends in Next.js App Router. */}
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
