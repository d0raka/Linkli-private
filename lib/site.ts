export const PRODUCTION_ORIGIN = "https://linkli.online";

/**
 * Absolute URLs (metadata, emails, referral links) are pinned to the production origin outside
 * development so a spoofed Host header can never poison links or cached metadata.
 */
export function canonicalOrigin(requestUrlOrHost?: string | URL | null) {
  if (process.env.NODE_ENV === "development" && requestUrlOrHost) {
    try {
      const url = typeof requestUrlOrHost === "string" && !/^https?:\/\//.test(requestUrlOrHost)
        ? new URL(`http://${requestUrlOrHost}`)
        : new URL(requestUrlOrHost);
      return url.origin;
    } catch {
      return PRODUCTION_ORIGIN;
    }
  }
  return PRODUCTION_ORIGIN;
}

export function absoluteUrl(path: string, requestUrlOrHost?: string | URL | null) {
  return new URL(path, canonicalOrigin(requestUrlOrHost)).toString();
}
