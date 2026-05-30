import assert from "node:assert/strict"
import test from "node:test"
import {
  assertSafeExternalHttpUrl,
  normalizeExternalHttpUrl,
  UnsafeExternalUrlError,
} from "../src/lib/security/url.ts"

function assertUnsafe(value: string) {
  assert.throws(() => normalizeExternalHttpUrl(value), UnsafeExternalUrlError)
}

test("normalizeExternalHttpUrl accepts public http and https URLs", async () => {
  assert.equal(
    await assertSafeExternalHttpUrl("https://example.com/path#fragment", { resolveDns: false }),
    "https://example.com/path",
  )
  assert.equal(
    await assertSafeExternalHttpUrl("http://example.com", { resolveDns: false }),
    "http://example.com/",
  )
})

test("normalizeExternalHttpUrl rejects non-http protocols and credentials", () => {
  assertUnsafe("file:///etc/passwd")
  assertUnsafe("ftp://example.com")
  assertUnsafe("https://user:pass@example.com")
})

test("normalizeExternalHttpUrl rejects localhost and metadata hostnames", () => {
  assertUnsafe("http://localhost")
  assertUnsafe("http://localhost.")
  assertUnsafe("http://app.localhost")
  assertUnsafe("http://metadata.google.internal")
})

test("normalizeExternalHttpUrl rejects private IPv4 ranges", () => {
  assertUnsafe("http://127.0.0.1")
  assertUnsafe("http://10.0.0.1")
  assertUnsafe("http://172.16.0.1")
  assertUnsafe("http://192.168.1.1")
  assertUnsafe("http://169.254.169.254")
  assertUnsafe("http://100.64.0.1")
})

test("normalizeExternalHttpUrl rejects local IPv6 ranges", () => {
  assertUnsafe("http://[::1]")
  assertUnsafe("http://[fc00::1]")
  assertUnsafe("http://[fe80::1]")
  assertUnsafe("http://[::ffff:127.0.0.1]")
})
