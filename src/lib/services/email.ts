// src/lib/services/email.ts
// Thin wrapper around Resend API for sending transactional emails.

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ""
const FROM = process.env.EMAIL_FROM ?? "SiteLens <noreply@sitelens.app>"

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email")
    return
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("[email] Resend error", res.status, text)
  }
}

export function renderWeeklyReport(params: {
  projectName: string
  projectUrl: string
  appUrl: string
  projectId: string
  auditScore: number | null
  seoScore: number | null
  securityGrade: string | null
  brokenLinksCount: number
  uptimePercent: number | null
  weekStart: string
  weekEnd: string
}): string {
  const score = (n: number | null) => n != null ? `${Math.round(n)}` : "—"
  const pct = (n: number | null) => n != null ? `${n.toFixed(1)}%` : "—"

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SiteLens Weekly Report — ${params.projectName}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; color: #111827; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.08); overflow: hidden; }
  .header { background: #0f172a; color: #fff; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
  .body { padding: 28px 32px; }
  .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .metric { background: #f8fafc; border-radius: 8px; padding: 16px; }
  .metric .label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; font-weight: 600; }
  .metric .value { font-size: 28px; font-weight: 700; margin-top: 4px; color: #0f172a; }
  .metric .sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }
  .cta { text-align: center; margin-top: 28px; }
  .cta a { background: #6366f1; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; }
  .footer { padding: 16px 32px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #9ca3af; text-align: center; }
  .period { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>📊 Weekly Report — ${params.projectName}</h1>
    <p><a href="${params.projectUrl}" style="color:#94a3b8;">${params.projectUrl}</a></p>
  </div>
  <div class="body">
    <p class="period">Week of ${params.weekStart} → ${params.weekEnd}</p>
    <div class="metrics">
      <div class="metric">
        <div class="label">Audit Score</div>
        <div class="value">${score(params.auditScore)}</div>
        <div class="sub">/ 100</div>
      </div>
      <div class="metric">
        <div class="label">SEO Score</div>
        <div class="value">${score(params.seoScore)}</div>
        <div class="sub">/ 100</div>
      </div>
      <div class="metric">
        <div class="label">Security Grade</div>
        <div class="value">${params.securityGrade ?? "—"}</div>
        <div class="sub">headers analysis</div>
      </div>
      <div class="metric">
        <div class="label">Broken Links</div>
        <div class="value">${params.brokenLinksCount}</div>
        <div class="sub">issues found</div>
      </div>
      ${params.uptimePercent != null ? `
      <div class="metric" style="grid-column:1/-1;">
        <div class="label">Uptime This Week</div>
        <div class="value">${pct(params.uptimePercent)}</div>
        <div class="sub">availability</div>
      </div>` : ""}
    </div>
    <div class="cta">
      <a href="${params.appUrl}/dashboard/${params.projectId}">View Full Report →</a>
    </div>
  </div>
  <div class="footer">
    You're receiving this because you have weekly reports enabled on SiteLens.<br/>
    <a href="${params.appUrl}/dashboard/${params.projectId}/settings" style="color:#6366f1;">Manage settings</a>
  </div>
</div>
</body>
</html>`
}
