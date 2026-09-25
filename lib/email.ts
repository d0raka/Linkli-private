import { runtimeValue } from "@/db";

type AuthEmail = {
  to: string;
  displayName: string;
  actionUrl: string;
  type: "verify_email" | "reset_password" | "change_password" | "delete_account";
};

export type EmailDelivery = { sent: true } | { sent: false; reason: "unconfigured" | "provider_error" };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] || character);
}

export function emailDeliveryConfigured() {
  return Boolean(runtimeValue("RESEND_API_KEY") && runtimeValue("EMAIL_FROM"));
}

async function deliverResend(input: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailDelivery> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        "content-type": "application/json",
        "user-agent": "Linkli/1.0",
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });
    if (!response.ok) {
      console.error("Transactional email provider rejected a request", response.status);
      return { sent: false, reason: "provider_error" };
    }
    return { sent: true };
  } catch (error) {
    console.error("Transactional email delivery failed", error instanceof Error ? error.message : "unknown error");
    return { sent: false, reason: "provider_error" };
  }
}

export async function sendAuthEmail(message: AuthEmail): Promise<EmailDelivery> {
  const apiKey = runtimeValue("RESEND_API_KEY");
  const from = runtimeValue("EMAIL_FROM");
  if (!apiKey || !from) return { sent: false, reason: "unconfigured" };

  const copy = {
    verify_email: {
      subject: "אימות כתובת הדוא״ל שלך ב־Linkli",
      heading: "נשאר רק לאמת את כתובת הדוא״ל",
      explanation: "לחיצה על הכפתור תאשר שהכתובת הזו שייכת לך ותשלים את הגדרת החשבון.",
      button: "אימות כתובת הדוא״ל",
    },
    reset_password: {
      subject: "איפוס הסיסמה שלך ב־Linkli",
      heading: "ביקשת לאפס את הסיסמה",
      explanation: "הקישור תקף למשך 30 דקות וניתן להשתמש בו פעם אחת בלבד. אם לא ביקשת לאפס סיסמה, אפשר להתעלם מההודעה.",
      button: "בחירת סיסמה חדשה",
    },
    change_password: {
      subject: "אישור שינוי הסיסמה ב־Linkli",
      heading: "לאשר את שינוי הסיסמה",
      explanation: "קיבלנו בקשה לשנות את הסיסמה בחשבון. הקישור תקף למשך 30 דקות, ורק אחרי האישור הסיסמה החדשה תיכנס לתוקף. אם לא ביקשת את זה — אפשר להתעלם מההודעה, והסיסמה הנוכחית נשארת.",
      button: "אישור שינוי הסיסמה",
    },
    delete_account: {
      subject: "אישור מחיקת החשבון ב־Linkli",
      heading: "מחיקת החשבון היא סופית",
      explanation: "קיבלנו בקשה למחוק את החשבון. הקישור תקף למשך 30 דקות. אחרי האישור יימחקו החשבון, כל העמודים והנתונים — ואי אפשר לבטל. אם לא ביקשת את זה, אפשר להתעלם מההודעה.",
      button: "המשך למחיקת החשבון",
    },
  }[message.type];
  const subject = copy.subject;
  const heading = copy.heading;
  const explanation = copy.explanation;
  const button = copy.button;
  const safeName = escapeHtml(message.displayName || "");
  const safeUrl = escapeHtml(message.actionUrl);
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f7f5fa;font-family:Arial,sans-serif;color:#2d2140"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff;border:1px solid #e9e4ed;border-radius:20px"><tr><td style="padding:34px"><div style="font-size:24px;font-weight:800;margin-bottom:28px">Link<span style="color:#ef476f">li</span></div><p style="margin:0 0 10px">שלום ${safeName},</p><h1 style="font-size:27px;line-height:1.3;margin:0 0 14px">${heading}</h1><p style="color:#6f6677;line-height:1.7;margin:0 0 26px">${explanation}</p><a href="${safeUrl}" style="display:inline-block;background:#ef476f;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:11px">${button}</a><p style="color:#8c8392;font-size:12px;line-height:1.6;margin:28px 0 0">אם הכפתור לא נפתח, העתיקו את הקישור הבא לדפדפן:<br><span dir="ltr" style="word-break:break-all">${safeUrl}</span></p></td></tr></table></td></tr></table></body></html>`;
  const text = `שלום ${message.displayName},\n\n${heading}\n${explanation}\n\n${message.actionUrl}`;
  return deliverResend({
    apiKey,
    from,
    to: [message.to],
    subject,
    html,
    text,
    replyTo: runtimeValue("EMAIL_REPLY_TO") || undefined,
  });
}

