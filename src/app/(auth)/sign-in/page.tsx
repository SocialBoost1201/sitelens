// Sign-in page — SiteLens
// 2-column layout: left brand panel + right form panel (mobile: single column)

import { Suspense } from "react";
import SignInForm from "./sign-in-form";
import { Zap, BarChart2, ShieldCheck, Gauge } from "lucide-react";

export const metadata = {
  title: "Sign In — SiteLens",
};

const features = [
  { icon: Gauge,       label: "PageSpeed & Core Web Vitals" },
  { icon: BarChart2,   label: "SEO & Search Visibility" },
  { icon: ShieldCheck, label: "Security & Uptime Monitoring" },
];

export default function SignInPage() {
  return (
    <div className="min-h-screen flex dark">
      {/* ── Left: Brand panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "oklch(0.09 0.008 265)" }}
      >
        {/* Background gradient orb */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, oklch(0.65 0.22 258) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(circle, oklch(0.65 0.22 258) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-lg animate-pulse-glow"
            style={{
              background: "oklch(0.65 0.22 258)",
              boxShadow: "0 0 20px oklch(0.65 0.22 258 / 40%)",
            }}
          >
            <Zap className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">SiteLens</span>
        </div>

        {/* Center content */}
        <div className="relative space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight leading-tight"
              style={{ color: "oklch(0.97 0.003 265)" }}
            >
              Your website,<br />
              under the lens.
            </h2>
            <p className="text-base leading-relaxed"
              style={{ color: "oklch(0.60 0.010 265)" }}
            >
              Unified audit dashboard for performance, SEO,
              security, and uptime — all in one place.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-md"
                  style={{ background: "oklch(0.65 0.22 258 / 15%)" }}
                >
                  <Icon className="size-3.5" style={{ color: "oklch(0.65 0.22 258)" }} />
                </div>
                <span className="text-sm" style={{ color: "oklch(0.72 0.008 265)" }}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom credit */}
        <p className="relative text-xs" style={{ color: "oklch(0.42 0.008 265)" }}>
          © {new Date().getFullYear()} SiteLens. All rights reserved.
        </p>
      </div>

      {/* ── Right: Form panel ─────────────────────────────────────── */}
      <div
        className="flex w-full lg:w-1/2 items-center justify-center p-6"
        style={{ background: "oklch(0.10 0.008 265)" }}
      >
        {/* Suspense required because SignInForm reads searchParams */}
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
