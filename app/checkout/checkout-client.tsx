"use client";

import Link from "next/link";
import { useState } from "react";
import MarketingWaitlistForm from "@/app/marketing-waitlist-form";

type PaymentMethod = "card" | "paypal" | "bit";

const methods: Array<{ id: PaymentMethod; icon: string; name: string; description: string }> = [
  { id: "card", icon: "💳", name: "כרטיס אשראי", description: "Visa, Mastercard וכרטיסים נתמכים נוספים" },
  { id: "paypal", icon: "PayPal", name: "PayPal", description: "תשלום דרך PayPal (כרטיס או חשבון PayPal)" },
  { id: "bit", icon: "bit", name: "bit", description: "תשלום דרך bit, בהתאם לאפשרויות ספק הסליקה" },
];

export default function CheckoutClient({
  email,
  plan,
  priceLabel,
  availableMethods,
  embedded = false,
}: {
  email: string;
  plan: "pro" | "max";
  priceLabel: string;
  availableMethods: PaymentMethod[];
  embedded?: boolean;
}) {
  const offeredMethods = methods.filter((method) => availableMethods.includes(method.id));
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(offeredMethods[0]?.id || null);
  const [loading, setLoading] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState("");
  const [billingUnavailable, setBillingUnavailable] = useState(false);

  async function pay(method: PaymentMethod) {
    setLoading(method);
    setError("");
    setBillingUnavailable(false);
    try {
      const response = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, plan }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setBillingUnavailable(data.code === "billing_unavailable" || response.status === 503);
        setError(data.error || "לא הצלחנו לפתוח את התשלום");
        return;
      }
      if (data.url) window.location.assign(data.url);
      else setError("לא התקבל קישור לתשלום. נסו שוב בעוד רגע.");
    } catch {
      setError("לא הצלחנו להתחבר לשירות התשלום. בדקו את החיבור ונסו שוב.");
    } finally {
      setLoading(null);
    }
  }

  if (!offeredMethods.length) {
    return (
      <section className={`payment-card${embedded ? " is-embedded" : ""}`}>
        <span className="checkout-section-label">הצטרפות ל-{plan}</span>
        <h2>התשלום ייפתח בקרוב</h2>
        <div className="checkout-beta-note" role="status">
          <strong>התשלום ייפתח בקרוב.</strong>
          <span>אפשר להשאיר פרטים כאן, ונעדכן ברגע שאפשר יהיה לשלם.</span>
        </div>
        <MarketingWaitlistForm compact defaultEmail={email} />
        <p className="checkout-security">בינתיים אפשר ליצור ולשתף את העמוד הראשון בחינם, בלי כרטיס אשראי.</p>
      </section>
    );
  }

  return (
    <section className={`payment-card${embedded ? " is-embedded" : ""}`}>
      <span className="checkout-section-label">תשלום מאובטח</span>
      <h2>איך נוח לך לשלם?</h2>
      <p className="payment-card-intro">בחירת אמצעי תשלום, ובשלב הבא מעבר לספק הסליקה להשלמת החיוב.</p>
      {error ? (
        <div className={billingUnavailable ? "checkout-beta-note" : "checkout-error"} role="alert">
          <strong>{error}</strong>
          {billingUnavailable ? (
            <>
              <span>אפשר לכתוב לנו ונעזור בהצטרפות בצורה מסודרת.</span>
              <Link className="button button-outline button-small" href="/contact?topic=billing">כתיבת הודעה</Link>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="payment-methods" role="radiogroup" aria-label="אמצעי תשלום">
        {offeredMethods.map((method) => {
          const selected = selectedMethod === method.id;
          return (
            <button
              type="button"
              className={`payment-method ${selected ? "selected" : ""}`}
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              disabled={loading !== null}
              role="radio"
              aria-checked={selected}
            >
              <span className="payment-icon">{method.icon}</span>
              <span><b>{method.name}</b><span>{method.description}</span></span>
              <span className="payment-radio" aria-hidden="true">{selected ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
      <button
        className="button button-primary checkout-submit"
        onClick={() => selectedMethod && pay(selectedMethod)}
        disabled={!selectedMethod || loading !== null}
      >
        {loading ? "מעבירים לתשלום מאובטח…" : `המשך לתשלום ${priceLabel}`}
        {!loading ? <span aria-hidden="true">←</span> : null}
      </button>
      <div className="checkout-security">
        <span aria-hidden="true">⌾</span>
        <p><b>הפרטים נשארים אצל ספק התשלום</b>Linkli מקבלת רק אישור על מצב המנוי, ללא מספר הכרטיס המלא.</p>
      </div>
      <p className="checkout-consent">
        בלחיצה על המשך אני מאשר/ת חיוב בסך {priceLabel} ואת <Link href="/terms">תנאי השימוש</Link>, <Link href="/privacy">מדיניות הפרטיות</Link> ו<Link href="/refunds">מדיניות הביטולים</Link>. אישור יישלח ל־<span dir="ltr">{email}</span>.
      </p>
    </section>
  );
}
