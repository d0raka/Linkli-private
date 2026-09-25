import { describe, expect, it } from "vitest";
import { absoluteUrl, canonicalOrigin, PRODUCTION_ORIGIN } from "@/lib/site";
import { actionUrl } from "@/lib/account-security";

describe("SEC-14: absolute URLs ignore the incoming Host header outside development", () => {
  it("returns the production origin for spoofed hosts", () => {
    expect(canonicalOrigin("https://evil.example/path")).toBe(PRODUCTION_ORIGIN);
    expect(canonicalOrigin("evil.example")).toBe(PRODUCTION_ORIGIN);
    expect(canonicalOrigin(null)).toBe(PRODUCTION_ORIGIN);
    expect(absoluteUrl("/?ref=ABC123", "https://evil.example")).toBe(`${PRODUCTION_ORIGIN}/?ref=ABC123`);
  });

  it("builds email action links on the production origin", () => {
    const url = new URL(actionUrl(new Request("https://evil.example/api/auth/register"), "/verify-email", "a".repeat(64)));
    expect(url.origin).toBe(PRODUCTION_ORIGIN);
    expect(url.searchParams.get("token")).toBe("a".repeat(64));
  });
});
