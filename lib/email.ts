import { runtimeValue } from "@/db";

type AuthEmail = {
  to: string;
  displayName: string;
  actionUrl: string;
  type: "verify_email" | "reset_password";
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

export async function sendAuthEmail(message: AuthEmail): Promise<EmailDelivery> {
  const apiKey = runtimeValue("RESEND_API_KEY");
  const from = runtimeValue("EMAIL_FROM");
  if (!apiKey || !from) return { sent: false, reason: "unconfigured" };

  const verify = message.type === "verify_email";
  const subject = verify ? "אימות כתובת הדוא״ל שלך ב־Linkli" : "איפוס הסיסמה שלך ב־Linkli";
  const heading = verify ? "נשאר רק לאמת את כתובת הדוא״ל" : "ביקשת לאפס את הסיסמה";
  const explanation = verify
    ? "לחיצה על הכפתור תאשר שהכתובת הזו שייכת לך ותשלים את הגדרת החשבון."
    : "הקישור תקף למשך 30 דקות וניתן להשתמש בו פעם אחת בלבד. אם לא ביקשת לאפס סיסמה, אפשר להתעלם מההודעה.";
  const button = verify ? "אימות כתובת הדוא״ל" : "בחירת סיסמה חדשה";
  const safeName = escapeHtml(message.displayName || "");
  const safeUrl = escapeHtml(message.actionUrl);
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f7f5fa;font-family:Arial,sans-serif;color:#2d2140"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff;border:1px solid #e9e4ed;border-radius:20px"><tr><td style="padding:34px"><div style="font-size:24px;font-weight:800;margin-bottom:28px">Link<span style="color:#ef476f">li</span></div><p style="margin:0 0 10px">שלום ${safeName},</p><h1 style="font-size:27px;line-height:1.3;margin:0 0 14px">${heading}</h1><p style="color:#6f6677;line-height:1.7;margin:0 0 26px">${explanation}</p><a href="${safeUrl}" style="display:inline-block;background:#ef476f;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:11px">${button}</a><p style="color:#8c8392;font-size:12px;line-height:1.6;margin:28px 0 0">אם הכפתור לא נפתח, העתיקו את הקישור הבא לדפדפן:<br><span dir="ltr" style="word-break:break-all">${safeUrl}</span></p></td></tr></table></td></tr></table></body></html>`;
  const text = `שלום ${message.displayName},\n\n${heading}\n${explanation}\n\n${message.actionUrl}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "user-agent": "Linkli/1.0",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject,
        html,
        text,
        ...(runtimeValue("EMAIL_REPLY_TO") ? { reply_to: runtimeValue("EMAIL_REPLY_TO") } : {}),
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
