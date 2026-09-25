import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PUBLIC_PATHS = ["/", "/login", "/register", "/paywall", "/preview/birthday"];

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return results.violations.filter((item) => item.impact === "critical" || item.impact === "serious");
}

test.describe("public accessibility", () => {
  for (const path of PUBLIC_PATHS) {
    test(`${path} has no serious axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("#main-content")).toBeVisible();
      expect(await seriousViolations(page), path).toEqual([]);
    });
  }

  test("404 page has a document title", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-linkli");
    await expect(page).toHaveTitle(/לא נמצא|אינו זמין/);
  });

  test("login can be completed with the keyboard as far as the submit button", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[name=email]").focus();
    await page.keyboard.type("guest@linkli.test");
    await page.keyboard.press("Tab");
    await expect(page.locator("input[name=password]")).toBeFocused();
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });
});

test.describe("mobile landing menu", () => {
  test("opens navigation that is otherwise hidden on a phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "phone viewport only");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "תפריט", exact: true });
    await expect(toggle).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "תבניות" })).toBeHidden();
    await toggle.click();
    await expect(page.getByRole("navigation").getByRole("link", { name: "תבניות" })).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test("the accessibility widget can stop animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const cookie = page.getByRole("button", { name: "הבנתי" });
    if (await cookie.isVisible()) await cookie.click();
    await page.getByRole("button", { name: "פתיחת תפריט נגישות" }).click();
    const stop = page.getByRole("button", { name: /עצירת אנימציות/ });
    await expect(stop).toBeVisible();
    if ((await stop.getAttribute("aria-pressed")) !== "true") await stop.click();
    await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  });
});
