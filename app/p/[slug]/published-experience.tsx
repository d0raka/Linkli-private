"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TemplateConfig } from "@/lib/templates";

export default function PublishedExperience({ slug, config, showWatermark }: { slug: string; config: TemplateConfig; showWatermark: boolean }) {
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "view" }) });
  }, [slug]);

  function submit() {
    if (!selected) { setError(true); return; }
    setError(false); setSubmitted(true);
  }

  function trackClick() {
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "click" }), keepalive: true });
  }

  const isCorrect = selected === config.correctOption;
  const whatsappUrl = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(config.whatsappText)}`;

  return <main className="published-shell" style={{"--page-soft":config.accentSoft,"--page-accent":config.accent} as React.CSSProperties}>
    <section className="published-card">
      {!submitted ? <>
        <div className="published-emoji">{config.emoji}</div>
        <p className="published-greeting">היי {config.recipient}!</p>
        <h1>{config.headline}</h1>
        <p className="published-sub">{config.subtitle}</p>
        <div className="published-options">{config.options.map((option,index)=><label className={`published-option ${selected === option ? "selected" : ""}`} key={`${option}-${index}`}><input type="radio" name="answer" value={option} checked={selected === option} onChange={() => setSelected(option)} /><span>{option}</span></label>)}</div>
        {error && <p className="published-error">צריך לבחור תשובה אחת קודם 😊</p>}
        <button className="published-button" onClick={submit}>שליחה</button>
      </> : <div className="success-box">
        <div className="published-emoji">{isCorrect ? "🎉" : "😅"}</div>
        <h2>{isCorrect ? config.successTitle : "כמעט… אבל זה עדיין שווה חיוך"}</h2>
        <p>{isCorrect ? config.successText : "אפשר לנסות שוב, או פשוט לשלוח הודעה ולהודות שהעמוד עשה את שלו."}</p>
        {config.whatsapp && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="published-button" style={{display:"block"}} onClick={trackClick}>{config.buttonText}</a>}
        <button onClick={() => { setSubmitted(false); setSelected(""); }} className="button button-outline" style={{marginTop:12}}>ניסיון נוסף</button>
      </div>}
    </section>
    {showWatermark && <Link href="/" className="watermark">נוצר עם <b>Linkli</b> · גם אני רוצה</Link>}
  </main>;
}
