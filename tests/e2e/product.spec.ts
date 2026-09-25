import { expect, test, type Page } from "@playwright/test";
import { templates } from "../../lib/templates";
import { localUser, signInFixture } from "./local-fixture";

export async function journey(page: Page) {
  const wax = page.locator(".wax-envelope-card");
  if (await wax.isVisible()) await wax.click();
  await page.locator(".experience-intro .experience-primary").click();
  await expect(page.locator(".experience-intro")).toHaveCount(0);
  for (let i=0;i<10 && await page.locator(".experience-question").isVisible();i++) {
    if (await page.locator(".experience-options button").count()) await page.locator(".experience-options button").first().click();
    if (await page.getByRole("button",{name:"עוד אורח",exact:true}).isVisible()) await page.getByRole("button",{name:"עוד אורח",exact:true}).click();
    if (await page.locator("#guest-dj-song").isVisible()) await page.locator("#guest-dj-song").fill("שיר של שבת");
    const question = page.locator(".experience-question");
    const prompt = await question.locator("h2").textContent();
    await page.locator(".experience-navigation .experience-primary").click();
    await expect.poll(async () => {
      if (!(await question.isVisible())) return "done";
      return await question.locator("h2").textContent();
    }).not.toBe(prompt);
  }
  if (await page.locator(".experience-rsvp-form").isVisible()) {
    await page.getByLabel("השם שלכם",{exact:true}).fill("אורחת בדיקה");
    await page.locator(".experience-rsvp-form input[type=checkbox]").check();
    await page.getByRole("button",{name:"שליחת האישור",exact:true}).click();
  }
  await expect(page.locator(".experience-restart")).toBeVisible();
}

test.describe("guest journeys",()=>{
  for (const template of templates) test(`${template.id}: tap, next, finale and WhatsApp`,async({page})=>{
    await page.goto(`/preview/${template.id}`);
    await journey(page);
    const candle=page.locator(".birthday-candle-box"); if(await candle.isVisible()) await candle.click();
    const gift=page.locator(".gift-voucher-card"); if(await gift.isVisible()) { await gift.focus(); await page.keyboard.press("Enter"); await expect(page.locator(".voucher-code")).toBeVisible(); }
    const scratch=page.locator(".scratch-reveal-btn"); if(await scratch.isVisible()) { await scratch.click(); await expect(page.locator(".scratch-canvas")).toHaveCount(0); }
    await expect(page.locator(".share-pill-wa")).toHaveAttribute("href",/^https:\/\/wa.me\/\?text=/);
    expect(await page.locator(".experience-copy").first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(15);
    await page.locator(".experience-restart").click();
    await expect(page.locator(".experience-intro")).toBeVisible();
  });
});

test("landing invitation is interactive and not blocked by framing policy",async({page})=>{
  await page.goto("/");
  await page.locator(".invitation-demo .experience-primary").click();
  await expect(page.locator(".invitation-demo .experience-question")).toBeVisible();
});

for(const template of ["birthday","event","wedding"] as const) test(`${template}: guided create, edit, preview, publish`,async({page,context,request})=>{
  const user=await localUser(request,"max");await signInFixture(context,user);
  await page.addInitScript(() => localStorage.setItem("linkli-cookie-notice-v1", "accepted"));
  await page.goto(`/create/${template}`);
  if(template==="birthday") {
    await page.getByLabel("שם חתן או כלת יום ההולדת").fill("דניאל בדיקה");
    await page.getByRole("button",{name:/^המשך/}).click();
    await page.getByLabel("זיכרון או בדיחה פנימית").fill("הטיול שבו הלכנו לאיבוד ומצאנו קפה");
    await page.getByRole("button",{name:/^המשך/}).click();
    await page.getByRole("link",{name:/פתיחת ההפתעה בעורך/}).click();
  }else{
    await page.getByLabel(template==="event"?"שם האירוע":"השם הראשון",{exact:true}).fill("נועם בדיקה");
    if(template==="wedding") await page.getByLabel("השם השני").fill("יעל");
    await page.getByRole("button",{name:"ממשיכים",exact:true}).click();
    await page.getByLabel("מתי נפגשים").fill("2027-09-18T19:30");
    await page.getByLabel("איפה חוגגים").fill("החצר שלנו");
    await page.getByRole("button",{name:"ממשיכים",exact:true}).click();
    await page.getByRole("link",{name:"להכנת ההזמנה"}).click();
  }
  await expect(page.locator(".editor-workspace.visual-editor")).toBeVisible();
  await page.locator(".preview-el-headline").fill(`הזמנה אישית ${template}`);
  await expect(page.locator(".whatsapp-warning").first()).toBeVisible();
  await page.locator(".editor-publish-button").click();
  await expect(page.getByRole("link",{name:"שיתוף ב־וואטסאפ"})).toBeVisible();
  const row=user.db.prepare("SELECT id,slug FROM projects WHERE owner_email=? ORDER BY created_at DESC").get(user.email) as {id:string;slug:string};
  await page.goto(`/studio/preview/${row.id}`);
  if(template!=="birthday") await expect(page.getByText("מצב בדיקה — התשובה לא נשמרת אצל האורחים",{exact:true})).toBeVisible();
  await journey(page);
  expect(user.db.prepare("SELECT COUNT(*) n FROM rsvp_responses WHERE project_id=?").get(row.id)?.n).toBe(0);
  await page.goto(`/p/${row.slug}`);
  await expect(page.getByRole("heading",{name:`הזמנה אישית ${template}`,exact:true})).toBeVisible();
  await journey(page);
  if(template!=="birthday") expect(user.db.prepare("SELECT COUNT(*) n FROM rsvp_responses WHERE project_id=?").get(row.id)?.n).toBe(1);
  await expect(page.locator(".share-pill-wa")).toHaveAttribute("href",/^https:\/\/wa.me\/\?text=/);
  user.db.close();
});
