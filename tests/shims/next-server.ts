/**
 * Test replacement for `next/server`. Re-exports the real response/request classes and
 * replaces `after()` (which needs the framework request scope) with an immediate runner.
 */
export { NextResponse } from "next/dist/server/web/spec-extension/response.js";
export { NextRequest } from "next/dist/server/web/spec-extension/request.js";

export function after(task: unknown) {
  const result = typeof task === "function" ? (task as () => unknown)() : task;
  if (result instanceof Promise) result.catch(() => {});
}
