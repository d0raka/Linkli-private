import { describe, expect, it } from "vitest";
import { POST as contact } from "@/app/api/contact/route";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";
import { lastEmailTo, outboundRequests } from "../setup/fetch-guard";

const payload = {
  name: "דנה כהן",
  email: "dana@guest.test",
  topic: "billing",
  message: "לא הצלחתי לפתוח את התשלום וצריכה עזרה.",
  company: "",
};

describe("contact form stores the request and emails support", () => {
  useTestDatabase({ SUPPORT_INBOX: "support@linkli.test", EMAIL_REPLY_TO: "support@linkli.test" });

  it("keeps a support_requests row and sends Hebrew mail to the support inbox", async () => {
    const response = await callRoute(contact, jsonRequest("/api/contact", { body: payload }));
    expect(response.status).toBe(201);
    expect(await readJson(response)).toMatchObject({ ok: true });

    const db = await ensureDatabase();
    const row = await db.prepare("SELECT name, email, topic, message FROM support_requests WHERE email = ?").bind(payload.email).first();
    expect(row).toMatchObject({ name: payload.name, email: payload.email, topic: "billing", message: payload.message });

    const mail = lastEmailTo("support@linkli.test");
    expect(mail?.subject).toMatch(/פנייה חדשה/);
    expect(mail?.text).toContain(payload.message);
    expect(mail?.text).toContain(payload.email);
    expect(outboundRequests.some((request) => request.url.startsWith("https://api.resend.com/"))).toBe(true);
  });
});

describe("contact form without email configured", () => {
  useTestDatabase({ RESEND_API_KEY: "", EMAIL_FROM: "", SUPPORT_INBOX: "" });

  it("still stores the request and does not pretend mail was sent", async () => {
    const response = await callRoute(contact, jsonRequest("/api/contact", { body: payload }));
    expect(response.status).toBe(201);
    expect(await readJson(response)).toMatchObject({ ok: true });
    const db = await ensureDatabase();
    expect(await db.prepare("SELECT COUNT(*) AS total FROM support_requests").first("total")).toBe(1);
    expect(outboundRequests.filter((request) => request.url.startsWith("https://api.resend.com/"))).toEqual([]);
  });
});
