import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzeAnimation } from "@/lib/services/animation-analyzer"
import { compareAnimationResults } from "@/lib/services/animation-comparison"
import type { Json } from "@/lib/supabase/database.types"
import {
  assertSafeExternalHttpUrl,
  isUnsafeExternalUrlError,
} from "@/lib/security/url"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: project, error } = await supabase
    .from("Project")
    .select("id, url")
    .eq("id", projectId)
    .single()

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  let targetUrl: string
  try {
    targetUrl = await assertSafeExternalHttpUrl(
      typeof body.url === "string" ? body.url : project.url,
    )
  } catch (error) {
    if (isUnsafeExternalUrlError(error)) {
      return NextResponse.json({ error: error.message, code: "unsafe_url" }, { status: 400 })
    }
    throw error
  }

  try {
    const result = await analyzeAnimation(targetUrl)
    const admin = createAdminClient()
    const id = crypto.randomUUID()
    const { data: previousResults } = await admin
      .from("AnimationResult")
      .select("data")
      .eq("projectId", projectId)
      .order("analyzedAt", { ascending: false })
      .limit(1)

    const previousResult = (previousResults?.[0]?.data ?? null) as typeof result | null

    const { error: insertError } = await admin.from("AnimationResult").insert({
      id,
      projectId,
      url: targetUrl,
      analyzedAt: result.analyzedAt,
      totalCount: result.totalCount,
      gpuComposited: result.gpuComposited,
      nonComposited: result.nonComposited,
      loopCount: result.loopCount,
      reducedMotion: result.reducedMotion,
      clsRisk: result.clsRisk,
      data: result as unknown as Json,
    })

    if (insertError) {
      const setupHint = insertError.message.includes("AnimationResult")
        ? "AnimationResult table may not exist yet. Apply the Supabase migration before running analysis."
        : null

      return NextResponse.json(
        {
          error: insertError.message,
          code: "animation_persist_failed",
          setupHint,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      id,
      result,
      comparison: compareAnimationResults(result, previousResult),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Animation analysis failed"
    return NextResponse.json({ error: message, code: "animation_analysis_failed" }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("AnimationResult")
    .select(
      "id, url, analyzedAt, totalCount, gpuComposited, nonComposited, loopCount, reducedMotion, clsRisk, data"
    )
    .eq("projectId", projectId)
    .order("analyzedAt", { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data ?? [] })
}
