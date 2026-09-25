import type { CSSProperties } from "react";
import { ELEMENT_STYLE_KEYS, type ElementStyleKey, type TemplateConfig, type TemplateElementStyle } from "./templates";

export type ElementPosition = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotate?: number;
};

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const DEFAULT_ELEMENT_ORDER: ElementStyleKey[] = [
  "introLabel",
  "emoji",
  "greeting",
  "headline",
  "subtitle",
  "waxEnvelope",
  "countdown",
  "venue",
  "memories",
  "highlights",
  "calendar",
  "musicPlayer",
  "primaryButton",
  "question",
  "options",
  "guestCounter",
  "djSong",
  "resultLabel",
  "resultTitle",
  "voucher",
  "candle",
  "scratch",
  "resultText",
  "answerRecap",
  "shareButtons",
];

const ELEMENT_KEY_SET = new Set<string>(ELEMENT_STYLE_KEYS);

export function isElementStyleKey(value: unknown): value is ElementStyleKey {
  return typeof value === "string" && ELEMENT_KEY_SET.has(value);
}

export function parseElementOrder(value: unknown): ElementStyleKey[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const keys = value.filter(isElementStyleKey);
  return keys.length ? keys : undefined;
}

export function parseElementPosition(value: unknown): ElementPosition | undefined {
  if (!value || typeof value !== "object") return undefined;
  const point = value as Record<string, unknown>;
  if (typeof point.x !== "number" || typeof point.y !== "number") return undefined;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return undefined;
  const next: ElementPosition = { x: clampPercent(point.x), y: clampPercent(point.y) };
  if (typeof point.w === "number" && Number.isFinite(point.w)) next.w = clampSizePercent(point.w);
  if (typeof point.h === "number" && Number.isFinite(point.h)) next.h = clampSizePercent(point.h);
  if (typeof point.rotate === "number" && Number.isFinite(point.rotate)) {
    const rotate = clampRotate(point.rotate);
    if (rotate !== 0) next.rotate = rotate;
  }
  return next;
}

export function parseElementLayout(value: unknown): Partial<Record<ElementStyleKey, ElementPosition>> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  const next: Partial<Record<ElementStyleKey, ElementPosition>> = {};
  for (const key of ELEMENT_STYLE_KEYS) {
    const parsed = parseElementPosition(input[key]);
    if (parsed) next[key] = parsed;
  }
  return Object.keys(next).length ? next : undefined;
}

export function resolveElementOrder(config: Pick<TemplateConfig, "elementOrder">): ElementStyleKey[] {
  const custom = config.elementOrder?.filter(isElementStyleKey) ?? [];
  const seen = new Set<ElementStyleKey>();
  const next: ElementStyleKey[] = [];
  for (const key of [...custom, ...DEFAULT_ELEMENT_ORDER]) {
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }
  return next;
}

export const TEXT_LAYOUT_KEYS = new Set<ElementStyleKey>([
  "introLabel",
  "greeting",
  "headline",
  "subtitle",
  "resultLabel",
  "resultTitle",
  "resultText",
  "question",
  "highlights",
  "primaryButton",
]);

export const CENTERED_COPY_KEYS = new Set<ElementStyleKey>([
  "introLabel",
  "greeting",
  "headline",
  "subtitle",
  "resultLabel",
  "resultTitle",
  "resultText",
  "question",
]);

export function isTextLayoutKey(key: ElementStyleKey) {
  return TEXT_LAYOUT_KEYS.has(key);
}

export const CHILD_FILL_KEYS = new Set<ElementStyleKey>(["shareButtons"]);

export function paintsChildFill(key: ElementStyleKey) {
  return CHILD_FILL_KEYS.has(key);
}

export function resolvedCopyAlign(key: ElementStyleKey, align?: TemplateElementStyle["align"]) {
  if (CENTERED_COPY_KEYS.has(key)) return "center";
  return align;
}

export const FLOW_LOCKED_KEYS = new Set<ElementStyleKey>(["options", "decorations"]);

export function isFlowLockedKey(key: ElementStyleKey) {
  return FLOW_LOCKED_KEYS.has(key);
}

export function elementHasFreeLayout(config: Pick<TemplateConfig, "elementLayout">, key: ElementStyleKey) {
  if (isFlowLockedKey(key)) return false;
  return Boolean(config.elementLayout?.[key]);
}

