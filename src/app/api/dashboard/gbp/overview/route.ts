import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db/client"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const locationId = new URL(request.url).searchParams.get("locationId")

  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 })
  }

  const location = await db.gbpLocation.findUnique({
    where: { id: locationId },
    include: { googleIntegration: true },
  })

  if (!location || location.googleIntegration.userId !== user.id) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 })
  }

  const metrics = await db.gbpDailyMetric.findMany({
    where: { gbpLocationId: locationId },
    orderBy: [{ metricDate: "asc" }, { metricName: "asc" }],
  })

  return NextResponse.json({
    location: {
      id: location.id,
      title: location.title,
      googleLocationId: location.googleLocationId,
    },
    metrics,
  })
}
