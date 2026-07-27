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

export default function PublishedExperience({ slug, config, showWatermark, trackAnalytics = true, previewMode = false, previewCtaHref = "/register" }: { slug: string; config: TemplateConfig; showWatermark: boolean; trackAnalytics?: boolean; previewMode?: boolean; previewCtaHref?: string }) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => config.questions.map(() => ""));
  const [error, setError] = useState(false);

  // Interactive step states
  const [waxOpened, setWaxOpened] = useState(false);
  const [giftOpened, setGiftOpened] = useState(false);
  const [prankDone, setPrankDone] = useState(false);
  const [prankProgress, setPrankProgress] = useState(0);

  useEffect(() => {
    if (!trackAnalytics) return;
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "view" }) });
  }, [slug, trackAnalytics]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen, step]);

  // Prank fake loading simulation
  useEffect(() => {
    if (screen === "result" && config.theme === "mischief" && !prankDone) {
      let current = 0;
      const interval = setInterval(() => {
        current += Math.floor(Math.random() * 25) + 10;
        if (current >= 100) {
          setPrankProgress(100);
          clearInterval(interval);
          setTimeout(() => setPrankDone(true), 600);
        } else {
          setPrankProgress(current);
        }
      }, 350);
      return () => clearInterval(interval);
    }
  }, [screen, config.theme, prankDone]);

  const fallingItems = useMemo(() => Array.from({ length: 18 }, (_, index) => ({
    value: config.decorations[index % config.decorations.length] || config.emoji,
    left: `${3 + ((index * 17) % 94)}%`,
    delay: `${-((index * 0.73) % 7)}s`,
    duration: `${6 + (index % 5) * 1.15}s`,
    size: `${17 + (index % 4) * 5}px`,
  })), [config.decorations, config.emoji]);

  const scoredQuestions = config.questions.filter((question) => question.correctOption);
  const score = config.questions.reduce((total, question, index) => total + (question.correctOption && answers[index] === question.correctOption ? 1 : 0), 0);
  const answerSummary = config.questions.map((question, index) => `• ${question.prompt}: ${answers[index]}`).join("\n");
  const whatsappMessage = whatsappSafeText(`${config.whatsappText}\n\n${answerSummary}`).slice(0, 1800);
  const whatsappUrl = `https://wa.me/${config.whatsapp || ""}?text=${encodeURIComponent(whatsappMessage)}`;
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
    setGiftOpened(false);
    setPrankDone(false);
    setPrankProgress(0);
    setScreen("intro");
  }

  function trackClick() {
    if (!trackAnalytics) return;
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "click" }), keepalive: true });
  }

  // Friendship badge formula
  const friendshipBadge = score === scoredQuestions.length ? "🥇 חבר זהב — 100% נפש תאומה!" : score >= 1 ? "🥈 חבר כסף — 80% שותף אמת" : "🥉 חבר כבוד — 50% מתחבר על כוס קפה";

  return <main className={`experience-shell experience-${config.theme}`} id="main-content" style={{ "--page-soft": config.accentSoft, "--page-accent": config.accent } as React.CSSProperties}>
    {previewMode ? <div className="template-preview-bar"><Link href="/#templates" className="template-preview-back">חזרה לכל התבניות</Link><Link href={previewCtaHref} data-marketing-event="preview_create" className="button button-primary button-small">יצירת התבנית בחינם</Link></div> : null}
    <div className="experience-aurora experience-aurora-one" aria-hidden="true" />
    <div className="experience-aurora experience-aurora-two" aria-hidden="true" />
    <div className="falling-emojis" aria-hidden="true">{fallingItems.map((item, index) => <span key={index} style={{ left: item.left, animationDelay: item.delay, animationDuration: item.duration, fontSize: item.size }}>{item.value}</span>)}</div>
    <section className="experience-card" aria-live="polite">
      <div className="experience-topline">{showWatermark ? <span className="experience-brand">Link<span>li</span></span> : <span aria-hidden="true">{config.emoji}</span>}{screen === "question" ? <span dir="ltr">{step + 1} / {config.questions.length}</span> : <span>{config.introLabel}</span>}</div>

      {screen === "intro" ? <div className="experience-screen experience-intro">
        {/* Special Wax Seal Envelope for Love Note */}
        {config.theme === "letter" && !waxOpened ? (
          <div className="wax-envelope-card" onClick={() => setWaxOpened(true)}>
            <div className="wax-seal">💌</div>
            <h3>מכתב אישי מיוחד</h3>
            <p>לחצו לפתיחת חותם השעווה ✉️</p>
          </div>
        ) : (
          <>
            <div className="experience-emoji-wrap"><span>{config.emoji}</span><i aria-hidden="true">✦</i></div>
            <p className="experience-greeting">שלום {config.recipient},</p>
            <h1>{config.headline}</h1>
            <p className="experience-copy">{config.subtitle}</p>
            <div className="experience-meta">{config.highlights.map((highlight) => <span key={highlight}>✦ {highlight}</span>)}</div>
            <button className="experience-primary" onClick={start}>{config.startText}<span aria-hidden="true">←</span></button>
            <p className="experience-hint">זה לוקח בערך דקה</p>
          </>
        )}
      </div> : null}

      {screen === "question" && question ? <div className="experience-screen experience-question" key={step}>
        <div className="experience-progress" style={{ gridTemplateColumns: `repeat(${config.questions.length}, minmax(0, 1fr))` }} aria-label={`שלב ${step + 1} מתוך ${config.questions.length}`}>{config.questions.map((_, index) => <i className={index <= step ? "active" : ""} key={index} />)}</div>
        <span className="experience-step">שאלה {step + 1}</span>
        <h2>{question.prompt}</h2>
        <p className="experience-copy">{question.helper}</p>

        <div className="experience-options">
          {question.options.map((option, index) => (
            <button className={answers[step] === option ? "selected" : ""} onClick={() => choose(option)} key={`${option}-${index}`}>
              <span>{String.fromCharCode(1488 + index)}</span>
              <b>{option}</b>
              <i aria-hidden="true">✓</i>
            </button>
          ))}
        </div>

        {error ? <p className="experience-error" role="alert">בחרו תשובה כדי להמשיך 😊</p> : null}
        <div className="experience-navigation"><button className="experience-back" onClick={back}>חזרה</button><button className="experience-primary" onClick={next}>{step === config.questions.length - 1 ? config.finalButtonText : "לשאלה הבאה"}<span aria-hidden="true">←</span></button></div>
      </div> : null}

      {screen === "result" ? <div className="experience-screen experience-result">
        {/* Mischief/Prank fake system popup */}
        {config.theme === "mischief" && !prankDone ? (
          <div className="prank-fake-alert">
            <div className="prank-spinner">⚙️</div>
            <h3>🚨 אזהרת אבטחה חמורה!</h3>
            <p>המערכת מבצעת בדיקת תאימות נתונים...</p>
            <div className="prank-progress-bar">
              <div className="prank-progress-fill" style={{ width: `${prankProgress}%` }} />
            </div>
            <span>{prankProgress}% הושלמו</span>
          </div>
        ) : (
          <>
            <div className="success-burst" aria-hidden="true"><i>✦</i><i>★</i><i>✦</i><span>🎉</span></div>

            {scoredQuestions.length > 0 && config.theme === "playful" ? (
              <div className="friendship-badge-box">
                <span className="badge-title">{friendshipBadge}</span>
                <small>{score} תשובות נכונות מתוך {scoredQuestions.length}</small>
              </div>
            ) : (
              <span className="score-pill">{config.resultLabel}</span>
            )}

            <h2>{config.successTitle}</h2>

            {/* Special Gift Box for Birthday */}
            {config.theme === "party" && !giftOpened ? (
              <div className="gift-unwrapper" onClick={() => setGiftOpened(true)}>
                <span className="gift-emoji">🎁</span>
                <p>לחצו לפתיחת קופסת ההפתעה!</p>
              </div>
            ) : (
              <p className="experience-copy">{config.successText}</p>
            )}

            {/* Special Scratch Card for Date Theme */}
            {config.theme === "romance" && (
              <ScratchCanvas secretText={config.successTitle} />
            )}

            <div className="answer-recap">{config.questions.map((item, index) => <div key={index}><span>{index + 1}</span><p><small>{item.prompt}</small><b>{answers[index]}</b></p></div>)}</div>
            {config.whatsapp || previewMode ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="experience-primary experience-whatsapp" onClick={trackClick}><span aria-hidden="true">◉</span>{previewMode ? "שיתוף התוצאה ב־WhatsApp" : config.buttonText}</a> : null}
            <button onClick={restart} className="experience-restart">התחלה מחדש</button>
          </>
        )}
      </div> : null}
    </section>
    {showWatermark ? <Link href="/" className="watermark">נוצר עם <b>Linkli</b> · גם אני רוצה</Link> : null}
  </main>;
}
