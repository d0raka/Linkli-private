"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import { buildDecorationItems } from "@/lib/decoration-motion";
import { composeEmojiElementStyle, elementHasFreeLayout, elementLayoutStyle, isTextLayoutKey, paintsChildFill, resolvedCopyAlign } from "@/lib/element-layout";
import { CUSTOM_BLOCKS, scratchCoverText, scratchSecretText, DEFAULT_MEMORY_SLIDES, type ElementStyleKey, type TemplateConfig, type TemplateTheme } from "@/lib/templates";

const EVENT_TICKET_THEMES = new Set<TemplateTheme>(["elegant", "wedding", "brit", "mitzvah", "henna"]);
import { buildIcs, clampGuestCount, countdownParts, googleCalendarUrl as buildGoogleCalendarUrl, normalizeEventInstant } from "@/lib/event-time";
import PageMusicPlayer, { MusicMuteFab, MusicPlaybackProvider } from "@/app/studio/page-music-player";
import { formatGuestWhatsAppReply, whatsappShareHref } from "@/lib/whatsapp-share";
import { UserImage } from "@/app/ui/user-image";

const subscribeToHydration = () => () => {};

type Screen = "intro" | "question" | "rsvp" | "result";

function elementStyle(config: TemplateConfig, key: ElementStyleKey, withLayout = true): CSSProperties {
  const style = config.elementStyles?.[key];
  const layout = withLayout && key !== "decorations" ? elementLayoutStyle(config, key) : {};
  if (key === "emoji") {
    return {
      ...(style ? { "--element-accent": style.accent, "--element-scale": style.size / 100 } : {}),
      ...composeEmojiElementStyle(config, layout, style),
    } as CSSProperties;
  }
  if (!style) return layout;
  const vars = {
    "--element-accent": style.accent,
    "--element-bg": style.background,
    "--element-color": style.color,
    "--element-radius": `${style.radius}px`,
    "--element-scale": style.size / 100,
    textAlign: resolvedCopyAlign(key, style.align),
    ...(isTextLayoutKey(key) ? {
      fontWeight: style.bold ? 800 : undefined,
      fontStyle: style.italic ? "italic" : undefined,
      textDecoration: style.underline ? "underline" : undefined,
    } : {}),
    ...layout,
  } as CSSProperties;
  if (paintsChildFill(key)) return vars;
  return {
    ...vars,
    backgroundColor: style.background,
    color: style.color,
    borderColor: style.accent,
    borderRadius: `${style.radius}px`,
  };
}

function elementClass(config: TemplateConfig, key: ElementStyleKey, base = "", withLayout = true) {
  return `${base} ${config.elementStyles?.[key] ? "published-element-customized" : ""} ${withLayout && elementHasFreeLayout(config, key) ? "published-el-free" : ""}`.trim();
}

function ElementSurface({ config, element, className = "", children }: { config: TemplateConfig; element: ElementStyleKey; className?: string; children: ReactNode }) {
  return <div className={elementClass(config, element, className)} style={elementStyle(config, element)}>{children}</div>;
}

/* Live countdown for event invitations */
function EventCountdown({ instant }: { instant: ReturnType<typeof normalizeEventInstant> }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!instant) return null;
  const parts = now == null ? { expired: false, days: 0, hours: 0, minutes: 0, seconds: 0 } : countdownParts(now, instant.start);
  if (now != null && parts.expired) {
    return (
      <div className="event-countdown-box is-expired">
        <span className="countdown-title">האירוע כבר התחיל</span>
        <p>הספירה הסתיימה. אפשר עדיין להשתמש ביומן ובניווט למטה.</p>
      </div>
    );
  }

  return (
    <div className="event-countdown-box">
      <span className="countdown-title">⏱️ סופרים את הימים לאירוע עד {instant.display}:</span>
      <div className="countdown-grid">
        <div className="countdown-unit"><b>{parts.days}</b><small>ימים</small></div>
        <div className="countdown-unit"><b>{parts.hours}</b><small>שעות</small></div>
        <div className="countdown-unit"><b>{parts.minutes}</b><small>דקות</small></div>
        <div className="countdown-unit"><b>{parts.seconds}</b><small>שניות</small></div>
      </div>
    </div>
  );
}

