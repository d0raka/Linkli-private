import { describe, expect, it } from "vitest";
import { POST as resetPassword } from "@/app/api/auth/password/reset/route";
import { POST as confirmVerification } from "@/app/api/auth/verification/confirm/route";
import { POST as confirmAccountAction } from "@/app/api/account/confirm/route";
import { consumeAuthToken, issueAuthToken } from "@/lib/account-security";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createUser } from "../helpers/users";
import { callRoute, jsonRequest } from "../helpers/requests";

const CONCURRENCY = 8;

describe("SEC-09: one-time tokens are claimed atomically", () => {
  useTestDatabase();

  it("consumeAuthToken succeeds for exactly one concurrent caller", async () => {
    const user = await createUser({ email: "owner@linkli.test" });
    const token = await issueAuthToken(user.email, "delete_account", 1_800);
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => consumeAuthToken(token, "delete_account")));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("only one of several concurrent password resets with the same token succeeds", async () => {
    const user = await createUser({ email: "owner@linkli.test" });
    const token = await issueAuthToken(user.email, "reset_password", 1_800);
    const responses = await Promise.all(Array.from({ length: CONCURRENCY }, (_, index) =>
      callRoute(resetPassword, jsonRequest("/api/auth/password/reset", { body: { token, password: `brand-new-password-number-${index}` } })),
    ));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    const db = await ensureDatabase();
    const sessions = await db.prepare("SELECT COUNT(*) AS total FROM sessions WHERE user_email = ?").bind(user.email).first("total");
    expect(sessions).toBe(1);
  });

  it("only one of several concurrent verification confirmations succeeds", async () => {
    const user = await createUser({ email: "owner@linkli.test", verified: false });
    const token = await issueAuthToken(user.email, "verify_email", 1_800);
    const responses = await Promise.all(Array.from({ length: CONCURRENCY }, () =>
      callRoute(confirmVerification, jsonRequest("/api/auth/verification/confirm", { body: { token } })),
    ));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
  });

  it("only one of several concurrent account deletions succeeds and the rest report an invalid link", async () => {
    const user = await createUser({ email: "owner@linkli.test" });
    const token = await issueAuthToken(user.email, "delete_account", 1_800);
    const responses = await Promise.all(Array.from({ length: CONCURRENCY }, () =>
      callRoute(confirmAccountAction, jsonRequest("/api/account/confirm", { body: { token, purpose: "delete_account", confirmation: user.email } })),
    ));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 400)).toHaveLength(CONCURRENCY - 1);
  });

  it("rejects expired and reused tokens", async () => {
    const user = await createUser({ email: "owner@linkli.test" });
    const expired = await issueAuthToken(user.email, "reset_password", -10);
    const response = await callRoute(resetPassword, jsonRequest("/api/auth/password/reset", { body: { token: expired, password: "brand-new-password-number-1" } }));
    expect(response.status).toBe(400);
    const token = await issueAuthToken(user.email, "reset_password", 1_800);
    const first = await callRoute(resetPassword, jsonRequest("/api/auth/password/reset", { body: { token, password: "brand-new-password-number-2" } }));
    const second = await callRoute(resetPassword, jsonRequest("/api/auth/password/reset", { body: { token, password: "brand-new-password-number-3" } }));
    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
  });
});
