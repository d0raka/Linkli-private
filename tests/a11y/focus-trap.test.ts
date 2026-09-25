import { describe, expect, it } from "vitest";
import { wrapFocusIndex } from "@/lib/a11y";

describe("A11Y-06: focus trap wrapping", () => {
  it("cycles forward from the last item back to the first", () => {
    expect(wrapFocusIndex(2, 1, 3)).toBe(0);
  });

  it("cycles backward from the first item to the last", () => {
    expect(wrapFocusIndex(0, -1, 3)).toBe(2);
  });
});
