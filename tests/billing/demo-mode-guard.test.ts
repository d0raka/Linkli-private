import { afterEach, describe, expect, it } from "vitest";
import { billingDemoMode } from "@/lib/billing";
import { resetEnv } from "../shims/cloudflare-workers";
import { TEST_ENV } from "../setup/db";

describe("BILLING_DEMO_MODE cannot enable in production", () => {
  const env = process.env as { NODE_ENV?: string; BILLING_DEMO_MODE?: string };
  const previousNodeEnv = env.NODE_ENV;
  const previousDemo = env.BILLING_DEMO_MODE;

  afterEach(() => {
    env.NODE_ENV = previousNodeEnv;
    if (previousDemo === undefined) delete env.BILLING_DEMO_MODE;
    else env.BILLING_DEMO_MODE = previousDemo;
    resetEnv({ ...TEST_ENV });
  });

  it("ignores the flag when NODE_ENV is production", () => {
    env.NODE_ENV = "production";
    env.BILLING_DEMO_MODE = "1";
    resetEnv({ ...TEST_ENV, BILLING_DEMO_MODE: "1" });
    expect(billingDemoMode()).toBe(false);
  });

  it("still allows the flag in development", () => {
    env.NODE_ENV = "development";
    resetEnv({ ...TEST_ENV, BILLING_DEMO_MODE: "1" });
    expect(billingDemoMode()).toBe(true);
  });
});
