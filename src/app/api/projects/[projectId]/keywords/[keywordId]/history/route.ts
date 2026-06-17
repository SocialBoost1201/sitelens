// GET /api/projects/[projectId]/keywords/[keywordId]/history
// Returns the rank snapshot history for a keyword (RLS-scoped, oldest→newest).

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; keywordId: string }> },
) {
  const { projectId, keywordId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Confirm the keyword belongs to a project the caller can see (RLS).
  const { data: kw } = await supabase
    .from("TrackedKeyword")
    .select("id")
    .eq("id", keywordId)
    .eq("projectId", projectId)
    .single()
  if (!kw) return NextResponse.json({ error: "Keyword not found" }, { status: 404 })

  const { data, error } = await supabase
    .from("KeywordRankSnapshot")
    .select("id, position, rankedUrl, serpFeatures, source, capturedAt")
    .eq("keywordId", keywordId)
    .order("capturedAt", { ascending: true })
    .limit(180)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ history: data ?? [] })
}
