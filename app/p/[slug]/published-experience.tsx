"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { CUSTOM_BLOCKS, type TemplateConfig } from "@/lib/templates";

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

/* Live Countdown Component for Event RSVP */
function EventCountdown({ targetDateText }: { targetDateText?: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 48, hours: 14, minutes: 32, seconds: 45 });
  const countdownLabel = targetDateText ? ` עד ${targetDateText}` : "";

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        return { ...prev, seconds: 59, minutes: Math.max(0, prev.minutes - 1) };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="event-countdown-box">
      <span className="countdown-title">⏱️ סופרים את הימים לאירוע{countdownLabel}:</span>
      <div className="countdown-grid">
        <div className="countdown-unit"><b>{timeLeft.days}</b><small>ימים</small></div>
        <div className="countdown-unit"><b>{timeLeft.hours}</b><small>שעות</small></div>
        <div className="countdown-unit"><b>{timeLeft.minutes}</b><small>דקות</small></div>
        <div className="countdown-unit"><b>{timeLeft.seconds}</b><small>שניות</small></div>
      </div>
    </div>
  );
}

function CardUtilityActions({ config, googleCalendarUrl, onAppleCalendar }: { config: TemplateConfig; googleCalendarUrl: string; onAppleCalendar: () => void }) {
  const showCalendar = config.showCalendar ?? config.theme === "elegant";
  const showAppleCalendar = config.showAppleCalendar ?? false;
  const showWaze = config.showWaze ?? config.theme === "elegant";
  const showGoogleMaps = config.showGoogleMaps ?? false;
  const venue = config.venueName || config.highlights[1] || "";
  const wazeUrl = config.wazeUrl || `https://waze.com/ul?q=${encodeURIComponent(venue || "חוות רונית")}&navigate=yes`;
  const googleMapsUrl = config.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue || config.headline)}`;
  if (!showCalendar && !showAppleCalendar && !showWaze && !showGoogleMaps) return null;
  return <div className="card-utility-actions" aria-label="פעולות מהירות">
    {showCalendar && <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">📅 Google Calendar</a>}
    {showAppleCalendar && <a href="#apple-calendar" onClick={(event) => { event.preventDefault(); onAppleCalendar(); }}> Apple Calendar</a>}
    {showWaze && <a href={wazeUrl} target="_blank" rel="noopener noreferrer">🧭 ניווט ב-Waze</a>}
    {showGoogleMaps && <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">📍 Google Maps</a>}
  </div>;
}

/* Interactive Memories Story Slide Component */
function MemoriesSlider() {
  const slides = [
    { icon: "🌄", title: "איך הכול התחיל", text: "הטיול הראשון שלנו שבו הבנו שאנחנו בלתי נפרדים." },
    { icon: "🥂", title: "הרגעים הגדולים", text: "החגיגות והערבים המטורפים שעד היום מדברים עליהם." },
    { icon: "❤️", title: "הרגעים הקטנים", text: "הקפה של הבוקר, הבדיחות הפנימיות והחיוך שבבית." },
  ];
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="memories-slider-box">
      <div className="memory-slide-card">
        <span className="slide-icon">{slides[currentSlide].icon}</span>
        <h4>{slides[currentSlide].title}</h4>
        <p>{slides[currentSlide].text}</p>
      </div>
      <div className="slider-dots">
        {slides.map((_, i) => (
          <button key={i} className={i === currentSlide ? "active" : ""} onClick={() => setCurrentSlide(i)} />
        ))}
      </div>
    </div>
  );
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
function GiftVoucherBox({ title, text, code, terms }: { title: string; text: string; code?: string; terms?: string }) {
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
          <div className="voucher-code">קוד מימוש: <strong>{code || "LINKLI-GIFT-2026"}</strong></div>
          {terms && <small style={{ display: "block", marginTop: "6px", opacity: 0.8 }}>{terms}</small>}
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

export default function PublishedExperience({ slug, templateId, config, showWatermark, trackAnalytics = true, previewMode = false, previewCtaHref = "/register" }: { slug: string; templateId?: string; config: TemplateConfig; showWatermark: boolean; trackAnalytics?: boolean; previewMode?: boolean; previewCtaHref?: string }) {
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
  const isCustomBlank = templateId === "custom-blank";
  const customBlocks = config.customBlocks?.length ? config.customBlocks : CUSTOM_BLOCKS.map((block) => block.id);
  const customBlockEnabled = (blockId: string, fallback = true) => !isCustomBlank ? fallback : customBlocks.includes(blockId);
  const hasQuestions = customBlockEnabled("questions") && config.questions.length > 0;

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
    setScreen(hasQuestions ? "question" : "result");
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
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(config.headline)}&details=${encodeURIComponent(config.subtitle)}&location=${encodeURIComponent(config.venueName || config.highlights[1] || "")}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(config.highlights[1] || "חוות רונית")}&navigate=yes`;

  function downloadAppleCalendar() {
    const dateMatch = (config.eventDate || "").match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    const timeMatch = (config.eventDate || "").match(/(\d{1,2}):(\d{2})/);
    const now = new Date();
    const year = dateMatch?.[3] || String(now.getFullYear());
    const month = dateMatch?.[2]?.padStart(2, "0") || String(now.getMonth() + 1).padStart(2, "0");
    const day = dateMatch?.[1]?.padStart(2, "0") || String(now.getDate()).padStart(2, "0");
    const hour = timeMatch?.[1]?.padStart(2, "0") || "19";
    const minute = timeMatch?.[2] || "30";
    const start = `${year}${month}${day}T${hour}${minute}00`;
    const endDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute) + 120);
    const end = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, "0")}${String(endDate.getDate()).padStart(2, "0")}T${String(endDate.getHours()).padStart(2, "0")}${String(endDate.getMinutes()).padStart(2, "0")}00`;
    const escapeIcs = (value: string) => value.replace(/[\\,;]/g, "\\$&").replace(/\n/g, "\\n");
    const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Linkli//Personal Card//EN", "BEGIN:VEVENT", `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escapeIcs(config.headline)}`, `DESCRIPTION:${escapeIcs(config.subtitle)}`, `LOCATION:${escapeIcs(config.venueName || config.highlights[1] || "")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "linkli-event.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  const themeClass = `experience-shell experience-${config.theme} bg-${config.bgStyle || "fluid-mesh"}`;
  const cardClass = `experience-card experience-card-${config.theme}`;
  const isBrandingHidden = config.hideBranding || !showWatermark;

  return <main className={themeClass} id="main-content" style={{
    fontFamily: config.fontFamily ? `"${config.fontFamily}", sans-serif` : undefined,
    "--page-soft": config.accentSoft,
    "--page-accent": config.accent,
    "--card-blur": `${config.glassBlur ?? 30}px`,
    "--page-card-bg": config.cardBackground || "rgba(255,255,255,.91)",
    "--page-card-border": config.cardBorderColor || "rgba(255,255,255,.9)",
    "--page-card-radius": `${config.cardRadius ?? 34}px`,
    "--page-emoji-bg": config.emojiBackground || config.accentSoft,
    "--page-emoji-size": `${config.emojiSize ?? 55}px`,
    "--page-emoji-radius": config.emojiShape === "circle" ? "50%" : config.emojiShape === "square" ? "12px" : config.emojiShape === "pill" ? "999px" : "31px",
    "--page-button-bg": config.buttonStyle === "solid" ? config.accent : config.buttonStyle === "soft" ? config.accentSoft : config.buttonStyle === "outline" ? "transparent" : undefined,
    "--page-button-border": config.buttonStyle === "outline" ? `2px solid ${config.accent}` : undefined,
  } as React.CSSProperties}>
    {previewMode ? <div className="template-preview-bar"><Link href="/#templates" className="template-preview-back">חזרה לכל התבניות</Link><Link href={previewCtaHref} data-marketing-event="preview_create" className="button button-primary button-small">יצירת התבנית בחינם</Link></div> : null}
    <div className="experience-aurora experience-aurora-one" aria-hidden="true" />
    <div className="experience-aurora experience-aurora-two" aria-hidden="true" />
    {config.showFallingEmojis !== false && customBlockEnabled("decorations") && <div className="falling-emojis" aria-hidden="true">{fallingItems.map((item, index) => <span key={index} style={{ left: item.left, animationDelay: item.delay, animationDuration: item.duration, fontSize: item.size, opacity: config.decorationOpacity ?? 0.5 }}>{item.value}</span>)}</div>}
    
    <section className={`${cardClass} ${config.cardShape ? `shape-${config.cardShape}` : ""}`} aria-live="polite">
      <div className="experience-topline">{showWatermark && !isBrandingHidden ? <span className="experience-brand">Link<span>li</span></span> : <span aria-hidden="true">{config.emoji}</span>}{screen === "question" ? <span dir="ltr">{step + 1} / {config.questions.length}</span> : config.showIntroLabel !== false ? <span>{config.introLabel}</span> : <span aria-hidden="true" />}</div>

      {screen === "intro" ? <div className="experience-screen experience-intro">
        {/* Special Wax Seal Envelope for Love Note */}
        {config.theme === "letter" && config.showWaxEnvelope !== false && !waxOpened ? (
          <div className="wax-envelope-card" onClick={() => setWaxOpened(true)}>
            <div className="wax-seal">💌</div>
            <h3>מכתב אישי מהלב</h3>
            <p>לחצו לפתיחת חותם השעווה ✉️</p>
          </div>
        ) : (
          <>
            {config.showEmoji !== false && customBlockEnabled("emoji") && <div className="experience-emoji-wrap"><span>{config.emoji}</span><i aria-hidden="true">✦</i></div>}
            {config.showGreeting !== false && <p className="experience-greeting">שלום {config.recipient},</p>}
            <h1>{config.headline}</h1>
            <p className="experience-copy">{config.subtitle}</p>

            {/* Live Event Pass & Countdown for RSVP */}
            {config.showCountdown && <EventCountdown targetDateText={config.eventDate} />}
            {config.theme === "elegant" && (
              <>
                {config.showVenueCard !== false && <div className="rsvp-ticket-header">
                  <div className="rsvp-ticket-row"><span>📅 תאריך ושעה:</span><b>{config.eventDate || config.highlights[0] || "18.09.2026 · 19:30"}</b></div>
                  <div className="rsvp-ticket-row"><span>📍 מיקום:</span><b>{config.venueName || config.highlights[1] || "חוות רונית"}</b></div>
                  {config.showWaze !== false && <a href={config.wazeUrl || wazeUrl} target="_blank" rel="noopener noreferrer" className="rsvp-waze-link">🧭 ניווט ב-Waze למקום האירוע</a>}
                </div>}
              </>
            )}

            {/* Photo Slide Carousel for Memories Theme */}
            {config.theme === "memories" && config.showMemoriesSlider !== false && <MemoriesSlider />}

            {config.showHighlights !== false && customBlockEnabled("highlights") && config.theme !== "elegant" && config.theme !== "memories" && (
              <div className="experience-meta">{config.highlights.map((highlight) => <span key={highlight}>✦ {highlight}</span>)}</div>
            )}

            {config.showVenueCard && customBlockEnabled("location") && config.theme !== "elegant" && (config.venueName || config.eventDate) && <div className="card-venue-summary"><span>📍 {config.venueName || "מיקום האירוע"}</span>{config.eventDate ? <b>📅 {config.eventDate}</b> : null}</div>}

            {customBlockEnabled("location") && <CardUtilityActions config={config} googleCalendarUrl={googleCalendarUrl} onAppleCalendar={downloadAppleCalendar} />}

            <button className="experience-primary" onClick={start}>{config.startText}<span aria-hidden="true">←</span></button>
            {config.showStartHint !== false && <p className="experience-hint">זה לוקח בערך דקה</p>}
          </>
        )}
      </div> : null}

      {screen === "question" && hasQuestions && question ? <div className="experience-screen experience-question" key={step}>
        <div className="experience-progress" style={{ gridTemplateColumns: `repeat(${config.questions.length}, minmax(0, 1fr))` }} aria-label={`שלב ${step + 1} מתוך ${config.questions.length}`}>{config.questions.map((_, index) => <i className={index <= step ? "active" : ""} key={index} />)}</div>
        <span className="experience-step">שלב {step + 1}</span>
        <h2>{question.prompt}</h2>
        <p className="experience-copy">{question.helper}</p>

        {config.theme === "elegant" && step === 1 && config.showGuests !== false ? (
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

        {config.theme === "elegant" && step === 2 && config.showDjSong !== false && (
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

        {config.theme === "gift" && config.showVoucher !== false && (
          <GiftVoucherBox title={config.voucherTitle || config.successTitle} text={config.successText} code={config.voucherCode} terms={config.voucherTerms} />
        )}

        {config.theme === "party" && config.showCandle !== false && (
          <BirthdayCandle onExtinguish={() => setCandleExtinguished(true)} />
        )}

        {config.theme === "party" && !candleExtinguished ? null : (
          <p className="experience-copy">{config.successText}</p>
        )}

        {(templateId === "date" || config.showScratchCard === true) && (
          <ScratchCanvas secretText={config.successTitle} />
        )}

        {(templateId === "memories" || config.showMemoriesSlider === true) && (
          <MemoriesSlider />
        )}

        {customBlockEnabled("location") && <CardUtilityActions config={config} googleCalendarUrl={googleCalendarUrl} onAppleCalendar={downloadAppleCalendar} />}

        {config.showAnswerRecap !== false && customBlockEnabled("answers") && <div className="answer-recap">{config.questions.map((item, index) => <div key={index}><span>{index + 1}</span><p><small>{item.prompt}</small><b>{formattedAnswers[index]}</b></p></div>)}</div>}

        {customBlockEnabled("share") && <div className="multi-share-section">
          <p className="share-title">שליחת המענה בדרכים נוספות:</p>
          <div className="multi-share-grid">
            {config.showWhatsApp !== false && (config.whatsapp || previewMode) ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="share-pill share-pill-wa" onClick={trackClick}>
                <span>🟢</span> WhatsApp
              </a>
            ) : null}
            {config.showTelegram !== false && <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="share-pill share-pill-tg" onClick={trackClick}>
              <span>✈️</span> Telegram
            </a>}
            {config.showCopy !== false && <button type="button" onClick={copySummaryToClipboard} className="share-pill share-pill-copy">
              <span>📋</span> {copiedToast ? "הועתק בהצלחה! ✨" : "העתקת מענה"}
            </button>}
          </div>
        </div>}

        <button onClick={restart} className="experience-restart">התחלה מחדש</button>
      </div> : null}
    </section>
    {!isBrandingHidden ? <Link href="/" className="watermark">נוצר עם <b>Linkli</b> · גם אני רוצה</Link> : null}
  </main>;
}
