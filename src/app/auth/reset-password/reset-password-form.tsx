"use client"

import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { updatePassword, type AuthActionState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    updatePassword,
    undefined,
  )

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
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
            Set a new password
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.010 265)" }}>
            Choose a strong password you don&apos;t use elsewhere.
          </p>
        </div>

        <form action={action} className="space-y-5">
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
              htmlFor="password"
              className="text-xs font-medium"
              style={{ color: "oklch(0.72 0.008 265)" }}
            >
              New password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
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
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  )
}
