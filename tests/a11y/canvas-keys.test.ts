import { describe, expect, it } from "vitest";
import { applyCanvasKeyAction } from "@/lib/element-layout";

const origin = { x: 40, y: 40, w: 20, h: 16, rotate: 0 };

describe("A11Y-03: keyboard canvas nudge, resize, and rotate", () => {
  it("nudges with arrow keys and returns null for unrelated keys", () => {
    expect(applyCanvasKeyAction(origin, { key: "ArrowRight" })?.x).toBe(41);
    expect(applyCanvasKeyAction(origin, { key: "ArrowLeft" })?.x).toBe(39);
    expect(applyCanvasKeyAction(origin, { key: "ArrowDown" })?.y).toBe(41);
    expect(applyCanvasKeyAction(origin, { key: "ArrowUp" })?.y).toBe(39);
    expect(applyCanvasKeyAction(origin, { key: "Escape" })).toBeNull();
  });

  it("resizes with Shift+arrows and rotates with [ and ]", () => {
    expect(applyCanvasKeyAction(origin, { key: "ArrowRight", shiftKey: true })?.w).toBe(21);
    expect(applyCanvasKeyAction(origin, { key: "ArrowDown", shiftKey: true })?.h).toBe(17);
    expect(applyCanvasKeyAction(origin, { key: "ArrowLeft", shiftKey: true })?.w).toBe(19);
    expect(applyCanvasKeyAction(origin, { key: "ArrowUp", shiftKey: true })?.h).toBe(15);
    expect(applyCanvasKeyAction(origin, { key: "]" })?.rotate).toBe(5);
    expect(applyCanvasKeyAction(origin, { key: "[" })?.rotate).toBe(-5);
  });
});
