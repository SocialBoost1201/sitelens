import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"
import { fetchDailyMetrics } from "@/lib/gbp/performance"
import { saveDailyMetrics } from "@/lib/gbp/saveMetrics"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    gbpLocationId?: string
  }

  if (!body.gbpLocationId) {
    return NextResponse.json({ error: "gbpLocationId is required" }, { status: 400 })
  }

  const location = await db.gbpLocation.findUnique({
    where: { id: body.gbpLocationId },
    include: { googleIntegration: true },
  })

  if (!location || location.googleIntegration.userId !== user.id) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 })
  }

  try {
    const metrics = await fetchDailyMetrics({
      integration: location.googleIntegration,
      location,
    })

    await saveDailyMetrics({
      gbpLocationId: location.id,
      metrics,
    })

    return NextResponse.json({
      success: true,
      count: metrics.length,
    })
  } catch (error) {
    console.error("[gbp/sync/location]", error)
    return NextResponse.json(
      { error: "Failed to sync Google Business Profile metrics" },
      { status: 500 },
    )
  }
}