export async function sendRsvpOwnerEmail(message: {
  to: string;
  displayName: string;
  pageTitle: string;
  guestName: string;
  status: "yes" | "maybe" | "no";
  total: number;
}): Promise<EmailDelivery> {
  const apiKey = runtimeValue("RESEND_API_KEY");
  const from = runtimeValue("EMAIL_FROM");
  if (!apiKey || !from) return { sent: false, reason: "unconfigured" };

  const statusLabel = message.status === "yes" ? "מגיע/ה" : message.status === "maybe" ? "עדיין לא בטוח/ה" : "לא יוכל/תוכל להגיע";
  const safeName = escapeHtml(message.displayName || "");
  const safeGuest = escapeHtml(message.guestName);
  const safeTitle = escapeHtml(message.pageTitle);
  const subject = `אישור הגעה חדש ל«${message.pageTitle}»`;
  const heading = "אורח חדש מילא אישור הגעה";
  const explanation = `${message.guestName} סימן/ה «${statusLabel}». עד עכשיו נשמרו ${message.total} מענים בעמוד «${message.pageTitle}».`;
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f7f5fa;font-family:Arial,sans-serif;color:#2d2140"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff;border:1px solid #e9e4ed;border-radius:20px"><tr><td style="padding:34px"><div style="font-size:24px;font-weight:800;margin-bottom:28px">Link<span style="color:#ef476f">li</span></div><p style="margin:0 0 10px">שלום ${safeName},</p><h1 style="font-size:27px;line-height:1.3;margin:0 0 14px">${heading}</h1><p style="color:#6f6677;line-height:1.7;margin:0 0 26px">${escapeHtml(explanation)}</p><p style="color:#6f6677;line-height:1.7">אורח: <b>${safeGuest}</b><br>עמוד: ${safeTitle}</p></td></tr></table></td></tr></table></body></html>`;
  const text = `שלום ${message.displayName},\n\n${heading}\n${explanation}`;
  return deliverResend({
    apiKey,
    from,
    to: [message.to],
    subject,
    html,
    text,
    replyTo: runtimeValue("EMAIL_REPLY_TO") || undefined,
  });
}

const SUPPORT_TOPICS: Record<string, string> = {
  general: "שאלה כללית",
  billing: "חיוב",
  accessibility: "נגישות",
  privacy: "פרטיות",
  technical: "תקלה",
};

export async function sendSupportEmail(message: {
  name: string;
  email: string;
  topic: string;
  body: string;
  pageUrl?: string;
}): Promise<EmailDelivery> {
  const apiKey = runtimeValue("RESEND_API_KEY");
  const from = runtimeValue("EMAIL_FROM");
  const inbox = runtimeValue("SUPPORT_INBOX") || runtimeValue("EMAIL_REPLY_TO");
  if (!apiKey || !from || !inbox) return { sent: false, reason: "unconfigured" };

  const topicLabel = SUPPORT_TOPICS[message.topic] || SUPPORT_TOPICS.general;
  const subject = `פנייה חדשה ב־Linkli · ${topicLabel}`;
  const heading = "התקבלה פנייה חדשה מטופס יצירת הקשר";
  const explanation = `${message.name} כתב/ה בנושא ${topicLabel}. הפנייה נשמרה גם במסך הניהול.`;
  const safeName = escapeHtml(message.name);
  const safeEmail = escapeHtml(message.email);
  const safeBody = escapeHtml(message.body).replace(/\n/g, "<br>");
  const safePage = message.pageUrl ? escapeHtml(message.pageUrl) : "";
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f7f5fa;font-family:Arial,sans-serif;color:#2d2140"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff;border:1px solid #e9e4ed;border-radius:20px"><tr><td style="padding:34px"><div style="font-size:24px;font-weight:800;margin-bottom:28px">Link<span style="color:#934553">li</span></div><h1 style="font-size:27px;line-height:1.3;margin:0 0 14px">${heading}</h1><p style="color:#6f6677;line-height:1.7;margin:0 0 18px">${escapeHtml(explanation)}</p><p style="color:#6f6677;line-height:1.7">שם: <b>${safeName}</b><br>דוא״ל: <span dir="ltr">${safeEmail}</span>${safePage ? `<br>עמוד: <span dir="ltr">${safePage}</span>` : ""}</p><p style="color:#2d2140;line-height:1.7;margin:22px 0 0">${safeBody}</p></td></tr></table></td></tr></table></body></html>`;
  const text = `${heading}\n${explanation}\n\nשם: ${message.name}\nדוא״ל: ${message.email}${message.pageUrl ? `\nעמוד: ${message.pageUrl}` : ""}\n\n${message.body}`;
  return deliverResend({
    apiKey,
    from,
    to: [inbox],
    subject,
    html,
    text,
    replyTo: message.email,
  });
}
