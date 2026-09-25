import { describe, expect, it } from "vitest";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { applyBillingEvent } from "@/lib/billing";
import { planFromUserRow } from "@/lib/plans";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createUser } from "../helpers/users";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";
import { paidEvent, webhookRequest } from "../helpers/billing";

describe("billing webhook truth", () => {
  useTestDatabase();

  it("rejects missing, stale, and wrong signatures", async () => {
    const user = await createUser({ email: "buyer@linkli.test" });
    const body = paidEvent(user.email);
    const unsigned = await callRoute(webhook, jsonRequest("/api/billing/webhook", { body }));
    expect(unsigned.status).toBe(401);

    const stale = await callRoute(webhook, await webhookRequest(body, { timestamp: String(Math.floor(Date.now() / 1000) - 400) }));
    expect(stale.status).toBe(401);

    const wrong = await callRoute(webhook, await webhookRequest(body, { secret: "other-secret-value-32chars-long!!" }));
    expect(wrong.status).toBe(401);
  });

  it("is idempotent on replay and keeps the event row", async () => {
    const user = await createUser({ email: "buyer@linkli.test" });
    const body = paidEvent(user.email, { eventId: "evt_replay_001", customerId: "cus_1" });
    const first = await callRoute(webhook, await webhookRequest(body));
    expect(first.status).toBe(200);
    const replay = await callRoute(webhook, await webhookRequest(body));
    expect(replay.status).toBe(200);
    expect((await readJson(replay)).duplicate).toBe(true);
    const db = await ensureDatabase();
    expect(await db.prepare("SELECT COUNT(*) AS total FROM billing_events WHERE event_id = ?").bind("evt_replay_001").first("total")).toBe(1);
    expect(planFromUserRow(await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(user.email).first())).toBe("pro");
  });

  it("ignores a stale event that arrives after a newer one", async () => {
    const user = await createUser({ email: "buyer@linkli.test" });
    const newer = await callRoute(webhook, await webhookRequest(paidEvent(user.email, {
      eventId: "evt_new_max",
      priceId: "linkli-max",
      occurredAt: "2026-09-02T12:00:00.000Z",
      sequence: 2,
    })));
    expect(newer.status).toBe(200);
    const stale = await callRoute(webhook, await webhookRequest(paidEvent(user.email, {
      eventId: "evt_old_pro",
      priceId: "linkli-pro",
      occurredAt: "2026-09-02T11:00:00.000Z",
      sequence: 1,
    })));
    expect(stale.status).toBe(200);
    expect((await readJson(stale)).ignored).toBe(true);
    const db = await ensureDatabase();
    expect(planFromUserRow(await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(user.email).first())).toBe("max");
    expect(await db.prepare("SELECT status FROM billing_events WHERE event_id = ?").bind("evt_old_pro").first("status")).toBe("ignored");
  });

  it("retries a failed event without deleting it", async () => {
    const user = await createUser({ email: "buyer@linkli.test" });
    const db = await ensureDatabase();
    await db.prepare(
      `INSERT INTO billing_events (event_id, event_type, customer_email, status, provider_event_at, sequence)
       VALUES ('evt_retry_1', 'paid', ?, 'failed', ?, 1)`,
    ).bind(user.email, "2026-09-02T10:00:00.000Z").run();
    const retry = await callRoute(webhook, await webhookRequest(paidEvent(user.email, {
      eventId: "evt_retry_1",
      priceId: "linkli-max",
      occurredAt: "2026-09-02T10:00:00.000Z",
    })));
    expect(retry.status).toBe(200);
    expect((await readJson(retry)).duplicate).not.toBe(true);
    expect(await db.prepare("SELECT status FROM billing_events WHERE event_id = ?").bind("evt_retry_1").first("status")).toBe("processed");
    expect(await db.prepare("SELECT COUNT(*) AS total FROM billing_events WHERE event_id = ?").bind("evt_retry_1").first("total")).toBe(1);
    expect(planFromUserRow(await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(user.email).first())).toBe("max");
  });

  it("marks the event failed when apply throws and leaves it for retry", async () => {
    const user = await createUser({ email: "buyer@linkli.test" });
    const db = await ensureDatabase();
    await db.prepare("DELETE FROM users WHERE email = ?").bind(user.email).run();
    await expect(applyBillingEvent(db, {
      eventId: "evt_missing_user",
      type: "paid",
      email: user.email,
      priceId: "linkli-pro",
    })).rejects.toMatchObject({ status: 404 });
    expect(await db.prepare("SELECT event_id FROM billing_events WHERE event_id = ?").bind("evt_missing_user").first()).toBeNull();
  });
});
