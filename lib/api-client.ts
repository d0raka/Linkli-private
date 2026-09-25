/**
 * Small fetch wrapper for the client: JSON in/out, a timeout, and one error type that carries the
 * API's status, `code` and `feature` fields. Non-JSON error bodies (HTML 500 pages, proxies) never
 * surface as SyntaxErrors, and network failures are distinguishable from API errors.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly feature?: string,
    readonly data: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export type ApiFetchInit = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit | null };
export type ApiFetchOptions = { timeoutMs?: number; fetchImpl?: typeof fetch };

const GENERIC_ERROR = "אירעה שגיאה. נסו שוב בעוד רגע.";
const NETWORK_ERROR = "לא הצלחנו להתחבר לשרת. בדקו את החיבור ונסו שוב.";
const TIMEOUT_ERROR = "השרת לא הגיב בזמן. נסו שוב בעוד רגע.";

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function apiFetch<T = Record<string, unknown>>(input: string, init: ApiFetchInit = {}, options: ApiFetchOptions = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  if (init.signal) init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  const requestHeaders = new Headers(headers);
  if (json !== undefined) requestHeaders.set("content-type", "application/json");
  let response: Response;
  try {
    response = await fetchImpl(input, { ...rest, headers: requestHeaders, body: json !== undefined ? JSON.stringify(json) : init.body, signal: controller.signal });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new ApiError(aborted ? TIMEOUT_ERROR : NETWORK_ERROR, 0, aborted ? "timeout" : "network");
  } finally {
    clearTimeout(timeout);
  }
  const data = await parseJson(response);
  if (!response.ok) {
    const message = typeof data.error === "string" && data.error ? data.error : GENERIC_ERROR;
    throw new ApiError(message, response.status, typeof data.code === "string" ? data.code : undefined, typeof data.feature === "string" ? data.feature : undefined, data);
  }
  return data as T;
}

export function errorMessage(error: unknown, fallback = GENERIC_ERROR) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Only same-origin relative paths may be used for client-side redirects taken from API responses. */
export function safeRelativePath(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
