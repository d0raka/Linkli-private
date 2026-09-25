import type { CSSProperties } from "react";

export const DECORATION_EDGES = ["top", "bottom", "right", "left"] as const;
export type DecorationEdge = (typeof DECORATION_EDGES)[number];

export const DECORATION_EDGE_LABELS: Record<DecorationEdge, string> = {
  top: "למעלה",
  bottom: "למטה",
  right: "מימין",
  left: "משמאל",
};

export function normalizeDecorationEdge(value: unknown, fallback: DecorationEdge): DecorationEdge {
  return DECORATION_EDGES.includes(value as DecorationEdge) ? (value as DecorationEdge) : fallback;
}

export function clampDecorationCount(value: unknown, fallback = 12): number {
  const next = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(24, Math.max(4, Math.round(next)));
}

export function clampDecorationSpeed(value: unknown, fallback = 1): number {
  const next = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(2.2, Math.max(0.4, Math.round(next * 10) / 10));
}

export function decorationSpeedLabel(speed: number): string {
  if (speed <= 0.7) return "איטי";
  if (speed >= 1.6) return "מהיר";
  return "רגיל";
}

function edgePoint(edge: DecorationEdge, t: number) {
  const along = 4 + t * 92;
  if (edge === "top") return { x: along, y: -16 };
  if (edge === "bottom") return { x: along, y: 116 };
  if (edge === "left") return { x: -16, y: along };
  return { x: 116, y: along };
}

export function decorationMotionKey(config: {
  decorations: string[];
  decorationFrom?: string;
  decorationTo?: string;
  decorationCount?: number;
  decorationSpeed?: number;
}) {
  return [
    normalizeDecorationEdge(config.decorationFrom, "top"),
    normalizeDecorationEdge(config.decorationTo, "bottom"),
    clampDecorationCount(config.decorationCount),
    clampDecorationSpeed(config.decorationSpeed),
    config.decorations.join(""),
  ].join(":");
}

export function buildDecorationItems(config: {
  decorations: string[];
  emoji: string;
  decorationFrom?: string;
  decorationTo?: string;
  decorationCount?: number;
  decorationSpeed?: number;
}) {
  const from = normalizeDecorationEdge(config.decorationFrom, "top");
  const to = normalizeDecorationEdge(config.decorationTo, "bottom");
  const count = clampDecorationCount(config.decorationCount);
  const speed = clampDecorationSpeed(config.decorationSpeed);
  const icons = config.decorations.length ? config.decorations : [config.emoji || "✨"];

  return Array.from({ length: count }, (_, index) => {
    const start = edgePoint(from, ((index * 17) % 97) / 97);
    const end = edgePoint(to, ((index * 37 + 13) % 97) / 97);
    const sameEdge = from === to;
    const mid = {
      x: (start.x + end.x) / 2 + (index % 2 ? 9 : -9),
      y: (start.y + end.y) / 2 + (index % 3 === 0 ? 7 : -5),
    };
    if (sameEdge) {
      if (from === "top") mid.y = 28;
      if (from === "bottom") mid.y = 72;
      if (from === "left") mid.x = 28;
      if (from === "right") mid.x = 72;
    }

    return {
      value: icons[index % icons.length],
      style: {
        "--deco-x0": `${start.x}%`,
        "--deco-y0": `${start.y}%`,
        "--deco-x1": `${mid.x}%`,
        "--deco-y1": `${mid.y}%`,
        "--deco-x2": `${end.x}%`,
        "--deco-y2": `${end.y}%`,
        animationDelay: `${-((index * 0.73) % 7)}s`,
        animationDuration: `${(6.4 + (index % 5) * 1.15) / speed}s`,
        fontSize: `${16 + (index % 4) * 5}px`,
      } as CSSProperties,
    };
  });
}
