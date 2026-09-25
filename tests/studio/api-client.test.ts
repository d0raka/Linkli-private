import { describe, expect, it } from "vitest";
import { ApiError, apiFetch } from "@/lib/api-client";

function fetchReturning(status: number, body: string, headers: Record<string, string> = { "content-type": "application/json" }) {
  return async () => new Response(body, { status, headers });
}

describe("FE-02: apiFetch", () => {
  it("returns parsed JSON for successful responses", async () => {
    const data = await apiFetch<{ ok: boolean }>("/api/x", {}, { fetchImpl: fetchReturning(200, JSON.stringify({ ok: true })) });
    expect(data).toEqual({ ok: true });
  });

  it("throws a typed ApiError carrying status, code and feature for API errors", async () => {
    const error = await apiFetch("/api/x", {}, { fetchImpl: fetchReturning(403, JSON.stringify({ error: "נדרש Pro", code: "plan_limit", feature: "photos" })) }).catch((value) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.code).toBe("plan_limit");
    expect(error.feature).toBe("photos");
    expect(error.message).toBe("נדרש Pro");
  });

  it("survives non-JSON error bodies instead of throwing a SyntaxError", async () => {
    const error = await apiFetch("/api/x", {}, { fetchImpl: fetchReturning(500, "<html>Internal Server Error</html>", { "content-type": "text/html" }) }).catch((value) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
    expect(error.message).toMatch(/שגיאה/);
  });

  it("maps network failures and timeouts to ApiError with status 0", async () => {
    const network = await apiFetch("/api/x", {}, { fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }).catch((value) => value);
    expect(network).toBeInstanceOf(ApiError);
    expect(network.status).toBe(0);
    expect(network.code).toBe("network");

    const timeout = await apiFetch("/api/x", {}, {
      timeoutMs: 20,
      fetchImpl: (_input, init) => new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    }).catch((value) => value);
    expect(timeout).toBeInstanceOf(ApiError);
    expect(timeout.code).toBe("timeout");
  });

  it("serializes JSON bodies and sets the content type", async () => {
    let seen: Request | null = null;
    await apiFetch("https://linkli.test/api/x", { method: "POST", json: { a: 1 } }, { fetchImpl: async (input, init) => { seen = new Request(input, init); return new Response("{}", { headers: { "content-type": "application/json" } }); } });
    expect(seen!.headers.get("content-type")).toBe("application/json");
    expect(await seen!.text()).toBe(JSON.stringify({ a: 1 }));
  });
});