export function elementLayoutStyle(
  config: Pick<TemplateConfig, "elementOrder" | "elementLayout">,
  key: ElementStyleKey,
): CSSProperties {
  const pos = isFlowLockedKey(key) ? undefined : config.elementLayout?.[key];
  if (pos) {
    const rotate = pos.rotate ?? 0;
    return {
      position: "absolute",
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      ...(pos.w != null ? { width: `${pos.w}%` } : {}),
      ...(pos.h != null && !isTextLayoutKey(key) ? { height: `${pos.h}%` } : {}),
      transform: rotate ? `translate(-50%, -50%) rotate(${rotate}deg)` : "translate(-50%, -50%)",
      transformOrigin: "center center",
      boxSizing: "border-box",
      zIndex: 5,
      margin: 0,
    };
  }
  if (!config.elementOrder?.length) return {};
  const index = resolveElementOrder(config).indexOf(key);
  return index === -1 ? {} : { order: index };
}

function isGenericWhite(value: string) {
  return /^#(?:fff(?:fff)?)$/i.test(value.trim());
}

/** Keep the emoji glyph optically centered after move/resize, and restore the soft badge background. */
export function composeEmojiElementStyle(
  config: Pick<TemplateConfig, "elementLayout" | "emojiBackground" | "accentSoft">,
  layout: CSSProperties,
  style?: TemplateElementStyle,
): CSSProperties {
  const free = layout.position === "absolute";
  const rotate = config.elementLayout?.emoji?.rotate ?? -4;
  const themeBackground = config.emojiBackground || config.accentSoft;
  const background = style
    ? (style.background && !isGenericWhite(style.background) ? style.background : themeBackground)
    : undefined;

  return {
    ...layout,
    lineHeight: 1,
    display: "grid",
    placeItems: "center",
    padding: 0,
    overflow: "hidden",
    transform: free ? `translate(-50%, -50%) rotate(${rotate}deg)` : `rotate(${rotate}deg)`,
    ...(background ? { backgroundColor: background } : {}),
    ...(style ? {
      color: style.color,
      borderColor: style.accent,
      borderRadius: `${style.radius}px`,
    } : {}),
  };
}

export function insertElementInOrder(
  order: ElementStyleKey[],
  key: ElementStyleKey,
  target: ElementStyleKey,
  before: boolean,
): ElementStyleKey[] {
  const next = order.filter((item) => item !== key);
  const index = next.indexOf(target);
  const at = index === -1 ? next.length : before ? index : index + 1;
  next.splice(at, 0, key);
  return next;
}

export function setElementFreePosition(
  layout: Partial<Record<ElementStyleKey, ElementPosition>> | undefined,
  key: ElementStyleKey,
  x: number,
  y: number,
  extra?: Partial<Pick<ElementPosition, "w" | "h" | "rotate">>,
): Partial<Record<ElementStyleKey, ElementPosition>> {
  if (isFlowLockedKey(key)) return layout || {};
  const prev = layout?.[key];
  const clearHeight = isTextLayoutKey(key) || (extra && Object.prototype.hasOwnProperty.call(extra, "h") && extra.h == null);
  return {
    ...layout,
    [key]: compactPosition({
      x: clampPercent(x),
      y: clampPercent(y),
      w: extra?.w ?? prev?.w,
      h: clearHeight ? undefined : extra?.h ?? prev?.h,
      rotate: extra?.rotate !== undefined ? extra.rotate : prev?.rotate,
    }),
  };
}

export function unpinElement(
  layout: Partial<Record<ElementStyleKey, ElementPosition>> | undefined,
  key: ElementStyleKey,
): Partial<Record<ElementStyleKey, ElementPosition>> | undefined {
  if (!layout?.[key]) return layout;
  const next = { ...layout };
  delete next[key];
  return Object.keys(next).length ? next : undefined;
}

export function resizeElementFromHandle(
  origin: Required<Pick<ElementPosition, "x" | "y">> & { w: number; h: number; rotate?: number },
  handle: ResizeHandle,
  pointerX: number,
  pointerY: number,
): ElementPosition {
  const rotate = origin.rotate ?? 0;
  const local = toLocal(pointerX, pointerY, origin.x, origin.y, rotate);
  let left = -origin.w / 2;
  let top = -origin.h / 2;
  let right = origin.w / 2;
  let bottom = origin.h / 2;

  if (handle === "w" || handle === "nw" || handle === "sw") left = local.x;
  if (handle === "e" || handle === "ne" || handle === "se") right = local.x;
  if (handle === "n" || handle === "nw" || handle === "ne") top = local.y;
  if (handle === "s" || handle === "sw" || handle === "se") bottom = local.y;

  if (right - left < MIN_SIZE_W) {
    if (handle === "w" || handle === "nw" || handle === "sw") left = right - MIN_SIZE_W;
    else right = left + MIN_SIZE_W;
  }
  if (bottom - top < MIN_SIZE_H) {
    if (handle === "n" || handle === "nw" || handle === "ne") top = bottom - MIN_SIZE_H;
    else bottom = top + MIN_SIZE_H;
  }

  const w = clampSizePercent(right - left);
  const h = clampSizePercent(bottom - top);
  const center = toWorld((left + right) / 2, (top + bottom) / 2, origin.x, origin.y, rotate);
  return compactPosition({
    x: clampPercent(center.x),
    y: clampPercent(center.y),
    w,
    h,
    rotate,
  });
}

