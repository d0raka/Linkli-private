import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../", import.meta.url);

describe("checkout honesty copy", () => {
  it("tells the guest payment will open soon when no method is live", () => {
    const source = readFileSync(new URL("app/checkout/checkout-client.tsx", root), "utf8");
    expect(source).toContain("התשלום ייפתח בקרוב");
    expect(source).toContain("תשלום דרך PayPal (כרטיס או חשבון PayPal)");
  });

  it("does not default the paywall overlay to fake card or bit methods", () => {
    const source = readFileSync(new URL("app/paywall/paywall-overlay.tsx", root), "utf8");
    expect(source).not.toMatch(/availableMethods\s*=\s*\["card",\s*"paypal",\s*"bit"\]/);
  });
});
