import { runWithRequestContext } from "../shims/next-headers";

export const ORIGIN = "https://linkli.test";

// Route modules type their own params shape; the helper only needs to hand over a Promise of them.
export type RouteHandler = (request: Request, context: any) => Promise<Response>;

export function jsonRequest(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string>; crossSite?: boolean; rawBody?: string } = {}) {
  const url = new URL(path, ORIGIN);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init.crossSite ? { origin: "https://evil.example", "sec-fetch-site": "cross-site" } : { origin: url.origin, "sec-fetch-site": "same-origin" }),
    ...init.headers,
  };
  const body = init.rawBody ?? (init.body === undefined ? undefined : JSON.stringify(init.body));
  return new Request(url, { method: init.method ?? "POST", headers, body });
}

export function getRequest(path: string, headers: Record<string, string> = {}) {
  return new Request(new URL(path, ORIGIN), { method: "GET", headers });
}

/** Invokes a route handler inside a simulated Next request scope (cookies/headers). */
export function callRoute(handler: RouteHandler, request: Request, options: { cookies?: Record<string, string>; params?: Record<string, string> } = {}) {
  return runWithRequestContext({ cookies: options.cookies, headers: request.headers }, () =>
    handler(request, { params: Promise.resolve(options.params ?? {}) }),
  );
}

export async function readJson<T = Record<string, unknown>>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}
