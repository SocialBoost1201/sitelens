"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Loader2, Trash2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Member {
  id: string
  userId: string
  email: string | null
  role: string
  createdAt: string
}

interface Invite {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  expiresAt: string
}

interface Props {
  projectId: string
  initialMembers: Member[]
  initialInvites: Invite[]
}

export function MembersClient({ projectId, initialMembers, initialInvites }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [invites, setInvites] = useState(initialInvites)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"ANALYST" | "VIEWER">("VIEWER")
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState("")
  const [removing, setRemoving] = useState<Set<string>>(new Set())

  async function invite() {
    if (!email) return
    setInviting(true)
    setError("")
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    })
    setInviting(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError((data as { error?: string }).error ?? "Failed to send invite")
      return
    }
    setEmail("")
    setInvites(prev => [
      {
        id: Date.now().toString(),
        email,
        role,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
      ...prev,
    ])
    router.refresh()
  }

  async function removeMember(id: string) {
    setRemoving(prev => new Set(prev).add(id))
    await fetch(`/api/projects/${projectId}/members?memberId=${id}`, { method: "DELETE" })
    setMembers(prev => prev.filter(m => m.id !== id))
    setRemoving(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  async function revokeInvite(id: string) {
    setRemoving(prev => new Set(prev).add(id))
    await fetch(`/api/projects/${projectId}/members?inviteId=${id}`, { method: "DELETE" })
    setInvites(prev => prev.filter(i => i.id !== id))
    setRemoving(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  return (
    <div className="space-y-6">
      {/* Current members */}
      {members.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Members</h3>
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{m.email ?? m.userId}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={removing.has(m.id)}
                onClick={() => removeMember(m.id)}
              >
                {removing.has(m.id) ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pending Invites</h3>
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border border-dashed p-3">
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 text-muted-foreground" />
                  <p className="text-sm">{inv.email}</p>
                  <Badge variant="secondary" className="text-xs">{inv.role}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Expires{" "}
                  {new Date(inv.expiresAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={removing.has(inv.id)}
                onClick={() => revokeInvite(inv.id)}
              >
                {removing.has(inv.id) ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {members.length === 0 && invites.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Users className="mx-auto size-7 text-muted-foreground/30" />
          <p className="mt-2 text-sm font-medium">No team members yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Invite colleagues to collaborate on this project.
          </p>
        </div>
      )}

      {/* Invite form */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Invite a team member</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && invite()}
            />
          </div>
          <select
            value={role}
            onChange={e => setRole(e.target.value as "ANALYST" | "VIEWER")}
            className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="VIEWER">Viewer</option>
            <option value="ANALYST">Analyst</option>
          </select>
          <Button onClick={invite} disabled={inviting || !email}>
            {inviting ? <Loader2 className="size-4 animate-spin" /> : "Invite"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
