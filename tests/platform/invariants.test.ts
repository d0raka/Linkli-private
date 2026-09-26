import { readFileSync, existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FONT_FAMILIES } from "@/lib/templates";
import { allAppCss } from "../helpers/css";

const root = new URL("../../", import.meta.url);

describe("M7 platform invariants", () => {
  it("self-hosts Heebo and Rubik instead of loading Google Fonts at runtime", () => {
    const css = allAppCss();
    expect(css).not.toMatch(/fonts\.googleapis\.com/);
    expect(css).toMatch(/@font-face[^}]+font-family:\s*["']Heebo["']/);
    expect(css).toMatch(/@font-face[^}]+font-family:\s*["']Rubik["']/);
    expect(existsSync(new URL("public/fonts/heebo-400.woff2", root))).toBe(true);
    expect(existsSync(new URL("public/fonts/rubik-700.woff2", root))).toBe(true);
  });

  it("lists only hosted Hebrew fonts in Studio pickers", () => {
    const studio = readFileSync(new URL("app/studio/editor/editor.tsx", root), "utf8");
    const allowed = new Set<string>(FONT_FAMILIES);
    const options = Array.from(studio.matchAll(/<option value="([^"]+)">[^<]*(?:Rubik|Heebo|Assistant|Varela|Secular)[^<]*<\/option>/g), (match) => match[1]);
    expect(options.length).toBeGreaterThan(0);
    expect(options.filter((name) => !allowed.has(name))).toEqual([]);
  });

  it("does not allow Google Fonts in the CSP", () => {
    const worker = readFileSync(new URL("worker/index.ts", root), "utf8");
    expect(worker).not.toMatch(/fonts\.googleapis\.com/);
    expect(worker).not.toMatch(/fonts\.gstatic\.com/);
  });

  it("ships a local Open Graph image small enough for WhatsApp", () => {
    const file = new URL("public/og-marketing.jpg", root);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file).byteLength).toBeLessThan(300_000);
  });

  it("keeps every drizzle table in the runtime schema", () => {
    const schema = readFileSync(new URL("db/schema.ts", root), "utf8");
    const drizzleDir = new URL("drizzle/", root);
    const tables = new Set<string>();
    for (const file of readdirSync(drizzleDir).filter((name) => name.endsWith(".sql"))) {
      const sql = readFileSync(new URL(file, drizzleDir), "utf8");
      for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi)) {
        tables.add(match[1]);
      }
    }
    expect(tables.size).toBeGreaterThan(5);
    for (const table of tables) {
      expect(schema, table).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
    }
  });

  it("loads the editor bundle and its stylesheet only on the editor route", () => {
    const route = readFileSync(new URL("app/studio/[id]/page.tsx", root), "utf8");
    expect(route).toMatch(/studio\/editor\/editor-screen/);
    expect(route).toMatch(/studio\/editor\.css/);
    expect(readFileSync(new URL("app/layout.tsx", root), "utf8")).not.toMatch(/editor\.css/);
    expect(readFileSync(new URL("app/studio/editor.css", root), "utf8")).toMatch(/\.studio-body/);
  });
});
