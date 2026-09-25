import { describe, expect, it } from "vitest";
import { requestIdFrom, withRequestId } from "@/lib/http";

describe("request ids", () => {
  it("prefers Cloudflare Ray, then an incoming x-request-id, then a generated id", () => {
    expect(requestIdFrom(new Request("https://linkli.test", { headers: { "cf-ray": "ray-1" } }))).toBe("ray-1");
    expect(requestIdFrom(new Request("https://linkli.test", { headers: { "x-request-id": "req-2" } }))).toBe("req-2");
    expect(requestIdFrom(new Request("https://linkli.test"))).toMatch(/^[0-9a-f-]{8,}$/i);
  });

  it("copies the id onto the response", () => {
    const response = withRequestId(new Response("ok"), "req-9");
    expect(response.headers.get("x-request-id")).toBe("req-9");
  });
});
