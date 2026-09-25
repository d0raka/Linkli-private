const PRIVATE_PATHS = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
]);

const PRIVATE_PREFIXES = ["/studio", "/admin", "/account", "/checkout", "/payment/"];

export function shouldDisableHttpStore(pathname: string) {
  if (pathname.startsWith("/api/public/")) return false;
  if (pathname.startsWith("/api/")) return true;
  if (PRIVATE_PATHS.has(pathname)) return true;
  return PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function requiresCloudflareAccess(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin");
}

/** When Access is configured, /admin must present the identity header the edge sets after JWT validation. */
export function cloudflareAccessMissing(pathname: string, request: Request, accessAud: string | null | undefined) {
  if (!accessAud) return false;
  if (!requiresCloudflareAccess(pathname)) return false;
  return !request.headers.get("cf-access-authenticated-user-email");
}

export function crossOriginResourcePolicy(pathname: string) {
  if (
    pathname === "/og-marketing.png"
    || pathname === "/og-marketing.jpg"
    || pathname.startsWith("/fonts/")
    || pathname === "/icon.svg"
    || pathname === "/favicon.png"
    || pathname === "/favicon.svg"
  ) {
    return "cross-origin";
  }
  return "same-origin";
}

export function requestIdFrom(request: Request) {
  return request.headers.get("cf-ray") || request.headers.get("x-request-id") || crypto.randomUUID();
}

export function withRequestId(response: Response, requestId: string) {
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
