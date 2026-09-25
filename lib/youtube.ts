const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

export function youtubeVideoId(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (YOUTUBE_ID.test(raw)) return raw;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return YOUTUBE_ID.test(id) ? id : "";
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      const fromQuery = url.searchParams.get("v") || "";
      if (YOUTUBE_ID.test(fromQuery)) return fromQuery;
      const parts = url.pathname.split("/").filter(Boolean);
      const nested = parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" ? parts[1] : "";
      return YOUTUBE_ID.test(nested || "") ? nested : "";
    }
  } catch {
    return "";
  }
  return "";
}
