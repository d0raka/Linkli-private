import { describe, expect, it } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { safeReturnTo } from "@/lib/auth";
import { useTestDatabase } from "../setup/db";
import { lastEmailTo } from "../setup/fetch-guard";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";

describe("SEC-07: returnTo never carries personal content", () => {
  useTestDatabase();

  it("strips every query parameter except the allowlisted launch keys", () => {
    expect(safeReturnTo("/studio/create?template=birthday&recipient=Dana&memory=our%20secret&tone=warm")).toBe("/studio/create?template=birthday");
    expect(safeReturnTo("/studio/create?template=birthday&draft=r0abc")).toBe("/studio/create?template=birthday&draft=r0abc");
    expect(safeReturnTo("/studio/create?draft=<script>")).toBe("/studio/create");
    const id = "6f1d2c3e-4b5a-4c6d-8e7f-90a1b2c3d4e5";
    expect(safeReturnTo(`/studio?edit=${id}`)).toBe(`/studio?edit=${id}`);
    expect(safeReturnTo("/studio?edit=not-a-uuid")).toBe("/studio");
    expect(safeReturnTo("/checkout?plan=max")).toBe("/checkout?plan=max");
    expect(safeReturnTo("/checkout?plan=evil")).toBe("/checkout");
  });

  it("keeps the existing path allowlist and fallbacks", () => {
    expect(safeReturnTo("https://evil.example/studio")).toBe("/studio");
    expect(safeReturnTo("//evil.example")).toBe("/studio");
    expect(safeReturnTo("/admin/users")).toBe("/studio");
    expect(safeReturnTo("/account")).toBe("/account");
    expect(safeReturnTo(undefined, "/checkout")).toBe("/checkout");
  });

  it("registration emails and redirects never include wizard content from returnTo", async () => {
    const response = await callRoute(register, jsonRequest("/api/auth/register", {
      body: {
        email: "new@linkli.test",
        displayName: "New User",
        password: "a-perfectly-fine-long-password",
        acceptTerms: true,
        returnTo: "/studio/create?template=birthday&memory=very-private-memory&recipient=Dana",
      },
    }));
    expect(response.status).toBe(201);
    const data = await readJson<{ redirectTo: string }>(response);
    expect(data.redirectTo).not.toContain("very-private-memory");
    const email = lastEmailTo("new@linkli.test");
    expect(email).not.toBeNull();
    expect(`${email?.html}${email?.text}`).not.toContain("very-private-memory");
    expect(`${email?.html}${email?.text}`).toContain("template%3Dbirthday");
  });
});
