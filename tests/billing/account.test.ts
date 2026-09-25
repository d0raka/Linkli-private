import { describe, expect, it } from "vitest";
import { PATCH as accountPatch } from "@/app/api/account/route";
import { deleteOwnedAccount } from "@/lib/account-security";
import { applyBillingEvent } from "@/lib/billing";
import { rewardReferralIfNeeded } from "@/lib/referrals";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createUser, DEFAULT_PASSWORD, sessionCookieFor } from "../helpers/users";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";

describe("account deletion vs subscriptions", () => {
  useTestDatabase();

  it("refuses deletion while a subscription is active and keeps a billing tombstone after a later delete", async () => {
    const user = await createUser({ email: "sub@linkli.test" });
    const db = await ensureDatabase();
    await applyBillingEvent(db, {
      eventId: "evt_del_sub",
      type: "subscription_active",
      email: user.email,
      priceId: "linkli-business",
      subscriptionId: "sub_keep",
      customerId: "cus_keep",
      occurredAt: "2026-09-02T00:00:00.000Z",
      sequence: 1,
    });
    await expect(deleteOwnedAccount(user.email)).rejects.toMatchObject({ status: 409, code: "subscription_active" });
    expect(await db.prepare("SELECT email FROM users WHERE email = ?").bind(user.email).first()).toBeTruthy();

    const cookies = await sessionCookieFor(user.email);
    const request = await callRoute(accountPatch, jsonRequest("/api/account", {
      method: "PATCH",
      body: { action: "delete_request", confirmation: user.email, currentPassword: DEFAULT_PASSWORD },
    }), { cookies });
    expect(request.status).toBe(409);
    expect((await readJson(request)).code).toBe("subscription_active");

    await applyBillingEvent(db, {
      eventId: "evt_del_cancel",
      type: "cancelled",
      email: user.email,
      priceId: "linkli-business",
      subscriptionId: "sub_keep",
      occurredAt: "2026-09-03T00:00:00.000Z",
      sequence: 2,
    });
    const deleted = await deleteOwnedAccount(user.email);
    expect(deleted?.email).toBe(user.email);
    expect(await db.prepare("SELECT email FROM users WHERE email = ?").bind(user.email).first()).toBeNull();
    expect(await db.prepare("SELECT deleted_at, provider_customer_id FROM billing_customers WHERE user_email = ?").bind(user.email).first())
      .toMatchObject({ provider_customer_id: "cus_keep" });
    expect(await db.prepare("SELECT id FROM subscriptions WHERE user_email = ?").bind(user.email).first()).toBeTruthy();
  });
});

describe("atomic referral rewards", () => {
  useTestDatabase();

  it("credits the referrer once even if two paid events race", async () => {
    const referrer = await createUser({ email: "ref@linkli.test" });
    const buyer = await createUser({ email: "friend@linkli.test" });
    const db = await ensureDatabase();
    await db.prepare("UPDATE users SET referral_code = ? WHERE email = ?").bind("ABCD2345", referrer.email).run();
    await db.prepare("UPDATE users SET referred_by = ? WHERE email = ?").bind("ABCD2345", buyer.email).run();
    await Promise.all([
      rewardReferralIfNeeded(db, buyer.email, "pro"),
      rewardReferralIfNeeded(db, buyer.email, "max"),
    ]);
    expect(await db.prepare("SELECT bonus_pages FROM users WHERE email = ?").bind(referrer.email).first("bonus_pages")).toBe(1);
    expect(await db.prepare("SELECT referral_rewarded FROM users WHERE email = ?").bind(buyer.email).first("referral_rewarded")).toBe(1);
  });
});
