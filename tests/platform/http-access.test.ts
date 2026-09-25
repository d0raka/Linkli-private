import { describe, expect, it } from "vitest";
import { cloudflareAccessMissing, crossOriginResourcePolicy } from "@/lib/http";

describe("Cloudflare Access on admin", () => {
  it("is optional until CF_ACCESS_AUD is configured", () => {
    const request = new Request("https://linkli.online/admin");
    expect(cloudflareAccessMissing("/admin", request, null)).toBe(false);
    expect(cloudflareAccessMissing("/studio", request, "aud-1")).toBe(false);
  });

  it("blocks /admin and /api/admin without the Access identity header", () => {
    const bare = new Request("https://linkli.online/admin");
    expect(cloudflareAccessMissing("/admin", bare, "aud-1")).toBe(true);
    expect(cloudflareAccessMissing("/api/admin/users", bare, "aud-1")).toBe(true);
    const allowed = new Request("https://linkli.online/admin", {
      headers: { "cf-access-authenticated-user-email": "admin@linkli.test" },
    });
    expect(cloudflareAccessMissing("/admin", allowed, "aud-1")).toBe(false);
  });
});

describe("shareable public assets", () => {
  it("lets crawlers load the Open Graph image cross-origin", () => {
    expect(crossOriginResourcePolicy("/og-marketing.jpg")).toBe("cross-origin");
    expect(crossOriginResourcePolicy("/fonts/heebo-400.woff2")).toBe("cross-origin");
    expect(crossOriginResourcePolicy("/api/health")).toBe("same-origin");
    expect(crossOriginResourcePolicy("/studio")).toBe("same-origin");
  });
});