function CardUtilityActions({ config, googleCalendarUrl, onAppleCalendar }: { config: TemplateConfig; googleCalendarUrl: string; onAppleCalendar: () => void }) {
  const showCalendar = config.showCalendar ?? config.theme === "elegant";
  const showAppleCalendar = config.showAppleCalendar ?? false;
  const showWaze = config.showWaze ?? config.theme === "elegant";
  const showGoogleMaps = config.showGoogleMaps ?? false;
  const venue = config.venueName || "";
  const wazeUrl = config.wazeUrl || (venue ? `https://waze.com/ul?q=${encodeURIComponent(venue)}&navigate=yes` : "");
  const googleMapsUrl = config.googleMapsUrl || (venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}` : "");
  if (!showCalendar && !showAppleCalendar && !showWaze && !showGoogleMaps) return null;
  return <div className={elementClass(config, "calendar", "card-utility-actions")} style={elementStyle(config, "calendar")} aria-label="פעולות מהירות">
    {showCalendar && googleCalendarUrl ? <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">📅 הוספה ליומן</a> : null}
    {showAppleCalendar && googleCalendarUrl && <a href="#apple-calendar" onClick={(event) => { event.preventDefault(); onAppleCalendar(); }}> הורדה ליומן</a>}
    {showWaze && wazeUrl ? <a href={wazeUrl} target="_blank" rel="noopener noreferrer">🧭 ניווט בווייז</a> : null}
    {showGoogleMaps && googleMapsUrl ? <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">📍 פתיחה במפות</a> : null}
  </div>;
}

/* Interactive Memories Story Slide Component */
function MemoriesSlider({ slides = DEFAULT_MEMORY_SLIDES, slug }: { slides?: typeof DEFAULT_MEMORY_SLIDES; slug: string }) {
  const items = slides.length ? slides : DEFAULT_MEMORY_SLIDES;
  const [currentSlide, setCurrentSlide] = useState(0);
  const index = Math.min(currentSlide, items.length - 1);

  function go(delta: number) {
    setCurrentSlide((current) => {
      const next = current + delta;
      if (next < 0) return items.length - 1;
      if (next >= items.length) return 0;
      return next;
    });
  }

  return (
    <div
      className="memories-slider-box"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); go(1); }
        if (event.key === "ArrowRight") { event.preventDefault(); go(-1); }
      }}
    >
      <div className="memory-slide-card">
        {items[index].photoKey ? <UserImage className="memory-slide-photo" src={`/api/public/${slug}/memory?key=${encodeURIComponent(items[index].photoKey!)}`} alt={items[index].title} /> : <span className="slide-icon">{items[index].icon}</span>}
        <h4>{items[index].title}</h4>
        <p>{items[index].text}</p>
      </div>
      <div className="memory-slider-nav">
        <button type="button" aria-label="שקופית קודמת" onClick={() => go(-1)}>→</button>
        <div className="slider-dots">
          {items.map((_, i) => (
            <button key={i} type="button" className={i === index ? "active" : ""} aria-label={`שקופית ${i + 1} מתוך ${items.length}`} aria-current={i === index ? "true" : undefined} onClick={() => setCurrentSlide(i)} />
          ))}
        </div>
        <button type="button" aria-label="שקופית הבאה" onClick={() => go(1)}>←</button>
      </div>
    </div>
  );
}

/* Scratch Card Canvas Component for Date Theme */
function ScratchCanvas({ secretText, coverText, fontFamily = "Rubik" }: { secretText: string; coverText: string; fontFamily?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 120;

    ctx.fillStyle = "#e2b659";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (coverText) {
      let fontSize = 16;
      ctx.textAlign = "center";
      ctx.fillStyle = "#5c4308";
      ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
      const maxWidth = canvas.width - 28;
      while (fontSize > 11 && ctx.measureText(coverText).width > maxWidth) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
      }
      ctx.fillText(coverText, canvas.width / 2, canvas.height / 2 + 5, maxWidth);
    }

    let isDrawing = false;

    function scratch(e: MouseEvent | TouchEvent) {
      if (!isDrawing || !canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const x = (clientX - rect.left) * canvas.width / rect.width;
      const y = (clientY - rect.top) * canvas.height / rect.height;

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
  }, [coverText, fontFamily]);

  return (
    <div className="scratch-container">
      <div className="scratch-surface">
      <div className="scratch-secret">
        <span>💘</span>
        <strong>{secretText}</strong>
      </div>
      {!revealed && (
        <canvas ref={canvasRef} className="scratch-canvas" />
      )}
      </div>
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
    <button type="button" className="gift-voucher-card" aria-expanded={unwrapped} onClick={() => setUnwrapped(true)}>
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
          <p className="experience-copy">{text}</p>
          <div className="voucher-code">קוד מימוש: <strong>{code || "LINKLI-GIFT-2026"}</strong></div>
          {terms && <small style={{ display: "block", marginTop: "6px", opacity: 0.8 }}>{terms}</small>}
        </div>
      )}
    </button>
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
    <button type="button" className="birthday-candle-box" onClick={blow}>
      <div className={`candle ${lit ? "lit" : "extinguished"}`}>
        {lit ? <span className="flame">🔥</span> : <span className="smoke">💨</span>}
        <div className="stick" />
      </div>
      <p>{lit ? "לחצו על הנר. יש משאלה באמצע." : "כיביתם. עכשיו הברכה."}</p>
    </button>
  );
}

export default function PublishedExperience({ slug, templateId, config, showWatermark, trackAnalytics = true, embedded = false, previewMode = false, draftPreview = false, draftPreviewHref = "/studio", previewCtaHref = "/register", previewCtaLabel }: { slug: string; templateId?: string; config: TemplateConfig; showWatermark: boolean; trackAnalytics?: boolean; embedded?: boolean; previewMode?: boolean; draftPreview?: boolean; draftPreviewHref?: string; previewCtaHref?: string; previewCtaLabel?: string }) {
  const interactive = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [screen, setScreen] = useState<Screen>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);

  // Interactive step states
  const [waxOpened, setWaxOpened] = useState(false);
  const [candleExtinguished, setCandleExtinguished] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [customSong, setCustomSong] = useState("");
  const [copiedToast, setCopiedToast] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [rsvpConsent, setRsvpConsent] = useState(false);
  const [rsvpHoneypot, setRsvpHoneypot] = useState("");
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpError, setRsvpError] = useState("");
  const collectRsvp = config.rsvpEnabled === true && (!previewMode || draftPreview);
  const isCustomBlank = templateId === "custom-blank";
  const usesEventTicket = EVENT_TICKET_THEMES.has(config.theme);
  const customBlocks = config.customBlocks ?? CUSTOM_BLOCKS.map((block) => block.id);
  const customBlockEnabled = (blockId: string, fallback = true) => !isCustomBlank ? fallback : customBlocks.includes(blockId);
  const hasQuestions = customBlockEnabled("questions") && config.questions.length > 0;

  useEffect(() => {
    if (!trackAnalytics) return;
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "view" }) });
  }, [slug, trackAnalytics]);

  useEffect(() => {
    if (!embedded) window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true" ? "auto" : "smooth" });
  }, [screen, step, embedded]);

  const fallingItems = useMemo(() => buildDecorationItems(config), [config]);

  const formattedAnswers = config.questions.map((question) => {
    if (question.widget === "guest-count" && config.showGuests) return `${guestCount} אורחים`;
    if (question.widget === "dj-song" && config.showDjSong) return customSong.trim() || "נשאיר לכם לבחור";
    return answers[question.id] || "";
  });
  const answerSummary = config.questions.map((question, index) => `• ${question.prompt} — ${formattedAnswers[index] || "נבחר"}`).join("\n");
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const fullShareText = formatGuestWhatsAppReply({ message: config.whatsappText, answers: answerSummary, url: pageUrl });
  const whatsappMessage = fullShareText.slice(0, 1800);
  const whatsappUrl = whatsappShareHref(whatsappMessage, config.whatsapp || "");
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(whatsappMessage)}`;

  const question = config.questions[step];

  function start() {
    setScreen(hasQuestions ? "question" : collectRsvp ? "rsvp" : "result");
    setStep(0);
  }

  function choose(option: string) {
    setAnswers((current) => ({ ...current, [question.id]: option }));
    setError(false);
  }

  function next() {
    if ((!question.widget || question.widget === "choice" || (question.widget === "guest-count" && !config.showGuests) || (question.widget === "dj-song" && !config.showDjSong)) && !answers[question.id]) { setError(true); return; }
    setError(false);
    if (step < config.questions.length - 1) setStep((current) => current + 1);
    else setScreen(collectRsvp ? "rsvp" : "result");
  }

  function back() {
    setError(false);
    if (screen === "rsvp") {
      if (hasQuestions) {
        setScreen("question");
        setStep(Math.max(0, config.questions.length - 1));
      } else {
        setScreen("intro");
      }
      return;
    }
    if (step > 0) setStep((current) => current - 1);
    else setScreen("intro");
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setError(false);
    setWaxOpened(false);
    setCandleExtinguished(false);
    setGuestCount(1);
    setCustomSong("");
    setGuestName("");
    setGuestContact("");
    setRsvpConsent(false);
    setRsvpError("");
    setScreen("intro");
  }

  async function submitRsvp() {
    if (rsvpSubmitting) return;
    const name = guestName.trim();
    if (name.length < 2) { setRsvpError("יש למלא שם."); return; }
    if (!rsvpConsent) { setRsvpError("נדרשת הסכמה לשמירת המענה."); return; }
    setRsvpSubmitting(true);
    setRsvpError("");
    try {
      const response = await fetch(`/api/public/${slug}/rsvp${draftPreview ? "?preview=1" : ""}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preview: draftPreview,
          ...(draftPreview ? { previewConfig: config } : {}),
          name,
          contact: guestContact.trim(),
          consent: true,
          guestCount,
          song: customSong.trim(),
          answers: formattedAnswers,
          company: rsvpHoneypot,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setRsvpError(payload.error || "לא הצלחנו לשמור את המענה. נסו שוב.");
        return;
      }
      setScreen("result");
    } catch {
      setRsvpError("לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב.");
    } finally {
      setRsvpSubmitting(false);
    }
  }

  async function copySummaryToClipboard() {
    try { await navigator.clipboard.writeText(fullShareText); setCopiedToast(true); setCopyError(""); setTimeout(() => setCopiedToast(false), 3000); }
    catch { setCopyError("ההעתקה לא זמינה בדפדפן הזה. אפשר לשתף בוואטסאפ או להעתיק את הכתובת."); }
  }

  function trackClick() {
    if (!trackAnalytics) return;
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, event: "click" }), keepalive: true });
  }

  // Google calendar link helper for event invitations
  const eventInstant = normalizeEventInstant(config);
  const venueLabel = config.venueName || "";
  const googleCalendarUrl = eventInstant
    ? buildGoogleCalendarUrl({ title: config.headline, details: config.subtitle, location: venueLabel, instant: eventInstant })
    : "";
  const eventWhen = eventInstant?.display || config.eventDate || "";

  function downloadAppleCalendar() {
    if (!eventInstant) return;
    const content = buildIcs({
      uid: `event-${slug}@linkli.online`,
      title: config.headline,
      details: config.subtitle,
      location: venueLabel,
      instant: eventInstant,
    });
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "linkli-event.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  const Surface = embedded ? "div" : "main";
  const themeClass = `experience-shell experience-${config.theme} bg-${config.bgStyle || "soft"}`;
  const cardClass = `experience-card experience-card-${config.theme}`;
  const isBrandingHidden = !showWatermark;

  return (
  <MusicPlaybackProvider youtubeUrl={config.showMusicPlayer ? (config.musicYoutubeUrl || "") : ""}>
  <Surface className={themeClass} id={embedded ? undefined : "main-content"} dir="rtl" style={{
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
    "--page-button-color": config.buttonStyle === "soft" || config.buttonStyle === "outline" ? config.accent : "#ffffff",
    "--page-button-border": config.buttonStyle === "outline" ? `2px solid ${config.accent}` : undefined,
    "--page-bg-image": config.bgStyle === "image" ? `url("/api/public/${slug}/background?v=${config.bgImageVersion || 1}")` : "none",
  } as React.CSSProperties}>
    {draftPreview && !embedded ? <div className="template-preview-bar draft-preview-bar"><span className="draft-preview-note">תצוגת טיוטה · לא מפורסם</span><Link href={draftPreviewHref} className="button button-outline button-small">חזרה לעריכה</Link></div> : previewMode && !embedded ? <div className="template-preview-bar"><Link href="/#templates" className="template-preview-back">חזרה לכל התבניות</Link><Link href={previewCtaHref} data-marketing-event="preview_create" className="button button-primary button-small">{previewCtaLabel || "יצירת התבנית בחינם"}</Link></div> : null}
    {config.showMusicPlayer ? <MusicMuteFab /> : null}
    <div className="experience-aurora experience-aurora-one" aria-hidden="true" />
    <div className="experience-aurora experience-aurora-two" aria-hidden="true" />
    {config.showFallingEmojis !== false && customBlockEnabled("decorations") && <div className="falling-emojis" aria-hidden="true">{fallingItems.map((item, index) => <span className={elementClass(config, "decorations")} key={index} style={{ ...item.style, opacity: config.decorationOpacity ?? 0.5, ...elementStyle(config, "decorations") }}>{item.value}</span>)}</div>}
    
    <section className={`${cardClass} ${config.cardShape ? `shape-${config.cardShape}` : ""}`} aria-live="polite">
      <div className="experience-topline">{showWatermark && !isBrandingHidden ? <span className="experience-brand">Link<span>li</span></span> : <span aria-hidden="true">{config.emoji}</span>}{screen === "question" ? <span dir="ltr">{step + 1} / {config.questions.length}</span> : config.showIntroLabel !== false ? <span className={elementClass(config, "introLabel", "", false)} style={elementStyle(config, "introLabel", false)}>{config.introLabel}</span> : <span aria-hidden="true" />}</div>

      {screen === "intro" ? <div className="experience-screen experience-intro preview-layout-stack">
        {/* Special Wax Seal Envelope for Love Note */}
        {config.showWaxEnvelope === true && !waxOpened ? (
          <button type="button" disabled={!interactive} className={elementClass(config, "waxEnvelope", "wax-envelope-card")} style={elementStyle(config, "waxEnvelope")} onClick={() => setWaxOpened(true)}>
            <span className="wax-flap" aria-hidden="true" />
            <div className="wax-seal">💌</div>
            <h3>מכתב אישי מהלב</h3>
            <p>לחצו לפתיחת חותם השעווה ✉️</p>
          </button>
        ) : (
          <>
            {config.showEmoji !== false && customBlockEnabled("emoji") && <div className={elementClass(config, "emoji", "experience-emoji-wrap")} style={elementStyle(config, "emoji")}>{config.emojiImageVersion ? <UserImage src={`/api/public/${slug}/emoji?v=${config.emojiImageVersion}`} alt="" className="symbol-photo" loading="eager" /> : <span>{config.emoji}</span>}</div>}
            {config.showGreeting !== false && <p className={elementClass(config, "greeting", "experience-greeting")} style={elementStyle(config, "greeting")}>שלום {config.recipient},</p>}
            <h1 className={elementClass(config, "headline")} style={elementStyle(config, "headline")}>{config.headline}</h1>
            <p className={elementClass(config, "subtitle", "experience-copy")} style={elementStyle(config, "subtitle")}>{config.subtitle}</p>

            {/* Live event pass and countdown */}
            {config.showCountdown && customBlockEnabled("location") && eventInstant && <ElementSurface config={config} element="countdown"><EventCountdown instant={eventInstant} /></ElementSurface>}
            {usesEventTicket && config.showVenueCard !== false && (eventWhen || venueLabel) && (
              <div className={elementClass(config, "venue", "event-ticket-header")} style={elementStyle(config, "venue")}>
                {eventWhen ? <div className="event-ticket-row"><span>📅 תאריך ושעה:</span><b>{eventWhen}</b></div> : null}
                {venueLabel ? <div className="event-ticket-row"><span>📍 מיקום:</span><b>{venueLabel}</b></div> : null}
              </div>
            )}

            {config.showMemoriesSlider === true && <ElementSurface config={config} element="memories"><MemoriesSlider slides={config.memorySlides} slug={slug} /></ElementSurface>}

            {config.showMusicPlayer === true && (
              <ElementSurface config={config} element="musicPlayer" className="published-music-player">
                <PageMusicPlayer emptyHint="אין קישור יוטיוב בנגן הזה עדיין" />
              </ElementSurface>
            )}

            {config.showHighlights !== false && customBlockEnabled("highlights") && config.theme === "memories" && (
              <div className={elementClass(config, "highlights", "memory-filmstrip")} style={elementStyle(config, "highlights")}>{config.highlights.map((highlight) => <span key={highlight}>{highlight}</span>)}</div>
            )}

            {config.showHighlights !== false && customBlockEnabled("highlights") && !usesEventTicket && config.theme !== "memories" && (
              <div className={elementClass(config, "highlights", "experience-meta")} style={elementStyle(config, "highlights")}>{config.highlights.map((highlight) => <span key={highlight}>{highlight}</span>)}</div>
            )}

            {config.showVenueCard && customBlockEnabled("location") && !usesEventTicket && (venueLabel || eventWhen) && <div className={elementClass(config, "venue", "card-venue-summary")} style={elementStyle(config, "venue")}>{venueLabel ? <span>📍 {venueLabel}</span> : null}{eventWhen ? <b>📅 {eventWhen}</b> : null}</div>}

            {customBlockEnabled("location") && <CardUtilityActions config={config} googleCalendarUrl={googleCalendarUrl} onAppleCalendar={downloadAppleCalendar} />}

            <button className={elementClass(config, "primaryButton", "experience-primary")} style={elementStyle(config, "primaryButton")} disabled={!interactive} onClick={start}>{config.startText}<span aria-hidden="true">←</span></button>
            {config.showStartHint !== false && <p className="experience-hint">זה לוקח בערך דקה</p>}
          </>
        )}
      </div> : null}

      {screen === "question" && hasQuestions && question ? <div className="experience-screen experience-question preview-layout-stack" key={step}>
        <div className="experience-progress" style={{ gridTemplateColumns: `repeat(${config.questions.length}, minmax(0, 1fr))` }} aria-label={`שלב ${step + 1} מתוך ${config.questions.length}`}>{config.questions.map((_, index) => <i className={index <= step ? "active" : ""} key={index} />)}</div>
        <div className={elementClass(config, "question", "experience-question-copy")} style={elementStyle(config, "question")}>
          <span className="experience-step">שלב {step + 1}</span>
          <h2>{question.prompt}</h2>
          <p className="experience-copy">{question.helper}</p>
        </div>

        {question.widget === "guest-count" && config.showGuests === true ? (
          <div className={elementClass(config, "guestCounter", "guest-stepper-box")} style={elementStyle(config, "guestCounter")}>
            <div className="stepper-controls">
              <button type="button" aria-label="פחות אורחים" onClick={() => { const val = clampGuestCount(guestCount - 1, config.maxGuests ?? 10); setGuestCount(val); choose(`${val} אורחים`); }}>−</button>
              <span className="guest-num">{guestCount}</span>
              <button type="button" aria-label="עוד אורח" onClick={() => { const val = clampGuestCount(guestCount + 1, config.maxGuests ?? 10); setGuestCount(val); choose(`${val} אורחים`); }}>+</button>
            </div>
            <div className="guest-avatars">
              {Array.from({ length: guestCount }).map((_, i) => <span key={i}>👤</span>)}
            </div>
          </div>
        ) : question.widget === "dj-song" && config.showDjSong === true ? null : (
          <div className={elementClass(config, "options", "experience-options")} style={elementStyle(config, "options")}>
            {question.options.map((option, index) => (
              <button className={answers[question.id] === option ? "selected" : ""} onClick={() => choose(option)} key={`${option}-${index}`}>
                <span>{String.fromCharCode(1488 + index)}</span>
                <b>{option}</b>
                <i aria-hidden="true">✓</i>
              </button>
            ))}
          </div>
        )}

        {question.widget === "dj-song" && config.showDjSong === true && (
          <div className={elementClass(config, "djSong", "dj-song-input-box")} style={elementStyle(config, "djSong")}>
            <label htmlFor="guest-dj-song">🎵 רשמו שיר שאתם חייבים לשמוע ברחבה (רשות):</label>
            <input
              type="text"
              value={customSong}
              placeholder="שם השיר והאמן..."
              onChange={(e) => setCustomSong(e.target.value)}
              id="guest-dj-song"
              maxLength={120}
              className="dj-input-field"
            />
          </div>
        )}

        {error ? <p className="experience-error" role="alert">בחרו תשובה כדי להמשיך 😊</p> : null}
        <div className="experience-navigation"><button className="experience-back" onClick={back}>חזרה</button><button className={elementClass(config, "primaryButton", "experience-primary", false)} style={elementStyle(config, "primaryButton", false)} onClick={next}>{step === config.questions.length - 1 ? config.finalButtonText : "לשלב הבא"}<span aria-hidden="true">←</span></button></div>
      </div> : null}

      {draftPreview && config.rsvpEnabled && <p className="rsvp-test-banner" role="status">מצב בדיקה — התשובה לא נשמרת אצל האורחים</p>}
      {screen === "rsvp" ? <div className="experience-screen experience-result preview-layout-stack">
        <span className={elementClass(config, "resultLabel", "score-pill")} style={elementStyle(config, "resultLabel")}>לפני ששולחים</span>
        <h2 className={elementClass(config, "resultTitle")} style={elementStyle(config, "resultTitle")}>אישור ההגעה</h2>
        <p className={elementClass(config, "resultText", "experience-copy")} style={elementStyle(config, "resultText")}>{draftPreview ? "אפשר למלא ולשלוח כדי לבדוק את הטופס. פרטי הבדיקה אינם נשמרים." : "המענה יישמר אצל המארחים רק אחרי אישור. אפשר לעדכן אותו אחר כך מאותו מכשיר."}</p>
        <form className="experience-rsvp-form" method="post" action="/api/forms/noscript" onSubmit={(event) => { event.preventDefault(); void submitRsvp(); }}>
          <label className="contact-honeypot" aria-hidden="true">חברה<input name="company" tabIndex={-1} autoComplete="off" value={rsvpHoneypot} onChange={(event) => setRsvpHoneypot(event.target.value)} /></label>
          <label>השם שלכם<input value={guestName} maxLength={80} required onChange={(event) => setGuestName(event.target.value)} /></label>
          <label>דוא״ל או טלפון (לא חובה)<input value={guestContact} maxLength={160} onChange={(event) => setGuestContact(event.target.value)} /></label>
          <label><input type="checkbox" checked={rsvpConsent} onChange={(event) => setRsvpConsent(event.target.checked)} /> אני מאשר/ת שפרטי המענה יישמרו אצל המארחים לצורך האירוע.</label>
          {rsvpError ? <p className="experience-error" role="alert">{rsvpError}</p> : null}
          <div className="experience-navigation">
            <button type="button" className="experience-back" onClick={back}>חזרה</button>
            <button type="submit" className={elementClass(config, "primaryButton", "experience-primary", false)} style={elementStyle(config, "primaryButton", false)} disabled={rsvpSubmitting}>
              {rsvpSubmitting ? "שומרים…" : "שליחת האישור"}<span aria-hidden="true">←</span>
            </button>
          </div>
        </form>
      </div> : null}

      {screen === "result" ? <div className={`experience-screen experience-result preview-layout-stack result-${config.theme}`}>
        {config.resultLabel.trim() ? <span className={elementClass(config, "resultLabel", usesEventTicket ? "result-kicker" : "score-pill")} style={elementStyle(config, "resultLabel")}>{config.resultLabel}</span> : null}

        {usesEventTicket && config.showVenueCard !== false && (eventWhen || venueLabel) ? (
          <div className={elementClass(config, "venue", "event-ticket-header result-confirm-ticket")} style={elementStyle(config, "venue")}>
            {eventWhen ? <div className="event-ticket-row"><span>תאריך ושעה</span><b>{eventWhen}</b></div> : null}
            {venueLabel ? <div className="event-ticket-row"><span>מיקום</span><b>{venueLabel}</b></div> : null}
          </div>
        ) : null}

        {config.showCandle === true && (
          <ElementSurface config={config} element="candle"><BirthdayCandle onExtinguish={() => setCandleExtinguished(true)} /></ElementSurface>
        )}

        {config.showVoucher === true && (
          <ElementSurface config={config} element="voucher"><GiftVoucherBox title={config.voucherTitle || config.successTitle} text={config.successText} code={config.voucherCode} terms={config.voucherTerms} /></ElementSurface>
        )}

        {config.showCandle === true && !candleExtinguished ? null : (
          <>
            {config.successTitle.trim() ? <h2 className={elementClass(config, "resultTitle", config.theme === "letter" || config.theme === "playful" || config.theme === "party" ? "result-letter-title" : "")} style={elementStyle(config, "resultTitle")}>{config.successTitle}</h2> : null}
            {config.showVoucher !== true && config.successText.trim() ? (
              <p className={elementClass(config, "resultText", config.theme === "letter" || config.theme === "playful" || config.theme === "party" ? "experience-copy result-letter-body" : "experience-copy")} style={elementStyle(config, "resultText")}>{config.successText}</p>
            ) : null}
          </>
        )}

        {config.showScratchCard === true && (
          <ElementSurface config={config} element="scratch"><ScratchCanvas fontFamily={config.fontFamily} secretText={scratchSecretText(config)} coverText={scratchCoverText(config)} /></ElementSurface>
        )}

        {config.showMemoriesSlider === true && (
          <ElementSurface config={config} element="memories"><MemoriesSlider slides={config.memorySlides} slug={slug} /></ElementSurface>
        )}

        {customBlockEnabled("location") && <CardUtilityActions config={config} googleCalendarUrl={googleCalendarUrl} onAppleCalendar={downloadAppleCalendar} />}

        {config.showAnswerRecap !== false && !usesEventTicket && customBlockEnabled("answers") && !(config.showCandle === true && !candleExtinguished) && (
          <div className={elementClass(config, "answerRecap", "answer-recap answer-recap-chips")} style={elementStyle(config, "answerRecap")}>
            {config.questions.map((item, index) => formattedAnswers[index] ? <div key={item.id}><span>{index + 1}</span><p><small>{item.prompt}</small><b>{formattedAnswers[index]}</b></p></div> : null)}
          </div>
        )}

        {customBlockEnabled("share") && (config.showWhatsApp !== false || config.showTelegram === true || config.showCopy === true) && <div className={elementClass(config, "shareButtons", "multi-share-section")} style={elementStyle(config, "shareButtons")}>
          <div className="multi-share-grid">
            {config.showWhatsApp !== false ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="share-pill share-pill-wa" onClick={trackClick}>
                <span aria-hidden="true">↗</span> {config.buttonText || "שליחה בוואטסאפ"}
              </a>
            ) : null}
            {config.showTelegram === true && <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="share-pill share-pill-tg" onClick={trackClick}>
              <span aria-hidden="true">↗</span> טלגרם
            </a>}
            {config.showCopy === true && <button type="button" onClick={copySummaryToClipboard} className="share-pill share-pill-copy">
              <span>📋</span> {copiedToast ? "הועתק" : "העתקת מענה"}
            </button>}
          </div>
        </div>}

        {copyError && <p role="alert" className="experience-error">{copyError}</p>}
        <button onClick={restart} className="experience-restart">התחלה מחדש</button>
      </div> : null}
    </section>
    {!isBrandingHidden ? <Link href="/" className="watermark">נוצר עם <b>Linkli</b></Link> : null}
  </Surface>
  </MusicPlaybackProvider>
  );
}
