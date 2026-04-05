// Cron audit trigger — SiteLens
// SCAFFOLD — business logic is not yet implemented.
//
// This Route Handler is designed to be called by a scheduler (e.g. Vercel Cron Jobs,
// GitHub Actions schedule, or an external cron service) to trigger scheduled audits.
//
// To activate on Vercel, add a `vercel.json` entry:
//   {
//     "crons": [{ "path": "/api/cron/audit", "schedule": "0 3 * * *" }]
//   }
// And set CRON_SECRET in your Vercel environment variables.
//
// Security: The handler validates a shared secret header to prevent unauthorised triggers.

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Validate the shared secret to prevent unauthorised external calls.
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Implement scheduled audit logic here.
  // Suggested steps:
  //   1. Query the database for sites with scheduled audits due.
  //   2. For each site, create a new AuditRun record (status: PENDING).
  //   3. Enqueue audit jobs (e.g. via a queue or direct PageSpeed call).
  //   4. Return a summary of enqueued jobs.

  return NextResponse.json(
    {
      ok: true,
      message: "Cron audit endpoint reached — business logic not yet implemented.",
    },
    { status: 200 },
  );
}

// GET handler: health check for the cron endpoint (no auth required)
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: true, endpoint: "/api/cron/audit", status: "scaffold" },
    { status: 200 },
  );
}
