import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

const DEFAULT_DNS_TIMEOUT_MS = 1_500

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
])

export class UnsafeExternalUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UnsafeExternalUrlError"
  }
}

export function isUnsafeExternalUrlError(error: unknown): error is UnsafeExternalUrlError {
  return error instanceof UnsafeExternalUrlError
}

export type ExternalUrlOptions = {
  resolveDns?: boolean
  dnsTimeoutMs?: number
}

export function normalizeExternalHttpUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new UnsafeExternalUrlError("URL is required.")

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new UnsafeExternalUrlError("Enter a valid URL.")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeExternalUrlError("Only http:// and https:// URLs are allowed.")
  }

  if (url.username || url.password) {
    throw new UnsafeExternalUrlError("URLs must not include credentials.")
  }

  const hostname = normalizeHostname(url.hostname)
  if (isBlockedHostname(hostname)) {
    throw new UnsafeExternalUrlError("Local and internal hostnames are not allowed.")
  }

  if (isBlockedIpAddress(hostname)) {
    throw new UnsafeExternalUrlError("Local and private network addresses are not allowed.")
  }

  url.hash = ""
  return url.toString()
}

export async function assertSafeExternalHttpUrl(
  value: string,
  options: ExternalUrlOptions = {},
): Promise<string> {
  const normalized = normalizeExternalHttpUrl(value)

  if (options.resolveDns !== false) {
    await assertPublicDnsResolution(
      new URL(normalized).hostname,
      options.dnsTimeoutMs ?? DEFAULT_DNS_TIMEOUT_MS,
    )
  }

  return normalized
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "")
}

function isBlockedHostname(hostname: string): boolean {
  return (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".localdomain")
  )
}

function isBlockedIpAddress(hostname: string): boolean {
  const ipVersion = isIP(hostname)
  if (ipVersion === 4) return isBlockedIpv4(hostname)
  if (ipVersion === 6) return isBlockedIpv6(hostname)
  return false
}

function isBlockedIpv4(address: string): boolean {
  const octets = address.split(".").map((part) => Number(part))
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) {
    return true
  }

  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0)
  )
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase()
  if (normalized.startsWith("::ffff:")) return true

  const mappedIpv4 = normalized.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mappedIpv4) return isBlockedIpv4(mappedIpv4[1])

  if (normalized === "::" || normalized === "::1") return true

  const firstHextet = Number.parseInt(normalized.split(":")[0] || "0", 16)
  if (!Number.isFinite(firstHextet)) return true

  return (
    (firstHextet & 0xfe00) === 0xfc00 ||
    (firstHextet & 0xffc0) === 0xfe80 ||
    (firstHextet & 0xff00) === 0xff00 ||
    (firstHextet === 0x2001 && normalized.startsWith("2001:db8"))
  )
}

async function assertPublicDnsResolution(hostname: string, timeoutMs: number) {
  if (isIP(hostname)) return

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let records: Array<{ address: string }>
  try {
    records = (await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("DNS lookup timed out.")), timeoutMs)
      }),
    ])) as Array<{ address: string }>
  } catch {
    throw new UnsafeExternalUrlError("URL hostname could not be resolved.")
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  if (records.length === 0) {
    throw new UnsafeExternalUrlError("URL hostname could not be resolved.")
  }

  if (records.some((record) => isBlockedIpAddress(record.address))) {
    throw new UnsafeExternalUrlError("URL resolves to a local or private network address.")
  }
}
