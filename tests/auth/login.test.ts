import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as listProjects } from "@/app/api/projects/route";
import { useTestDatabase } from "../setup/db";
import { createUser, SESSION_COOKIE } from "../helpers/users";
import { callRoute, getRequest, jsonRequest, readJson } from "../helpers/requests";

describe("POST /api/auth/login", () => {
  useTestDatabase();

  it("issues a session cookie for valid credentials", async () => {
    const user = await createUser({ email: "owner@linkli.test" });
    const response = await callRoute(login, jsonRequest("/api/auth/login", { body: { email: user.email, password: user.password } }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") || "";
    expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE}=[0-9a-f]{64}; Path=/; HttpOnly; SameSite=Lax`));
    const token = cookie.split(";")[0].split("=")[1];
    const projects = await callRoute(listProjects as never, getRequest("/api/projects"), { cookies: { [SESSION_COOKIE]: token } });
    expect(projects.status).toBe(200);
    expect((await readJson<{ profile: { email: string } }>(projects)).profile.email).toBe(user.email);
  });

  it("rejects wrong passwords with a generic 401", async () => {
    const user = await createUser({ email: "owner@linkli.test" });
    const response = await callRoute(login, jsonRequest("/api/auth/login", { body: { email: user.email, password: "definitely-not-the-password" } }));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("blocks cross-site submissions", async () => {
    const user = await createUser({ email: "owner@linkli.test" });
    const response = await callRoute(login, jsonRequest("/api/auth/login", { body: { email: user.email, password: user.password }, crossSite: true }));
    expect(response.status).toBe(403);
  });
});
