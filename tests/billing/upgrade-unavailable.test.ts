import { describe, expect, it } from "vitest";
import { POST as upgrade } from "@/app/api/billing/upgrade/route";
import { GET as billingStatus } from "@/app/api/billing/status/route";
import { useTestDatabase } from "../setup/db";
import { createUser, sessionCookieFor } from "../helpers/users";
import { callRoute, getRequest, jsonRequest, readJson } from "../helpers/requests";

describe("upgrade without provider or demo mode", () => {
  useTestDatabase();

  it("returns 503 and leaves the user on free", async () => {
    const user = await createUser({ email: "blocked@linkli.test" });
    const cookies = await sessionCookieFor(user.email);
    const response = await callRoute(upgrade, jsonRequest("/api/billing/upgrade", { body: { method: "card", plan: "pro" } }), { cookies });
    expect(response.status).toBe(503);
    const status = await callRoute(billingStatus, getRequest("/api/billing/status"), { cookies });
    expect(await readJson(status)).toMatchObject({ plan: "free", entitled: false });
  });

  it("refuses Business at checkout because it is waitlist-only", async () => {
    const user = await createUser({ email: "bizwait@linkli.test" });
    const cookies = await sessionCookieFor(user.email);
    const response = await callRoute(upgrade, jsonRequest("/api/billing/upgrade", { body: { method: "card", plan: "business" } }), { cookies });
    expect(response.status).toBe(400);
    expect((await readJson(response)).code).toBe("waitlist");
  });
});
