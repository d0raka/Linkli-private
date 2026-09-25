import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../", import.meta.url);

describe("staging readiness that can be checked in-repo", () => {
  it("exposes GET /api/health for probes", () => {
    expect(existsSync(new URL("app/api/health/route.ts", root))).toBe(true);
    expect(readFileSync(new URL("app/api/health/route.ts", root), "utf8")).toMatch(/SELECT 1 AS ok/);
  });

  it("purges expired RSVPs on a Worker cron", () => {
    expect(readFileSync(new URL("worker/index.ts", root), "utf8")).toMatch(/purgeExpiredRsvps/);
    expect(readFileSync(new URL("vite.config.ts", root), "utf8")).toMatch(/crons:\s*\["15 3 \* \* \*"\]/);
  });

  it("documents Cloudflare Access and required production secrets", () => {
    const example = readFileSync(new URL(".env.example", root), "utf8");
    expect(example).toMatch(/CF_ACCESS_AUD=/);
    expect(example).toMatch(/AUTH_PEPPER=/);
    expect(example).toMatch(/BILLING_WEBHOOK_SECRET=/);
  });
  it("declares media and image bindings and a production runbook", () => {
    expect(JSON.parse(readFileSync(new URL(".openai/hosting.json", root), "utf8")).r2).toBe("MEDIA");
    const config = readFileSync(new URL("vite.config.ts", root), "utf8");
    expect(config).toContain('binding: "ASSETS"');
    expect(config).toContain('binding: "IMAGES"');
    expect(config).toContain('bucket_name: "linkli-media"');
    const runbook = readFileSync(new URL("docs/ops/launch-runbook.md", root), "utf8");
    expect(runbook).toContain("Workers Paid");
    expect(runbook).toContain("linkli-restore-rehearsal");
    expect(runbook).toContain("unverified owner actions");
    const example = readFileSync(new URL(".env.example", root), "utf8");
    expect(example).toContain("BILLING_STATE_SECRET=");
    expect(example).not.toContain("dor.aka.inbox@gmail.com");
    expect(example).not.toMatch(/^BILLING_DEMO_MODE=/m);
  });

});
