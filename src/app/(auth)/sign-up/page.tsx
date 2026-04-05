// Sign-up page — SiteLens
// New accounts require an invitation at MVP (internal tool — no public signup).
// The form is present but a notice is shown to communicate the invite requirement.

import { Suspense } from "react";
import SignUpForm from "./sign-up-form";

export const metadata = {
  title: "Sign Up — SiteLens",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SiteLens</h1>
          <p className="mt-2 text-sm text-gray-600">Create your account.</p>
        </div>
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 border border-amber-200">
          SiteLens is an internal tool. Access is by invitation only.
          If you were not invited, please contact your Administrator.
        </div>
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/sign-in" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
