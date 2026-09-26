"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LockSimple } from "@phosphor-icons/react/ssr";
import MarketingWaitlistForm from "@/app/marketing-waitlist-form";
import { Button } from "@/app/ui/button";
import { Notice } from "@/app/ui/status";

type PaymentMethod = "card" | "paypal" | "bit";

const methods: Array<{ id: PaymentMethod; name: string; description: string }> = [
  { id: "card", name: "כרטיס אשראי", description: "Visa, Mastercard וכרטיסים נתמכים נוספים" },
  { id: "paypal", name: "PayPal", description: "תשלום דרך PayPal (כרטיס או חשבון PayPal)" },
  { id: "bit", name: "bit", description: "תשלום דרך bit, בהתאם לאפשרויות ספק הסליקה" },
];

export default function CheckoutClient({ email, plan, priceLabel, availableMethods }: { email: string; plan: "pro" | "max"; priceLabel: string; availableMethods: PaymentMethod[] }) {
  const offered = methods.filter((method) => availableMethods.includes(method.id));
  const [selected, setSelected] = useState<PaymentMethod | null>(offered[0]?.id || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  async function pay() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setUnavailable(false);
    try {
      const response = await fetch("/api/billing/upgrade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method: selected, plan }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUnavailable(data.code === "billing_unavailable" || response.status === 503);
        setError(data.error || "לא הצלחנו לפתוח את התשלום");
        setLoading(false);
        return;
      }
      if (data.url) window.location.assign(data.url);
      else { setError("לא התקבל קישור לתשלום. נסו שוב בעוד רגע."); setLoading(false); }
    } catch {
      setError("לא הצלחנו להתחבר לשירות התשלום. בדקו את החיבור ונסו שוב.");
      setLoading(false);
    }
  }

  if (!offered.length) {
    return (
      <section className="ui-panel checkout-pay" aria-labelledby="pay-title">
        <div className="ui-panel__section">
          <h2 className="ui-section-title" id="pay-title">התשלום ייפתח בקרוב</h2>
          <p className="ui-section-lead">אפשר להשאיר פרטים ונעדכן ברגע שאפשר לשלם. בינתיים העמוד הראשון בחינם, בלי כרטיס אשראי.</p>
          <div className="checkout-pay__form"><MarketingWaitlistForm compact defaultEmail={email} purpose="payment" /></div>
        </div>
      </section>
    );
  }

  return (
    <section className="ui-panel checkout-pay" aria-labelledby="pay-title">
      <div className="ui-panel__section">
        <h2 className="ui-section-title" id="pay-title">איך נוח לשלם?</h2>
        <p className="ui-section-lead">בחרו אמצעי תשלום. בשלב הבא עוברים לספק הסליקה להשלמת החיוב.</p>
        {error ? (
          <Notice tone={unavailable ? "warning" : "danger"} actions={unavailable ? <Link className="ui-button" data-size="sm" href="/contact?topic=billing">כתבו לנו</Link> : undefined}>
            {error}
          </Notice>
        ) : null}
        <fieldset className="checkout-methods">
          <legend className="sr-only">אמצעי תשלום</legend>
          {offered.map((method) => (
            <label key={method.id} className="checkout-method">
              <input type="radio" name="method" value={method.id} checked={selected === method.id} onChange={() => setSelected(method.id)} disabled={loading} />
              <span><b>{method.name}</b><small>{method.description}</small></span>
            </label>
          ))}
        </fieldset>
        <Button variant="primary" size="lg" block onClick={pay} disabled={!selected} loading={loading} loadingLabel="מעבירים לתשלום מאובטח…" iconEnd={<ArrowLeft aria-hidden="true" />}>
          המשך לתשלום {priceLabel}
        </Button>
        <p className="checkout-secure"><LockSimple aria-hidden="true" />פרטי הכרטיס נשארים אצל ספק התשלום. Linkli מקבלת רק אישור שהתשלום עבר.</p>
        <p className="checkout-consent">
          בלחיצה על המשך אני מאשר/ת חיוב של {priceLabel} ואת <Link href="/legal#terms">תנאי השימוש</Link>, <Link href="/legal#privacy">מדיניות הפרטיות</Link> ו<Link href="/legal#cancellations">מדיניות הביטולים</Link>. אישור יישלח ל-<span dir="ltr">{email}</span>.
        </p>
      </div>
    </section>
  );
}
