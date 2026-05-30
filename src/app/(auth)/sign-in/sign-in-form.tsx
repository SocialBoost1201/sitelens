"use client"

import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Zap } from "lucide-react"
import { signIn, type AuthActionState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignInForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    signIn,
    undefined,
  )
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? ""

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      {/* Mobile-only brand header */}
      <div className="lg:hidden flex flex-col items-center gap-2 text-center mb-8">
        <div
          className="flex size-10 items-center justify-center rounded-xl"
          style={{
            background: "oklch(0.65 0.22 258)",
            boxShadow: "0 0 16px oklch(0.65 0.22 258 / 40%)",
          }}
        >
          <Zap className="size-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "oklch(0.97 0.003 265)" }}>
          SiteLens
        </h1>
        <p className="text-sm" style={{ color: "oklch(0.55 0.010 265)" }}>
          Web Audit Platform
        </p>
      </div>

      {/* Form card */}
      <div
        className="rounded-2xl p-8 space-y-6"
        style={{
          background: "oklch(0.13 0.006 265)",
          border: "1px solid oklch(1 0 0 / 8%)",
          boxShadow: "0 24px 64px -12px oklch(0 0 0 / 50%)",
        }}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: "oklch(0.97 0.003 265)" }}>
            Sign in to your account
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.010 265)" }}>
            Enter your credentials to continue.
          </p>
        </div>

        <form action={action} className="space-y-5">
          {next && <input type="hidden" name="next" value={next} />}

          {state && "error" in state && (
            <div
              role="alert"
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                background: "oklch(0.68 0.21 22 / 10%)",
                border: "1px solid oklch(0.68 0.21 22 / 30%)",
                color: "oklch(0.80 0.14 22)",
              }}
            >
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-medium"
              style={{ color: "oklch(0.72 0.008 265)" }}
            >
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="transition-all duration-200 focus:glow-primary-sm"
              style={{
                background: "oklch(0.10 0.008 265)",
                borderColor: "oklch(1 0 0 / 10%)",
                color: "oklch(0.97 0.003 265)",
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-xs font-medium"
                style={{ color: "oklch(0.72 0.008 265)" }}
              >
                Password
              </Label>
              <a
                href="/auth/forgot-password"
                className="text-xs transition-colors hover:underline"
                style={{ color: "oklch(0.65 0.22 258)" }}
              >
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="transition-all duration-200"
              style={{
                background: "oklch(0.10 0.008 265)",
                borderColor: "oklch(1 0 0 / 10%)",
                color: "oklch(0.97 0.003 265)",
              }}
            />
          </div>

          <Button
            type="submit"
            className="w-full font-semibold transition-all duration-200"
            disabled={pending}
            style={{
              background: "oklch(0.65 0.22 258)",
              color: "white",
              boxShadow: pending ? "none" : "0 0 20px oklch(0.65 0.22 258 / 30%)",
            }}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-xs" style={{ color: "oklch(0.50 0.010 265)" }}>
          Don&apos;t have an account?{" "}
          <a
            href="/sign-up"
            className="font-medium transition-colors hover:underline"
            style={{ color: "oklch(0.65 0.22 258)" }}
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  )
}
