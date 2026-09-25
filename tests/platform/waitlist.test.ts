import { describe, expect, it } from "vitest";
import { POST as joinWaitlist } from "@/app/api/marketing/waitlist/route";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";

describe("waitlist does not require a user account", () => {
  const db = useTestDatabase();

  it("stores the lead and records the event without a users FK", async () => {
    const response = await callRoute(joinWaitlist, jsonRequest("/api/marketing/waitlist", {
      body: { email: "guest@waitlist.test", name: "אורחת", useCase: "events", contactConsent: true, company: "" },
    }));
    expect(response.status).toBe(201);
    expect(await readJson(response)).toMatchObject({ ok: true });

    const database = await ensureDatabase();
    const lead = await database.prepare("SELECT email, name FROM marketing_leads WHERE email = ?").bind("guest@waitlist.test").first();
    expect(lead).toMatchObject({ email: "guest@waitlist.test", name: "אורחת" });
    const event = await database.prepare("SELECT user_email, event_name FROM marketing_events WHERE event_name = 'waitlist_joined'").first();
    expect(event).toMatchObject({ event_name: "waitlist_joined", user_email: null });
    expect(db().tableNames()).toContain("marketing_leads");
  });
});
