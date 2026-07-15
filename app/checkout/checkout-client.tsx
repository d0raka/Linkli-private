"use client";

import Link from "next/link";
import { useState } from "react";

type PaymentMethod = "card" | "paypal" | "bit";

const methods: Array<{ id: PaymentMethod; icon: string; name: string; description: string }> = [
  { id: "card", icon: "💳", name: "כרטיס אשראי", description: "Visa, Mastercard וכרטיסים נתמכים נוספים" },
  { id: "paypal", icon: "P", name: "PayPal", description: "תשלום מאובטח דרך חשבון PayPal" },
  { id: "bit", icon: "bit", name: "bit", description: "תשלום דרך bit, בהתאם לאפשרויות ספק הסליקה" },
];

export default function CheckoutClient({ email }: { email: string }) {
  const [loading, setLoading] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState("");

  async function pay(method: PaymentMethod) {
    setLoading(method); setError("");
    const response = await fetch("/api/billing/upgrade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method }) });
    const data = await response.json();
    if (!response.ok) { setLoading(null); setError(data.error || "לא הצלחנו לפתוח את התשלום"); return; }
    if (data.url) window.location.assign(data.url);
    else window.location.assign("/payment/success?demo=1");
  }

  return <section className="payment-card"><h2>איך נוח לך לשלם?</h2>{error && <div className="checkout-error" role="alert">{error}</div>}<div className="payment-methods">
    {methods.map((method) => <button className="payment-method" key={method.id} onClick={() => pay(method.id)} disabled={loading !== null} aria-label={`תשלום באמצעות ${method.name}`}><span className="payment-icon">{method.icon}</span><span><b>{method.name}</b><span>{method.description}</span></span><span className="payment-arrow">←</span></button>)}
  </div><p className="checkout-security">🔒 פרטי התשלום מוזנים ונשמרים אצל ספק התשלום בלבד. Linkli מקבל רק אישור על מצב המנוי ואינו שומר מספר כרטיס מלא.</p><p className="checkout-consent">בהמשך לתשלום אני מאשר/ת חיוב בסך ₪9.90 ואת <Link href="/terms">תנאי השימוש</Link>, <Link href="/privacy">מדיניות הפרטיות</Link> ו<Link href="/refunds">מדיניות הביטולים</Link>. אמצעי שתומך במנוי יחויב מדי חודש עד לביטול; אם אמצעי התשלום אינו תומך בחידוש אוטומטי, יידרש אישור תשלום מחדש. אישור יישלח ל־{email}.</p></section>;
}
