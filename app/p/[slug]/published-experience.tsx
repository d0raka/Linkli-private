"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import type { TemplateConfig } from "@/lib/templates";

type Screen = "intro" | "question" | "result";

function whatsappSafeText(value: string) {
  return value.normalize("NFC")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}]/gu, "")
    .replace(/[\u200d\ufe0f\u20e3]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* Scratch Card Canvas Component for Date Theme */
function ScratchCanvas({ secretText }: { secretText: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 120;

    // Fill foil background
    ctx.fillStyle = "#e2b659";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 16px Rubik, sans-serif";
    ctx.fillStyle = "#5c4308";
    ctx.textAlign = "center";
    ctx.fillText("✨ גרדו כאן לחשיפת ההפתעה! ✨", canvas.width / 2, canvas.height / 2 + 5);

    let isDrawing = false;

    function scratch(e: MouseEvent | TouchEvent) {
      if (!isDrawing || !canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    const startDraw = () => { isDrawing = true; };
    const stopDraw = () => { isDrawing = false; };

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", scratch);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("touchstart", startDraw);
    canvas.addEventListener("touchmove", scratch);
    canvas.addEventListener("touchend", stopDraw);

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", scratch);
      canvas.removeEventListener("mouseup", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", scratch);
      canvas.removeEventListener("touchend", stopDraw);
    };
  }, []);

  return (
    <div className="scratch-container">
      <div className="scratch-secret">
        <span>💘</span>
        <strong>{secretText}</strong>
      </div>
      {!revealed && (
        <canvas ref={canvasRef} className="scratch-canvas" />
      )}
      <button className="scratch-reveal-btn" onClick={() => setRevealed(true)}>
        {revealed ? "גרדת בהצלחה! ✨" : "לחצו לחשיפה מהירה 🪄"}
      </button>
    </div>
  );
}

/* Gift Voucher Box Component */
function GiftVoucherBox({ title, text }: { title: string; text: string }) {
  const [unwrapped, setUnwrapped] = useState(false);

  return (
    <div className="gift-voucher-card" onClick={() => setUnwrapped(true)}>
      {!unwrapped ? (
        <div className="gift-cover">
          <span className="gift-icon">🎁</span>
          <h3>לחצו לפתיחת קופסת המתנה!</h3>
          <p>הפתעה מיוחדת מחכה לך בפנים ✨</p>
        </div>
      ) : (
        <div className="gift-unwrapped-details">
          <span className="voucher-badge">🎟️ שובר מתנה אישי</span>
          <h3>{title}</h3>
          <p>{text}</p>
          <div className="voucher-code">קוד מימוש: <strong>LINKLI-GIFT-2026</strong></div>
        </div>
      )}
    </div>
  );
}

/* Birthday Candle Blow-out Component */
function BirthdayCandle({ onExtinguish }: { onExtinguish: () => void }) {
  const [lit, setLit] = useState(true);

  function blow() {
    setLit(false);
    onExtinguish();
  }

  return (
    <div className="birthday-candle-box" onClick={blow}>
      <div className={`candle ${lit ? "lit" : "extinguished"}`}>
        {lit ? <span className="flame">🔥</span> : <span className="smoke">💨</span>}
        <div className="stick" />
      </div>
      <p>{lit ? "לחצו על הלהבה לכביה ולבקשת משאלה! 🕯️✨" : "המשאלה בדרך אליך! 🎉"}</p>
    </div>
  );
}

export default function PublishedExperience({ slug, config, showWatermark, trackAnalytics = true, previewMode = false, previewCtaHref = "/register" }: { slug: string; config: TemplateConfig; showWatermark: boolean; trackAnalytics?: boolean; previewMode?: boolean; previewCtaHref?: string }) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => config.questions.map(() => ""));
  const [error, setError] = useState(false);

  // Interactive step states
  const [waxOpened, setWaxOpened] = useState(false);
  const [candleExtinguished, setCandleExtinguished] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [customSong, setCustomSong] = useState("");
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    if (!trackAnalytics) return;
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "view" }) });
  }, [slug, trackAnalytics]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen, step]);

  const fallingItems = useMemo(() => Array.from({ length: 18 }, (_, index) => ({
    value: config.decorations[index % config.decorations.length] || config.emoji,
    left: `${3 + ((index * 17) % 94)}%`,
    delay: `${-((index * 0.73) % 7)}s`,
    duration: `${6 + (index % 5) * 1.15}s`,
    size: `${17 + (index % 4) * 5}px`,
  })), [config.decorations, config.emoji]);

  const formattedAnswers = [...answers];
  if (config.theme === "elegant") {
    formattedAnswers[1] = `${guestCount} אורחים`;
    if (customSong.trim()) {
      formattedAnswers[2] = `${answers[2] || "מוזיקה מעולה"} (שיר ל-DJ: ${customSong.trim()})`;
    }
  }
  const answerSummary = config.questions.map((question, index) => `• ${question.prompt}: ${formattedAnswers[index] || "נבחר"}`).join("\n");
  const fullShareText = `${config.whatsappText}\n\n${answerSummary}\n\nקישור: ${typeof window !== "undefined" ? window.location.href : ""}`;
  const whatsappMessage = whatsappSafeText(`${config.whatsappText}\n\n${answerSummary}`).slice(0, 1800);
  const whatsappUrl = `https://wa.me/${config.whatsapp || ""}?text=${encodeURIComponent(whatsappMessage)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(whatsappMessage)}`;

  const question = config.questions[step];

  function start() {
    setScreen("question");
    setStep(0);
  }

  function choose(option: string) {
    setAnswers((current) => current.map((answer, index) => index === step ? option : answer));
    setError(false);
  }

  function next() {
    if (!answers[step]) { setError(true); return; }
    setError(false);
    if (step < config.questions.length - 1) setStep((current) => current + 1);
    else setScreen("result");
  }

  function back() {
    setError(false);
    if (step > 0) setStep((current) => current - 1);
    else setScreen("intro");
  }

  function restart() {
    setAnswers(config.questions.map(() => ""));
    setStep(0);
    setError(false);
    setWaxOpened(false);
    setCandleExtinguished(false);
    setGuestCount(1);
    setCustomSong("");
    setScreen("intro");
  }

  function copySummaryToClipboard() {
    void navigator.clipboard.writeText(fullShareText);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  }

  function trackClick() {
    if (!trackAnalytics) return;
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "click" }), keepalive: true });
  }

  // Google calendar link helper for RSVP
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(config.headline)}&details=${encodeURIComponent(config.subtitle)}&location=${encodeURIComponent(config.highlights[1] || "")}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(config.highlights[1] || "חוות רונית")}&navigate=yes`;

  const themeClass = `experience-shell experience-${config.theme}`;
  const cardClass = `experience-card experience-card-${config.theme}`;

  return <main className={themeClass} id="main-content" style={{ "--page-soft": config.accentSoft, "--page-accent": config.accent } as React.CSSProperties}>
    {previewMode ? <div className="template-preview-bar"><Link href="/#templates" className="template-preview-back">חזרה לכל התבניות</Link><Link href={previewCtaHref} data-marketing-event="preview_create" className="button button-primary button-small">יצירת התבנית בחינם</Link></div> : null}
    <div className="experience-aurora experience-aurora-one" aria-hidden="true" />
    <div className="experience-aurora experience-aurora-two" aria-hidden="true" />
    <div className="falling-emojis" aria-hidden="true">{fallingItems.map((item, index) => <span key={index} style={{ left: item.left, animationDelay: item.delay, animationDuration: item.duration, fontSize: item.size }}>{item.value}</span>)}</div>
    
    <section className={cardClass} aria-live="polite">
      <div className="experience-topline">{showWatermark ? <span className="experience-brand">Link<span>li</span></span> : <span aria-hidden="true">{config.emoji}</span>}{screen === "question" ? <span dir="ltr">{step + 1} / {config.questions.length}</span> : <span>{config.introLabel}</span>}</div>

      {screen === "intro" ? <div className="experience-screen experience-intro">
        {/* Special Wax Seal Envelope for Love Note */}
        {config.theme === "letter" && !waxOpened ? (
          <div className="wax-envelope-card" onClick={() => setWaxOpened(true)}>
            <div className="wax-seal">💌</div>
            <h3>מכתב אישי מהלב</h3>
            <p>לחצו לפתיחת חותם השעווה ✉️</p>
          </div>
        ) : (
          <>
            <div className="experience-emoji-wrap"><span>{config.emoji}</span><i aria-hidden="true">✦</i></div>
            <p className="experience-greeting">שלום {config.recipient},</p>
            <h1>{config.headline}</h1>
            <p className="experience-copy">{config.subtitle}</p>

            {/* Special Event Pass Details Header for RSVP */}
            {config.theme === "elegant" && (
              <div className="rsvp-ticket-header">
                <div className="rsvp-ticket-row"><span>📅 תאריך ושעה:</span><b>{config.highlights[0] || "18.09.2026 · 19:30"}</b></div>
                <div className="rsvp-ticket-row"><span>📍 מיקום:</span><b>{config.highlights[1] || "חוות רונית"}</b></div>
                <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="rsvp-waze-link">🧭 ניווט ב-Waze</a>
              </div>
            )}

            {config.theme !== "elegant" && (
              <div className="experience-meta">{config.highlights.map((highlight) => <span key={highlight}>✦ {highlight}</span>)}</div>
            )}

            <button className="experience-primary" onClick={start}>{config.startText}<span aria-hidden="true">←</span></button>
            <p className="experience-hint">זה לוקח בערך דקה</p>
          </>
        )}
      </div> : null}

      {screen === "question" && question ? <div className="experience-screen experience-question" key={step}>
        <div className="experience-progress" style={{ gridTemplateColumns: `repeat(${config.questions.length}, minmax(0, 1fr))` }} aria-label={`שלב ${step + 1} מתוך ${config.questions.length}`}>{config.questions.map((_, index) => <i className={index <= step ? "active" : ""} key={index} />)}</div>
        <span className="experience-step">שלב {step + 1}</span>
        <h2>{question.prompt}</h2>
        <p className="experience-copy">{question.helper}</p>

        {/* Special Guest Stepper for RSVP Question 2 */}
        {config.theme === "elegant" && step === 1 ? (
          <div className="guest-stepper-box">
            <div className="stepper-controls">
              <button type="button" onClick={() => { const val = Math.max(1, guestCount - 1); setGuestCount(val); choose(`${val} אורחים`); }}>−</button>
              <span className="guest-num">{guestCount}</span>
              <button type="button" onClick={() => { const val = Math.min(10, guestCount + 1); setGuestCount(val); choose(`${val} אורחים`); }}>+</button>
            </div>
            <div className="guest-avatars">
              {Array.from({ length: guestCount }).map((_, i) => <span key={i}>👤</span>)}
            </div>
          </div>
        ) : (
          <div className="experience-options">
            {question.options.map((option, index) => (
              <button className={answers[step] === option ? "selected" : ""} onClick={() => choose(option)} key={`${option}-${index}`}>
                <span>{String.fromCharCode(1488 + index)}</span>
                <b>{option}</b>
                <i aria-hidden="true">✓</i>
              </button>
            ))}
          </div>
        )}

        {/* DJ Song input for RSVP step 3 */}
        {config.theme === "elegant" && step === 2 && (
          <div className="dj-song-input-box">
            <label>🎵 רשמו שיר שאתם חייבים לשמוע ברחבה (רשות):</label>
            <input
              type="text"
              value={customSong}
              placeholder="שם השיר והאמן..."
              onChange={(e) => setCustomSong(e.target.value)}
              className="dj-input-field"
            />
          </div>
        )}

        {error ? <p className="experience-error" role="alert">בחרו תשובה כדי להמשיך 😊</p> : null}
        <div className="experience-navigation"><button className="experience-back" onClick={back}>חזרה</button><button className="experience-primary" onClick={next}>{step === config.questions.length - 1 ? config.finalButtonText : "לשלב הבא"}<span aria-hidden="true">←</span></button></div>
      </div> : null}

      {screen === "result" ? <div className="experience-screen experience-result">
        <div className="success-burst" aria-hidden="true"><i>✦</i><i>★</i><i>✦</i><span>🎉</span></div>
        <span className="score-pill">{config.resultLabel}</span>
        <h2>{config.successTitle}</h2>

        {/* Special Gift Voucher Box */}
        {config.theme === "gift" && (
          <GiftVoucherBox title={config.successTitle} text={config.successText} />
        )}

        {/* Special Interactive Candle for Birthday */}
        {config.theme === "party" && (
          <BirthdayCandle onExtinguish={() => setCandleExtinguished(true)} />
        )}

        {config.theme === "party" && !candleExtinguished ? null : (
          <p className="experience-copy">{config.successText}</p>
        )}

        {/* Special Scratch Card for Date Theme */}
        {config.theme === "romance" && (
          <ScratchCanvas secretText={config.successTitle} />
        )}

        {/* Special RSVP Add to Calendar Button */}
        {config.theme === "elegant" && (
          <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer" className="calendar-add-button">
            <span>📅</span> הוספת האירוע ל-Google Calendar
          </a>
        )}

        <div className="answer-recap">{config.questions.map((item, index) => <div key={index}><span>{index + 1}</span><p><small>{item.prompt}</small><b>{formattedAnswers[index]}</b></p></div>)}</div>

        {/* Multi-Channel Response & Share Bar */}
        <div className="multi-share-section">
          <p className="share-title">שליחת המענה בדרכים נוספות:</p>
          <div className="multi-share-grid">
            {config.whatsapp || previewMode ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="share-pill share-pill-wa" onClick={trackClick}>
                <span>🟢</span> WhatsApp
              </a>
            ) : null}
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="share-pill share-pill-tg" onClick={trackClick}>
              <span>✈️</span> Telegram
            </a>
            <button type="button" onClick={copySummaryToClipboard} className="share-pill share-pill-copy">
              <span>📋</span> {copiedToast ? "הועתק בהצלחה! ✨" : "העתקת מענה"}
            </button>
          </div>
        </div>

        <button onClick={restart} className="experience-restart">התחלה מחדש</button>
      </div> : null}
    </section>
    {showWatermark ? <Link href="/" className="watermark">נוצר עם <b>Linkli</b> · גם אני רוצה</Link> : null}
  </main>;
}
