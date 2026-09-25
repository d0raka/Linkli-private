import { describe, expect, it } from "vitest";
import { primaryPublishIntent, publishPlan } from "@/lib/studio-actions";

describe("FE-01: the primary publish button never unpublishes", () => {
  it("offers publish for drafts and update for live pages", () => {
    expect(primaryPublishIntent({ published: false })).toBe("publish");
    expect(primaryPublishIntent({ published: true })).toBe("update");
  });

  it("publishing saves first and then turns the page on", () => {
    expect(publishPlan("publish")).toEqual({ save: true, publishRequest: { published: true } });
  });

  it("updating a live page only saves and keeps it published", () => {
    expect(publishPlan("update")).toEqual({ save: true, publishRequest: null });
  });

  it("unpublishing is an explicit, separate intent that does not save drafts", () => {
    expect(publishPlan("unpublish")).toEqual({ save: false, publishRequest: { published: false } });
  });
});
