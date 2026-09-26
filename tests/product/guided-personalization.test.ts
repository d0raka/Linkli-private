import { describe, expect, it } from "vitest";
import { birthdayTitle, personalizeBirthday, personalizeEvent } from "@/lib/guided-personalization";
import { getTemplate, safeConfig } from "@/lib/templates";

const birthday = safeConfig(getTemplate("birthday").config, "birthday");
const event = safeConfig(getTemplate("event").config, "event");

describe("guided wizard answers become the first draft", () => {
  it("puts the recipient, shared memory and sender into a birthday page", () => {
    const config = personalizeBirthday(birthday, { recipient: "דניאל", sender: "מאיה", relationship: "חברים מהצבא", memory: "הטיול לאילת", tone: "funny" });
    expect(config.recipient).toBe("דניאל");
    expect(config.headline).toContain("דניאל");
    expect(config.subtitle).toContain("חברים מהצבא");
    expect(config.questions[0].options[0]).toBe("הטיול לאילת");
    expect(config.successText).toContain("באהבה, מאיה");
    expect(config.questions).toHaveLength(birthday.questions.length);
  });

  it("keeps the template copy when optional birthday answers are empty", () => {
    const config = personalizeBirthday(birthday, { recipient: "רוני", sender: "", relationship: "", memory: "", tone: "warm" });
    expect(config.questions[0].options).toEqual(birthday.questions[0].options);
    expect(config.successText).not.toContain("באהבה");
    expect(config.whatsappText).not.toMatch(/[\u2013\u2014]/);
  });

  it("titles the page after the recipient within the server's title limit", () => {
    expect(birthdayTitle({ recipient: "  נועה ", sender: "", relationship: "", memory: "", tone: "warm" })).toBe("הפתעת יום הולדת לנועה");
    expect(birthdayTitle({ recipient: "א".repeat(200), sender: "", relationship: "", memory: "", tone: "warm" }).length).toBeLessThanOrEqual(80);
  });

  it("builds a wedding invitation from both names, the date and the venue", () => {
    const { title, config } = personalizeEvent(event, { name: "נועם", partner: "יעל", date: "2027-06-01T19:30", venue: "הגן", story: "", tone: "formal", whatsappText: "" }, "wedding");
    expect(title).toBe("נועם ויעל מתחתנים");
    expect(config.headline).toBe(title);
    expect(config.eventStartsAt).toBe("2027-06-01T19:30");
    expect(config.venueName).toBe("הגן");
    expect(config.subtitle).toBe("נשמח לכבד אתכם בנוכחותכם ביום שמחתנו.");
    expect(config.whatsappText).toBe(event.whatsappText);
  });

  it("prefers the host's own words for an event", () => {
    const { config } = personalizeEvent(event, { name: "חוגגים לאמא", partner: "", date: "2027-01-01T13:00", venue: "בבית", story: "בואו רעבים", tone: "casual", whatsappText: "נתראה!" }, "event");
    expect(config.headline).toBe("חוגגים לאמא");
    expect(config.subtitle).toBe("בואו רעבים");
    expect(config.whatsappText).toBe("נתראה!");
  });
});
