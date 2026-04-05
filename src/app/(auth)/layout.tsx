// Auth route group layout.
// No shared UI at the moment — this file exists to anchor the (auth) group.
// The PostHog provider from the root layout is inherited automatically.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
