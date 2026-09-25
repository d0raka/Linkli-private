/** Ready-to-send WhatsApp copy. Keep line breaks; do not flatten into one pasted sentence. */

export function tidyWhatsAppText(value: string) {
  return value
    .normalize("NFC")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatHostWhatsAppInvite(input: {
  headline: string;
  tease: string;
  url: string;
  emoji?: string;
}) {
  const headline = input.headline.trim();
  const tease = input.tease.replace(/\s+/g, " ").trim().slice(0, 160);
  const title = [input.emoji, headline].filter(Boolean).join(" ");
  return tidyWhatsAppText([
    title,
    "",
    tease,
    "",
    "תפתחו מכאן:",
    input.url,
    "",
    "נשלח מ־Linkli",
  ].join("\n"));
}

export function formatGuestWhatsAppReply(input: {
  message: string;
  answers: string;
  url?: string;
}) {
  const parts = [input.message.trim()];
  if (input.answers.trim()) {
    parts.push("", "המענה שלי:", input.answers.trim());
  }
  if (input.url) {
    parts.push("", input.url);
  }
  parts.push("", "נשלח מ־Linkli");
  return tidyWhatsAppText(parts.join("\n"));
}

export function whatsappShareHref(text: string, phone = "") {
  return `https://wa.me/${phone}?text=${encodeURIComponent(tidyWhatsAppText(text).slice(0, 1800))}`;
}
