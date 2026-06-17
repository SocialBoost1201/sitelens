// Forgot-password page — SiteLens
// Centered single-column card; requests a Supabase password reset email.

import ForgotPasswordForm from "./forgot-password-form";

export const metadata = {
  title: "Reset Password — SiteLens",
};

export default function ForgotPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 dark"
      style={{ background: "oklch(0.10 0.008 265)" }}
    >
      <ForgotPasswordForm />
    </div>
  );
}
