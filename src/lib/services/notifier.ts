// Webhook Notifier — SiteLens
//
// Sends Slack / Discord / generic webhook payloads for notification events.
// Formats differ per channel type to match native message styling.

export type NotificationChannelType = "SLACK" | "DISCORD" | "EMAIL"
export type NotificationEvent =
  | "AUDIT_COMPLETE"
  | "AUDIT_FAILED"
  | "SCORE_DROP"
  | "BROKEN_LINKS_FOUND"
  | "SECURITY_GRADE_DROP"

export interface NotificationPayload {
  event: NotificationEvent
  projectName: string
  projectUrl: string
  dashboardUrl: string
  // Optional context fields depending on event
  score?: number
  previousScore?: number
  auditRunId?: string
  grade?: string
  brokenCount?: number
  errorMessage?: string
}

interface Channel {
  type: NotificationChannelType
  url: string
  name: string
}

// ─── Slack Block Kit message ──────────────────────────────────────────────────

function buildSlackMessage(payload: NotificationPayload): object {
  const { event, projectName, projectUrl, dashboardUrl } = payload

  const emojiMap: Record<NotificationEvent, string> = {
    AUDIT_COMPLETE:       ":white_check_mark:",
    AUDIT_FAILED:         ":x:",
    SCORE_DROP:           ":chart_with_downwards_trend:",
    BROKEN_LINKS_FOUND:   ":broken_heart:",
    SECURITY_GRADE_DROP:  ":shield:",
  }

  const titleMap: Record<NotificationEvent, string> = {
    AUDIT_COMPLETE:       "Audit Complete",
    AUDIT_FAILED:         "Audit Failed",
    SCORE_DROP:           "Score Drop Detected",
    BROKEN_LINKS_FOUND:   "Broken Links Found",
    SECURITY_GRADE_DROP:  "Security Grade Drop",
  }

  const bodyLines: string[] = []
  if (payload.score !== undefined)         bodyLines.push(`*Score:* ${payload.score}/100`)
  if (payload.previousScore !== undefined) bodyLines.push(`*Previous:* ${payload.previousScore}/100`)
  if (payload.grade !== undefined)         bodyLines.push(`*Grade:* ${payload.grade}`)
  if (payload.brokenCount !== undefined)   bodyLines.push(`*Broken links:* ${payload.brokenCount}`)
  if (payload.errorMessage)               bodyLines.push(`*Error:* ${payload.errorMessage}`)

  return {
    text: `${emojiMap[event]} *${titleMap[event]}* — ${projectName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emojiMap[event]} *${titleMap[event]}*\n*Project:* <${projectUrl}|${projectName}>${bodyLines.length > 0 ? "\n" + bodyLines.join("\n") : ""}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Dashboard" },
            url: dashboardUrl,
            style: "primary",
          },
        ],
      },
      { type: "divider" },
    ],
  }
}

// ─── Discord Embed message ────────────────────────────────────────────────────

function buildDiscordMessage(payload: NotificationPayload): object {
  const { event, projectName, projectUrl, dashboardUrl } = payload

  const colorMap: Record<NotificationEvent, number> = {
    AUDIT_COMPLETE:       0x22c55e,  // green
    AUDIT_FAILED:         0xef4444,  // red
    SCORE_DROP:           0xf59e0b,  // amber
    BROKEN_LINKS_FOUND:   0xf97316,  // orange
    SECURITY_GRADE_DROP:  0x8b5cf6,  // violet
  }

  const titleMap: Record<NotificationEvent, string> = {
    AUDIT_COMPLETE:       "✅ Audit Complete",
    AUDIT_FAILED:         "❌ Audit Failed",
    SCORE_DROP:           "📉 Score Drop Detected",
    BROKEN_LINKS_FOUND:   "🔗 Broken Links Found",
    SECURITY_GRADE_DROP:  "🛡️ Security Grade Drop",
  }

  const fields: { name: string; value: string; inline: boolean }[] = []
  if (payload.score !== undefined)         fields.push({ name: "Score", value: `${payload.score}/100`, inline: true })
  if (payload.previousScore !== undefined) fields.push({ name: "Previous", value: `${payload.previousScore}/100`, inline: true })
  if (payload.grade !== undefined)         fields.push({ name: "Grade", value: payload.grade, inline: true })
  if (payload.brokenCount !== undefined)   fields.push({ name: "Broken links", value: `${payload.brokenCount}`, inline: true })
  if (payload.errorMessage)               fields.push({ name: "Error", value: payload.errorMessage, inline: false })

  return {
    embeds: [
      {
        title: titleMap[event],
        description: `**Project:** [${projectName}](${projectUrl})`,
        color: colorMap[event],
        fields,
        footer: { text: "SiteLens" },
        timestamp: new Date().toISOString(),
        url: dashboardUrl,
      },
    ],
  }
}

// ─── Send to a single channel ─────────────────────────────────────────────────

export async function sendNotification(
  channel: Channel,
  payload: NotificationPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body =
      channel.type === "DISCORD"
        ? buildDiscordMessage(payload)
        : buildSlackMessage(payload)  // SLACK and EMAIL both use Slack-compatible format for generic webhooks

    const res = await fetch(channel.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// ─── Fan-out: fire to all enabled channels for a given event ─────────────────

export async function fireEvent(
  channels: Channel[],
  payload: NotificationPayload,
): Promise<void> {
  await Promise.allSettled(
    channels.map((ch) => sendNotification(ch, payload)),
  )
}
