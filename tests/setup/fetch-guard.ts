/**
 * Global setup: no test may reach the network. Outbound fetches are recorded and answered
 * with canned responses (Resend gets a success envelope so email flows can be asserted).
 */
export type RecordedRequest = { url: string; method: string; headers: Record<string, string>; body: string };

export const outboundRequests: RecordedRequest[] = [];

const realFetch = globalThis.fetch;

async function guardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return realFetch(request);
  outboundRequests.push({
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.body ? await request.text() : "",
  });
  if (url.hostname === "api.resend.com") {
    return new Response(JSON.stringify({ id: `email_${outboundRequests.length}` }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (url.hostname === "api-m.paypal.com" || url.hostname === "api-m.sandbox.paypal.com") {
    if (url.pathname.endsWith("/v1/oauth2/token")) {
      return new Response(JSON.stringify({ access_token: "paypal_test_token", token_type: "Bearer" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.pathname.includes("verify-webhook-signature")) {
      let status = "SUCCESS";
      try {
        const payload = JSON.parse(outboundRequests[outboundRequests.length - 1]?.body || "{}") as { transmission_sig?: string };
        if (payload.transmission_sig === "bad-signature") status = "FAILURE";
      } catch {
        status = "FAILURE";
      }
      return new Response(JSON.stringify({ verification_status: status }), { status: 200, headers: { "content-type": "application/json" } });
    }
  }
  return new Response(JSON.stringify({ error: "network disabled in tests" }), { status: 599, headers: { "content-type": "application/json" } });
}

globalThis.fetch = guardedFetch as typeof fetch;

export function lastEmailTo(email: string) {
  for (let index = outboundRequests.length - 1; index >= 0; index -= 1) {
    const request = outboundRequests[index];
    if (!request.url.startsWith("https://api.resend.com/")) continue;
    try {
      const payload = JSON.parse(request.body) as { to?: string[]; subject?: string; html?: string; text?: string };
      if (payload.to?.includes(email)) return payload;
    } catch {
      /* not JSON */
    }
  }
  return null;
}

export function clearOutboundRequests() {
  outboundRequests.length = 0;
}
