const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseCssRootVars(css: string): Record<string, string> {
  const match = css.match(/:root\s*\{([^}]+)\}/);
  if (!match) return {};
  const vars: Record<string, string> = {};
  for (const part of match[1].split(";")) {
    const item = part.match(/--([a-z0-9-]+)\s*:\s*([^;]+)/i);
    if (item) vars[item[1]] = item[2].trim();
  }
  return vars;
}

export function relativeLuminance(hex: string): number {
  const value = hex.trim();
  if (!HEX.test(value)) return 0;
  const raw = value.slice(1);
  const pairs = raw.length === 3
    ? [raw[0] + raw[0], raw[1] + raw[1], raw[2] + raw[2]]
    : [raw.slice(0, 2), raw.slice(2, 4), raw.slice(4, 6)];
  const [red, green, blue] = pairs.map((pair) => {
    const channel = parseInt(pair, 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function resolveReduceMotion({
  saved,
  systemPrefersReduce,
}: {
  saved?: boolean;
  systemPrefersReduce: boolean;
}): boolean {
  return typeof saved === "boolean" ? saved : systemPrefersReduce;
}
