"use client";

import { useState } from "react";

type DemoTopic = "date" | "birthday" | "event";

const DEMOS: Record<DemoTopic, {
  emoji: string;
  title: string;
  questions: { prompt: string; helper: string; options: string[] }[];
  resultTitle: string;
  resultSub: string;
}> = {
  date: {
    emoji: "💘",
    title: "הזמנה לדייט",
    questions: [
      { prompt: "איזו אווירה מתאימה לערב?", helper: "אין תשובה לא נכונה — רק כיוון טוב", options: ["יין ושיחה טובה 🍷", "ארוחה במקום חדש 🍝", "ספונטני לגמרי ✨"] },
      { prompt: "מתי הכי כיף לך לצאת?", helper: "כדי שאוכל להתחיל לתכנן", options: ["חמישי בערב", "שישי בצהריים", "עדיף להשאיר כהפתעה"] },
      { prompt: "אז קובעים דייט?", helper: "זה הרגע לבחור את התשובה", options: ["כן, בשמחה 💕", "ברור שכן!", "כבר מחכה לזה"] },
    ],
    resultTitle: "קבענו דייט! 🥰",
    resultSub: "נשאר רק לבחור מקום ולהתחיל להתרגש.",
  },
  birthday: {
    emoji: "🎂",
    title: "הפתעת יום הולדת",
    questions: [
      { prompt: "בן כמה הלב מרגיש?", helper: "הגיל בתז לא משתתף במשחק", options: ["18 לנצח 🥳", "25 וקצת ✨", "צעיר ברוח ❤️"] },
      { prompt: "מה חובה בחגיגה?", helper: "מותר לבחור רק אחת", options: ["עוגה מוגזמת 🎂", "פלייליסט מושלם 🎵", "כל התשובות נכונות 🎈"] },
      { prompt: "איזו שנה מחכה לך?", helper: "בוחרים תחזית ומגשימים", options: ["שנה של הרפתקאות", "שנה של הצלחות", "השנה הכי טובה!"] },
    ],
    resultTitle: "יום הולדת שמח! 🎉",
    resultSub: "שתהיה שנה של המון סיבות לחייך.",
  },
  event: {
    emoji: "🥂",
    title: "הזמנה לאירוע",
    questions: [
      { prompt: "האם תגיעו לחגוג איתנו?", helper: "18.09.2026 · חוות רונית", options: ["כן, בשמחה 🥂", "עדיין לא בטוחים", "לצערנו לא נוכל"] },
      { prompt: "כמה מקומות לשמור?", helper: "כולל מי שמגיע איתכם", options: ["מקום אחד 👤", "שני מקומות 👥", "3+ מקומות 👨‍👩‍👧"] },
      { prompt: "העדפות תזונה?", helper: "נתאים את המנות עבורכם", options: ["ללא העדפה מיוחדת", "צמחוני / טבעוני", "ללא גלוטן"] },
    ],
    resultTitle: "המענה מוכן לשליחה 🥂",
    resultSub: "אפשר לשלוח אותו ב-WhatsApp ולהוסיף ליומן.",
  },
};

export default function HeroInteractive() {
  const [topic, setTopic] = useState<DemoTopic>("date");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const demo = DEMOS[topic];
  const isFinished = step >= demo.questions.length;
  const currentQ = demo.questions[step];

  function switchTopic(nextTopic: DemoTopic) {
    setTopic(nextTopic);
    setStep(0);
    setAnswers([]);
  }

  function choose(index: number) {
    const nextAnswers = [...answers];
    nextAnswers[step] = index;
    setAnswers(nextAnswers);

    setTimeout(() => {
      setStep((s) => s + 1);
    }, 250);
  }

  function reset() {
    setStep(0);
    setAnswers([]);
  }

  return (
    <div className="hero-stage" aria-label="תצוגה מקדימה אינטראקטיבית של עמוד Linkli">
      <div className="hero-emoji-rain" aria-hidden="true"><i>💕</i><i>✨</i><i>🌸</i><i>💗</i></div>
      <div className="spark spark-one">●</div><div className="spark spark-two">●</div>

      <div className="phone-card interactive-phone">
        <div className="phone-top">
          <span />
          <span />
          <span />
        </div>

        {/* Topic switcher tabs */}
        <div className="hero-topic-tabs">
          <button className={topic === "date" ? "active" : ""} onClick={() => switchTopic("date")}>💘 דייט</button>
          <button className={topic === "birthday" ? "active" : ""} onClick={() => switchTopic("birthday")}>🎂 יום הולדת</button>
          <button className={topic === "event" ? "active" : ""} onClick={() => switchTopic("event")}>🥂 אירוע</button>
        </div>

        <div className="phone-content">
          {!isFinished ? (
            <>
              <div className="floating-emoji">{demo.emoji}</div>
              <p className="mini-greeting">שאלה {step + 1} מתוך {demo.questions.length}</p>
              <div className="mini-progress">
                {demo.questions.map((_, i) => (
                  <i key={i} className={i <= step ? "active" : ""} />
                ))}
              </div>

              <h2 className="hero-q-title">{currentQ.prompt}</h2>
              <p className="hero-q-helper">{currentQ.helper}</p>

              <div className="interactive-options">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = answers[step] === idx;
                  return (
                    <button
                      key={idx}
                      className={`mini-option ${isSelected ? "active" : ""}`}
                      onClick={() => choose(idx)}
                    >
                      <span>{opt}</span>
                      <b>{isSelected ? "✓" : "○"}</b>
                    </button>
                  );
                })}
              </div>

              <button type="button" className="mini-button" onClick={() => step < demo.questions.length - 1 && setStep((s) => s + 1)}>
                {step < demo.questions.length - 1 ? "לשאלה הבאה ←" : "לצפייה בתוצאה ✨"}
              </button>
            </>
          ) : (
            <div className="hero-mini-result">
              <div className="hero-result-icon">{demo.emoji}</div>
              <h2>{demo.resultTitle}</h2>
              <p>{demo.resultSub}</p>
              <button className="mini-button interactive-restart" onClick={reset}>
                לנסות שוב 🔄
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="stat-bubble stat-views"><strong>3</strong><span>שאלות קצרות ✍️</span></div>
      <div className="stat-bubble stat-time"><strong>1</strong><span>קישור לשיתוף ⚡</span></div>
    </div>
  );
}
