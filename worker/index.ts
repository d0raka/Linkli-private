import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { cloudflareAccessMissing, crossOriginResourcePolicy, requestIdFrom, shouldDisableHttpStore } from "../lib/http";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://www.youtube.com https://www.youtube-nocookie.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "manifest-src 'self'",
].join("; ");

function secureResponse(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  const requestId = requestIdFrom(request);
  headers.set("Content-Security-Policy", contentSecurityPolicy);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", crossOriginResourcePolicy(new URL(request.url).pathname));
  headers.set("Origin-Agent-Cluster", "?1");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  headers.set("x-request-id", requestId);
  if (new URL(request.url).protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  const pathname = new URL(request.url).pathname;
  if (shouldDisableHttpStore(pathname)) {
    headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  if (response.status >= 500) {
    console.error(JSON.stringify({ level: "error", status: response.status, path: pathname, requestId }));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const worker = {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/og-marketing.png") {
      url.pathname = "/og-marketing.jpg";
      return Response.redirect(url, 301);
    }
    const accessAud = typeof env?.CF_ACCESS_AUD === "string" ? env.CF_ACCESS_AUD : null;
    if (cloudflareAccessMissing(url.pathname, request, accessAud)) {
      return new Response("Unauthorized", { status: 401, headers: { "cache-control": "no-store" } });
    }
    if (url.pathname === "/_vinext/image") {
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES]);
      return secureResponse(response, request);
    }
    return secureResponse(await handler.fetch(request, env, ctx), request);
  },
  async scheduled(_controller: unknown, env: any, ctx: { waitUntil: (promise: Promise<unknown>) => void }) {
    ctx.waitUntil((async () => {
      try {
        const runtime = await import("cloudflare:workers") as { env?: Record<string, unknown> };
        if (runtime.env && env) Object.assign(runtime.env, env);
      } catch {
        /* bindings are already available */
      }
      const { ensureDatabase } = await import("../db");
      const { purgeExpiredRsvps } = await import("../lib/rsvp");
      await purgeExpiredRsvps(await ensureDatabase());
    })());
  },
};

export default worker;
