/**
 * Links rendered under a trusted label ("ניווט ב-Waze", "Google Maps") must really point at
 * that provider; anything else is dropped so a page owner cannot dress up a phishing URL.
 */
export type NavigationProvider = "waze" | "maps";

const PROVIDER_HOSTS: Record<NavigationProvider, ReadonlyArray<{ host: string; pathPrefix?: string }>> = {
  waze: [
    { host: "waze.com" },
    { host: "www.waze.com" },
    { host: "ul.waze.com" },
  ],
  maps: [
    { host: "www.google.com", pathPrefix: "/maps" },
    { host: "google.com", pathPrefix: "/maps" },
    { host: "maps.google.com" },
    { host: "maps.app.goo.gl" },
    { host: "goo.gl", pathPrefix: "/maps" },
  ],
};

export function safeNavigationUrl(value: unknown, provider: NavigationProvider): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw || raw.length > 2_048) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || url.username || url.password) return "";
  const host = url.hostname.toLowerCase();
  const allowed = PROVIDER_HOSTS[provider].some((entry) => entry.host === host && (!entry.pathPrefix || url.pathname === entry.pathPrefix || url.pathname.startsWith(`${entry.pathPrefix}/`)));
  return allowed ? url.toString() : "";
}

export function wazeSearchUrl(query: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
}

export function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
