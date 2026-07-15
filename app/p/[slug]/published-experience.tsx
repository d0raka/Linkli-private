"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { TemplateConfig } from "@/lib/templates";

type Screen = "intro" | "question" | "result";

export default function PublishedExperience({ slug, config, showWatermark }: { slug: string; config: TemplateConfig; showWatermark: boolean }) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => config.questions.map(() => ""));
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "view" }) });
  }, [slug]);

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

  const scoredQuestions = config.questions.filter((question) => question.correctOption);
  const score = config.questions.reduce((total, question, index) => total + (question.correctOption && answers[index] === question.correctOption ? 1 : 0), 0);
  const answerSummary = config.questions.map((question, index) => `• ${question.prompt}: ${answers[index]}`).join("\n");
  const whatsappMessage = `${config.whatsappText}\n\n${answerSummary}`.slice(0, 1800);
  const whatsappUrl = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(whatsappMessage)}`;
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
    setScreen("intro");
  }

  function trackClick() {
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "click" }), keepalive: true });
  }

  return <main className={`experience-shell experience-${config.theme}`} id="main-content" style={{ "--page-soft": config.accentSoft, "--page-accent": config.accent } as React.CSSProperties}>
    <div className="experience-aurora experience-aurora-one" aria-hidden="true" />
    <div className="experience-aurora experience-aurora-two" aria-hidden="true" />
    <div className="falling-emojis" aria-hidden="true">{fallingItems.map((item, index) => <span key={index} style={{ left: item.left, animationDelay: item.delay, animationDuration: item.duration, fontSize: item.size }}>{item.value}</span>)}</div>
    <section className="experience-card" aria-live="polite">
      <div className="experience-topline"><span className="experience-brand">Link<span>li</span></span>{screen === "question" ? <span dir="ltr">{step + 1} / {config.questions.length}</span> : <span>{config.introLabel}</span>}</div>
      {screen === "intro" ? <div className="experience-screen experience-intro">
        <div className="experience-emoji-wrap"><span>{config.emoji}</span><i aria-hidden="true">✦</i></div>
        <p className="experience-greeting">היי {config.recipient}!</p>
        <h1>{config.headline}</h1>
        <p className="experience-copy">{config.subtitle}</p>
        <div className="experience-meta"><span>✦ 3 שאלות קצרות</span><span>✦ הפתעה בסוף</span></div>
        <button className="experience-primary" onClick={start}>{config.startText}<span aria-hidden="true">←</span></button>
        <p className="experience-hint">זה לוקח פחות מדקה</p>
      </div> : null}

      {screen === "question" && question ? <div className="experience-screen experience-question" key={step}>
        <div className="experience-progress" aria-label={`שלב ${step + 1} מתוך ${config.questions.length}`}>{config.questions.map((_, index) => <i className={index <= step ? "active" : ""} key={index} />)}</div>
        <span className="experience-step">שאלה {step + 1}</span>
        <h2>{question.prompt}</h2>
        <p className="experience-copy">{question.helper}</p>
        <div className="experience-options">{question.options.map((option, index) => <button className={answers[step] === option ? "selected" : ""} onClick={() => choose(option)} key={`${option}-${index}`}><span>{String.fromCharCode(1488 + index)}</span><b>{option}</b><i aria-hidden="true">✓</i></button>)}</div>
        {error ? <p className="experience-error" role="alert">בחרו תשובה כדי להמשיך 😊</p> : null}
        <div className="experience-navigation"><button className="experience-back" onClick={back}>חזרה</button><button className="experience-primary" onClick={next}>{step === config.questions.length - 1 ? "חשיפת ההפתעה" : "לשאלה הבאה"}<span aria-hidden="true">←</span></button></div>
      </div> : null}

      {screen === "result" ? <div className="experience-screen experience-result">
        <div className="success-burst" aria-hidden="true"><i>✦</i><i>★</i><i>✦</i><span>🎉</span></div>
        {scoredQuestions.length && config.theme === "playful" ? <span className="score-pill">ענית נכון על {score} מתוך {scoredQuestions.length}</span> : <span className="score-pill">הגעת עד הסוף ✨</span>}
        <h2>{config.successTitle}</h2>
        <p className="experience-copy">{config.successText}</p>
        <div className="answer-recap">{config.questions.map((item, index) => <div key={index}><span>{index + 1}</span><p><small>{item.prompt}</small><b>{answers[index]}</b></p></div>)}</div>
        {config.whatsapp ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="experience-primary experience-whatsapp" onClick={trackClick}><span aria-hidden="true">◉</span>{config.buttonText}</a> : null}
        <button onClick={restart} className="experience-restart">להתחיל שוב</button>
      </div> : null}
    </section>
    {showWatermark ? <Link href="/" className="watermark">נוצר עם <b>Linkli</b> · גם אני רוצה</Link> : null}
  </main>;
}
