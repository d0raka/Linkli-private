const unsafeControlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;

export function plainText(value: unknown, maxCharacters: number, singleLine = false) {
  if (typeof value !== "string") return "";
  let normalized = value.normalize("NFC").replace(unsafeControlCharacters, "").replace(/\r\n?/g, "\n");
  if (singleLine) normalized = normalized.replace(/\s+/g, " ");
  return Array.from(normalized.trim()).slice(0, maxCharacters).join("");
}
