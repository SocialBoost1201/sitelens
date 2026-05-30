"use client"

import { useActionState } from "react"
import { Loader2, Zap, MailCheck } from "lucide-react"
import { signUp, type AuthActionState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    signUp,
    undefined,
  )

  // Success state
  if (state && "message" in state) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
              <MailCheck className="size-6 text-emerald-500" />
            </div>
            <h2 className="font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">SiteLens</h1>
          <p className="text-sm text-muted-foreground">Invitation only</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Create an account</CardTitle>
            <CardDescription className="text-xs">
              Access to SiteLens is by invitation only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              {state && "error" in state && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  {state.error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Password
                  <span className="ml-1 font-normal text-muted-foreground">(min. 8 chars)</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {pending ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
