// Reset-password page — SiteLens
// Reached after /auth/callback exchanges the recovery code for a session.
// Centered single-column card; sets the new password via updateUser.

import ResetPasswordForm from "./reset-password-form";

export const metadata = {
  title: "Set New Password — SiteLens",
};

export default function ResetPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 dark"
      style={{ background: "oklch(0.10 0.008 265)" }}
    >
      <ResetPasswordForm />
    </div>
  );
}