export function rotateElementFromDrag(originRotate: number, startAngle: number, currentAngle: number) {
  return snapRotate(clampRotate(originRotate + radToDeg(currentAngle - startAngle)));
}

export type SnapGuides = { v?: number; h?: number };

export function snapPosition(
  x: number,
  y: number,
  targets: { x: number; y: number }[],
  threshold = 2.8,
): { x: number; y: number; guides: SnapGuides } {
  const xs = [50, ...targets.map((item) => item.x)];
  const ys = [50, ...targets.map((item) => item.y)];
  let nextX = x;
  let nextY = y;
  const guides: SnapGuides = {};
  let bestX = threshold;
  let bestY = threshold;
  for (const axis of xs) {
    const distance = Math.abs(x - axis);
    if (distance <= bestX) {
      bestX = distance;
      nextX = axis;
      guides.v = axis;
    }
  }
  for (const axis of ys) {
    const distance = Math.abs(y - axis);
    if (distance <= bestY) {
      bestY = distance;
      nextY = axis;
      guides.h = axis;
    }
  }
  return {
    x: clampPercent(nextX),
    y: clampPercent(nextY),
    guides,
  };
}

export function clampPercent(value: number) {
  return Math.min(94, Math.max(6, Math.round(value * 10) / 10));
}

export function clampSizePercent(value: number) {
  return Math.min(92, Math.max(6, Math.round(value * 10) / 10));
}

export function clampRotate(value: number) {
  let rotate = value % 360;
  if (rotate > 180) rotate -= 360;
  if (rotate <= -180) rotate += 360;
  return Math.round(rotate * 10) / 10;
}

export function applyCanvasKeyAction(
  pos: ElementPosition,
  input: { key: string; shiftKey?: boolean },
  step = 1,
): ElementPosition | null {
  const width = pos.w ?? 20;
  const height = pos.h ?? 16;
  const rotate = pos.rotate ?? 0;
  const shift = Boolean(input.shiftKey);

  if (shift) {
    if (input.key === "ArrowRight") return compactPosition({ ...pos, w: clampSizePercent(width + step) });
    if (input.key === "ArrowLeft") return compactPosition({ ...pos, w: clampSizePercent(width - step) });
    if (input.key === "ArrowDown") return compactPosition({ ...pos, h: clampSizePercent(height + step) });
    if (input.key === "ArrowUp") return compactPosition({ ...pos, h: clampSizePercent(height - step) });
  } else {
    if (input.key === "ArrowRight") return compactPosition({ ...pos, x: clampPercent(pos.x + step) });
    if (input.key === "ArrowLeft") return compactPosition({ ...pos, x: clampPercent(pos.x - step) });
    if (input.key === "ArrowDown") return compactPosition({ ...pos, y: clampPercent(pos.y + step) });
    if (input.key === "ArrowUp") return compactPosition({ ...pos, y: clampPercent(pos.y - step) });
  }

  if (input.key === "]" || input.key === "BracketRight") {
    return compactPosition({ ...pos, rotate: clampRotate(rotate + 5) });
  }
  if (input.key === "[" || input.key === "BracketLeft") {
    return compactPosition({ ...pos, rotate: clampRotate(rotate - 5) });
  }
  return null;
}

const MIN_SIZE_W = 8;
const MIN_SIZE_H = 6;
const SNAP_ANGLES = [0, 45, -45, 90, -90, 135, -135, 180, -180];

function compactPosition(pos: ElementPosition): ElementPosition {
  const next: ElementPosition = { x: pos.x, y: pos.y };
  if (pos.w != null) next.w = pos.w;
  if (pos.h != null) next.h = pos.h;
  if (pos.rotate) next.rotate = pos.rotate;
  return next;
}

function toLocal(x: number, y: number, cx: number, cy: number, deg: number) {
  const rad = degToRad(-deg);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: dx * Math.cos(rad) - dy * Math.sin(rad),
    y: dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function toWorld(x: number, y: number, cx: number, cy: number, deg: number) {
  const rad = degToRad(deg);
  return {
    x: cx + x * Math.cos(rad) - y * Math.sin(rad),
    y: cy + x * Math.sin(rad) + y * Math.cos(rad),
  };
}

function snapRotate(value: number) {
  for (const angle of SNAP_ANGLES) {
    if (Math.abs(value - angle) <= 3) return angle === -180 ? 180 : angle;
  }
  return value;
}

function degToRad(value: number) {
  return (value * Math.PI) / 180;
}

function radToDeg(value: number) {
  return (value * 180) / Math.PI;
}
