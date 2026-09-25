import { expect, test } from "@playwright/test";

test.describe("launch share and performance surfaces", () => {
  test("home uses a local OG image and does not fetch Google Fonts", async ({ page }) => {
    const thirdPartyFonts: string[] = [];
    page.on("request", (request) => {
      if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(request.url())) thirdPartyFonts.push(request.url());
    });
    await page.goto("/");
    await expect(page.locator("#main-content")).toBeVisible();
    const html = await page.content();
    expect(html).toMatch(/og-marketing\.jpg/);
    expect(html).toMatch(/og:image|property="og:image"/i);
    expect(thirdPartyFonts).toEqual([]);
  });

  test("the Open Graph file is a compact JPEG", async ({ request }) => {
    const response = await request.get("/og-marketing.jpg");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/image\/jpeg/);
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(8_000);
    expect(body.byteLength).toBeLessThan(300_000);
  });

  test("admin is not a public page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
