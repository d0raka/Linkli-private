"use client";

import { useEffect, useState } from "react";
import { templates, type TemplateConfig, type TemplateQuestion } from "@/lib/templates";
import type { ProjectRecord } from "@/lib/projects";

type Profile = { email: string; displayName: string; plan: "free" | "plus"; emailVerified: boolean };
type Notice = { text: string; error?: boolean } | null;

export default function StudioClient({ initialName }: { initialName: string }) {
  const [profile, setProfile] = useState<Profile>({ email: "", displayName: initialName, plan: "free", emailVerified: true });
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"dashboard" | "templates" | "editor">(() => {
    if (typeof window === "undefined") return "dashboard";
    const query = new URLSearchParams(window.location.search);
    return query.get("template") || query.get("upgrade") ? "templates" : "dashboard";
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const selected = projects.find((project) => project.id === selectedId) ?? null;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects", { cache: "no-store" }).then((response) => response.json().then((data) => ({ response, data }))).then(({ response, data }) => {
      if (cancelled) return;
      if (response.ok) {
        setProfile(data.profile);
        setProjects(data.projects);
        if (data.projects.length) setSelectedId(data.projects[0].id);
      } else setNotice({ text: data.error || "לא הצלחנו לטעון את סביבת העבודה.", error: true });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function flash(text: string, error = false) {
    setNotice({ text, error });
    window.setTimeout(() => setNotice(null), 4500);
  }

  async function createProject(templateId: string) {
    const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId }) });
    const data = await response.json();
    if (!response.ok) { flash(data.error || "לא הצלחנו ליצור את העמוד", true); return; }
    setProjects((items) => [data.project, ...items]);
    setSelectedId(data.project.id);
    setMode("editor");
    flash("העמוד נוצר. עכשיו אפשר להתאים אותו בדיוק למה שצריך ✨");
  }

  function updateSelected(patch: Partial<ProjectRecord>) {
    setProjects((items) => items.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
  }

  function updateConfig<K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) {
    if (!selected) return;
    updateSelected({ config: { ...selected.config, [key]: value } });
  }

  async function saveProject() {
    if (!selected) return false;
    setSaving(true);
    const response = await fetch(`/api/projects/${selected.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: selected.title, config: selected.config }) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) { flash(data.error || "לא הצלחנו לשמור את השינויים.", true); return false; }
    updateSelected(data.project);
    flash("כל השינויים נשמרו בהצלחה.");
    return true;
  }

  async function togglePublish() {
    if (!selected) return;
    if (!selected.published && !(await saveProject())) return;
    const response = await fetch(`/api/projects/${selected.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ published: !selected.published }) });
    const data = await response.json();
    if (!response.ok) return flash(data.error || "לא הצלחנו לעדכן את מצב הפרסום.", true);
    updateSelected(data.project);
    flash(data.project.published ? "העמוד פורסם ומוכן לשיתוף 🚀" : "העמוד הוחזר למצב טיוטה.");
  }

  async function updatePagePassword(password: string | null) {
    if (!selected) return false;
    setSaving(true);
    const response = await fetch(`/api/projects/${selected.id}/password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(password === null ? { remove: true } : { password }) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) { flash(data.error || "לא הצלחנו לעדכן את הגנת העמוד.", true); return false; }
    updateSelected(data.project);
    flash(password === null ? "הגנת הסיסמה הוסרה מהעמוד." : "העמוד מוגן עכשיו בסיסמה.");
    return true;
  }

  async function removeProject() {
    if (!selected || !window.confirm("למחוק את העמוד? לא ניתן לבטל את הפעולה.")) return;
    const response = await fetch(`/api/projects/${selected.id}`, { method: "DELETE" });
    if (!response.ok) return flash("לא הצלחנו למחוק את העמוד.", true);
    const remaining = projects.filter((item) => item.id !== selected.id);
    setProjects(remaining); setSelectedId(remaining[0]?.id ?? null); setMode("dashboard"); flash("העמוד נמחק בהצלחה.");
  }

  async function upgrade() {
    window.location.href = "/checkout";
  }

  const publishedCount = projects.filter((project) => project.published).length;
  const totalViews = projects.reduce((sum, project) => sum + project.views, 0);
  const totalClicks = projects.reduce((sum, project) => sum + project.clicks, 0);

  if (loading) return <div className="loading">טוענים את סביבת העבודה…</div>;

  return (
    <div className="studio-main">
      <div className="studio-title-row">
        <div><h1>{mode === "editor" ? "עריכת העמוד" : mode === "templates" ? "איזה עמוד ניצור היום?" : `שלום ${profile.displayName} 👋`}</h1><p>{mode === "editor" ? "השינויים מופיעים מיד בתצוגה המקדימה." : "כאן יוצרים, עורכים ומפרסמים את כל העמודים שלך."}</p></div>
        {mode !== "templates" && <button className="button button-primary" onClick={() => setMode("templates")}>+ עמוד חדש</button>}
      </div>
      {notice && <div className={`status-message ${notice.error ? "error" : ""}`}>{notice.text}</div>}

      {!profile.emailVerified && <div className="verification-banner"><div><b>כתובת הדוא״ל עדיין לא אומתה</b><span>אימות הכתובת שומר על החשבון ומאפשר שחזור גישה.</span></div><a className="button button-outline" href="/verify-email">אימות עכשיו</a></div>}

      {profile.plan === "free" && mode !== "editor" && <div className="upgrade-banner"><div><h3>רוצים להסיר את מיתוג Linkli?</h3><p>כל התבניות, עד 10 עמודים וללא סימן מים — ב־₪9.90 לחודש.</p></div><button className="button" onClick={upgrade}>שדרוג ל־Plus</button></div>}

      {mode === "templates" ? (
        <section className="studio-panel">
          <div className="template-picker">
            {templates.map((template) => {
              const locked = !template.free && profile.plan !== "plus";
              return <button className={`template-choice template-choice-${template.config.theme} ${locked ? "locked" : ""}`} key={template.id} onClick={() => locked ? upgrade() : createProject(template.id)}>
                {locked && <span className="lock-label">PLUS</span>}<span className="template-step-label">3 שלבים</span><span className="emoji">{template.emoji}</span><h3>{template.name}</h3><p>{template.description}</p><span className="template-choice-action">שימוש בתבנית ←</span>
              </button>;
            })}
          </div>
          <div className="editor-actions"><button className="button button-outline" onClick={() => setMode("dashboard")}>חזרה לעמודים שלי</button></div>
        </section>
      ) : mode === "editor" && selected ? (
        <Editor key={selected.id} project={selected} profile={profile} saving={saving} onProject={updateSelected} onConfig={updateConfig} onSave={saveProject} onPublish={togglePublish} onPassword={updatePagePassword} onDelete={removeProject} />
      ) : (
        <div className="studio-layout">
          <aside className="studio-panel project-sidebar"><h2>העמודים שלי</h2><div className="project-list">{projects.length ? projects.map((project) => <button key={project.id} className={`project-item ${selectedId === project.id ? "active" : ""}`} onClick={() => setSelectedId(project.id)}><b>{project.title}</b><span>{project.published ? "🟢 פורסם" : "טיוטה"} · /p/{project.slug}</span></button>) : <div className="empty-projects">עדיין לא יצרת עמודים.<br />אפשר להתחיל מבחירת תבנית ✨</div>}</div></aside>
          <section>
            <div className="metrics"><div className="metric"><strong>{publishedCount}</strong><span>עמודים שפורסמו</span></div><div className="metric"><strong>{totalViews}</strong><span>צפיות</span></div><div className="metric"><strong>{totalClicks}</strong><span>לחיצות על הפעולה</span></div></div>
            <div className="studio-panel">{selected ? <><h2>{selected.title}</h2><p style={{color:"var(--muted)",fontSize:13}}>תבנית: {templates.find((item) => item.id === selected.templateId)?.name} · עודכן לאחרונה {new Date(selected.updatedAt).toLocaleDateString("he-IL")}</p><div className="editor-actions"><button className="button button-primary" onClick={() => setMode("editor")}>עריכת העמוד</button>{selected.published && <a className="button button-outline" href={`/p/${selected.slug}`} target="_blank" rel="noreferrer">פתיחת העמוד ↗</a>}</div></> : <><h2>העמוד הראשון מחכה לך</h2><p style={{color:"var(--muted)"}}>בוחרים תבנית ומקבלים עמוד מוכן לעריכה ולשיתוף.</p><button className="button button-primary" onClick={() => setMode("templates")}>בחירת תבנית</button></>}</div>
          </section>
        </div>
      )}
    </div>
  );
}

type EditorSection = "opening" | "questions" | "completion" | "design";
type PreviewScreen = "intro" | "question" | "result";

const editorSections: { id: EditorSection; label: string; helper: string }[] = [
  { id: "opening", label: "פתיחה", helper: "המסר הראשון שהמבקרים רואים" },
  { id: "questions", label: "שאלות", helper: "בניית המסלול האינטראקטיבי" },
  { id: "completion", label: "מסך סיום", helper: "סיכום והנעה לפעולה" },
  { id: "design", label: "עיצוב ושיתוף", helper: "צבעים, פרסום וקישור" },
];

function Editor({ project, profile, saving, onProject, onConfig, onSave, onPublish, onPassword, onDelete }: { project: ProjectRecord; profile: Profile; saving: boolean; onProject: (patch: Partial<ProjectRecord>) => void; onConfig: <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => void; onSave: () => void; onPublish: () => void; onPassword: (password: string | null) => Promise<boolean>; onDelete: () => void }) {
  const c = project.config;
  const [section, setSection] = useState<EditorSection>("opening");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>("intro");
  const [previewQuestion, setPreviewQuestion] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<string[]>(() => c.questions.map(() => ""));
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const shareUrl = typeof window === "undefined" ? `/p/${project.slug}` : `${window.location.origin}/p/${project.slug}`;
  const activeSectionIndex = editorSections.findIndex((item) => item.id === section);
  const activeSection = editorSections[activeSectionIndex];
  const activeQuestion = c.questions[questionIndex];
  const previewQuestionData = c.questions[previewQuestion];

  function updateQuestion(index: number, patch: Partial<TemplateQuestion>) {
    onConfig("questions", c.questions.map((question, currentIndex) => currentIndex === index ? { ...question, ...patch } : question));
  }

  function updateQuestionOption(questionPosition: number, optionPosition: number, value: string) {
    const question = c.questions[questionPosition];
    const previous = question.options[optionPosition];
    const options = question.options.map((option, index) => index === optionPosition ? value.slice(0, 120) : option);
    updateQuestion(questionPosition, { options, correctOption: question.correctOption === previous ? value.slice(0, 120) : question.correctOption });
  }

  function addQuestionOption(questionPosition: number) {
    const question = c.questions[questionPosition];
    if (question.options.length >= 6) return;
    updateQuestion(questionPosition, { options: [...question.options, `אפשרות ${question.options.length + 1}`] });
  }

  function removeQuestionOption(questionPosition: number, optionPosition: number) {
    const question = c.questions[questionPosition];
    if (question.options.length <= 2) return;
    const removed = question.options[optionPosition];
    updateQuestion(questionPosition, { options: question.options.filter((_, index) => index !== optionPosition), correctOption: question.correctOption === removed ? "" : question.correctOption });
    if (previewAnswers[questionPosition] === removed) setPreviewAnswers((answers) => answers.map((answer, index) => index === questionPosition ? "" : answer));
  }

  function addQuestion() {
    if (c.questions.length >= 10) return;
    const nextQuestion: TemplateQuestion = { prompt: `שאלה ${c.questions.length + 1}`, helper: "הוסיפו הסבר קצר שיעזור לבחור תשובה.", options: ["אפשרות 1", "אפשרות 2"], correctOption: "" };
    const nextIndex = c.questions.length;
    onConfig("questions", [...c.questions, nextQuestion]);
    setPreviewAnswers((answers) => [...answers, ""]);
    setQuestionIndex(nextIndex);
    setPreviewQuestion(nextIndex);
    setPreviewScreen("question");
  }

  function removeQuestion(position: number) {
    if (c.questions.length <= 1) return;
    const nextQuestions = c.questions.filter((_, index) => index !== position);
    const nextIndex = Math.min(position, nextQuestions.length - 1);
    onConfig("questions", nextQuestions);
    setPreviewAnswers((answers) => answers.filter((_, index) => index !== position));
    setQuestionIndex(nextIndex);
    setPreviewQuestion(nextIndex);
  }

  async function savePagePassword() {
    if (await onPassword(passwordDraft)) setPasswordDraft("");
  }

  function chooseSection(nextSection: EditorSection) {
    setSection(nextSection);
    if (nextSection === "opening") setPreviewScreen("intro");
    if (nextSection === "questions") {
      setPreviewQuestion(questionIndex);
      setPreviewScreen("question");
    }
    if (nextSection === "completion") setPreviewScreen("result");
  }

  function chooseQuestion(index: number) {
    setQuestionIndex(index);
    setPreviewQuestion(index);
    setPreviewScreen("question");
  }

  function moveSection(direction: -1 | 1) {
    const nextIndex = Math.min(editorSections.length - 1, Math.max(0, activeSectionIndex + direction));
    chooseSection(editorSections[nextIndex].id);
  }

  function setPreviewAnswer(answer: string) {
    setPreviewAnswers((answers) => answers.map((value, index) => index === previewQuestion ? answer : value));
  }

  function advancePreview() {
    if (previewQuestion < c.questions.length - 1) {
      setPreviewQuestion((index) => index + 1);
      setPreviewScreen("question");
    } else setPreviewScreen("result");
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return <div className="editor-workspace">
    <div className="mobile-editor-switch" role="group" aria-label="בחירת אזור עבודה">
      <button type="button" className={mobilePane === "edit" ? "active" : ""} aria-pressed={mobilePane === "edit"} onClick={() => setMobilePane("edit")}>עריכה</button>
      <button type="button" className={mobilePane === "preview" ? "active" : ""} aria-pressed={mobilePane === "preview"} onClick={() => setMobilePane("preview")}><span className="live-dot" /> תצוגה חיה</button>
    </div>

    <div className="editor-steps" role="navigation" aria-label="שלבי יצירת העמוד">
      {editorSections.map((item, index) => <button type="button" key={item.id} className={`${section === item.id ? "active" : ""} ${index < activeSectionIndex ? "complete" : ""}`} aria-current={section === item.id ? "step" : undefined} onClick={() => chooseSection(item.id)}>
        <span>{index < activeSectionIndex ? "✓" : index + 1}</span><b>{item.label}</b><small>{item.helper}</small>
      </button>)}
    </div>

    <div className="editor-grid editor-grid-guided">
      <section className={`studio-panel editor-panel ${mobilePane === "edit" ? "mobile-active" : ""}`}>
        <div className="editor-section-heading">
          <div><span>שלב {activeSectionIndex + 1} מתוך {editorSections.length}</span><h2>{activeSection.label}</h2><p>{activeSection.helper}. כל שינוי מופיע מיד בתצוגה.</p></div>
          <strong>{Math.round(((activeSectionIndex + 1) / editorSections.length) * 100)}%</strong>
        </div>

        {section === "opening" && <div className="form-section editor-stage-fields">
          <label>שם העמוד <small>לשימוש שלך בלבד</small><input value={project.title} placeholder="לדוגמה: אישור הגעה לחתונה" onChange={(event) => onProject({ title: event.target.value })} /></label>
          <label>שם הנמען או הקבוצה<input value={c.recipient} placeholder="לדוגמה: משפחת לוי" onChange={(event) => onConfig("recipient", event.target.value)} /></label>
          <label>תווית עליונה<input value={c.introLabel} placeholder="לדוגמה: הזמנה אישית" onChange={(event) => onConfig("introLabel", event.target.value)} /></label>
          <label>כיתוב כפתור ההתחלה<input value={c.startText} placeholder="לדוגמה: מתחילים" onChange={(event) => onConfig("startText", event.target.value)} /></label>
          <label className="full">כותרת ראשית<input value={c.headline} placeholder="הכותרת שתופיע בראש העמוד" onChange={(event) => onConfig("headline", event.target.value)} /></label>
          <label className="full">תיאור קצר<textarea value={c.subtitle} placeholder="הסבר קצר שמכין את המבקרים לתהליך" onChange={(event) => onConfig("subtitle", event.target.value)} /></label>
          <label className="full">פרטים מרכזיים <small>עד שתי שורות</small><textarea value={c.highlights.join("\n")} placeholder={"לדוגמה:\n18.09.2026 · 19:30\nחוות רונית, השרון"} onChange={(event) => onConfig("highlights", event.target.value.split("\n").map((value) => value.trim()).filter(Boolean).slice(0, 2))} /></label>
        </div>}

        {section === "questions" && activeQuestion && <div className="questions-stage">
          <div className="question-tabs" role="tablist" aria-label="בחירת שאלה לעריכה">
            {c.questions.map((_, index) => <button type="button" role="tab" aria-selected={questionIndex === index} className={questionIndex === index ? "active" : ""} key={index} onClick={() => chooseQuestion(index)}>שאלה {index + 1}</button>)}
            <button type="button" className="add-question-tab" disabled={c.questions.length >= 10} onClick={addQuestion}>+ הוספת שאלה</button>
          </div>
          <fieldset className="question-editor question-editor-focused">
            <legend><span>{questionIndex + 1}</span> עריכת שאלה {questionIndex + 1}</legend>
            <button type="button" className="remove-question-button" disabled={c.questions.length === 1} onClick={() => removeQuestion(questionIndex)}>מחיקת השאלה</button>
            <label>נוסח השאלה<input value={activeQuestion.prompt} placeholder="כתבו שאלה קצרה וברורה" onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} /></label>
            <label>הסבר קצר<input value={activeQuestion.helper} placeholder="מידע שיעזור לבחור תשובה" onChange={(event) => updateQuestion(questionIndex, { helper: event.target.value })} /></label>
            <div className="option-editor"><div><b>אפשרויות תשובה</b><small>כל אפשרות נשמרת בשורה נפרדת.</small></div>{activeQuestion.options.map((option, index) => <div className="option-editor-row" key={index}><span>{index + 1}</span><input value={option} aria-label={`אפשרות ${index + 1}`} maxLength={120} onChange={(event) => updateQuestionOption(questionIndex, index, event.target.value)} /><button type="button" aria-label={`מחיקת אפשרות ${index + 1}`} disabled={activeQuestion.options.length <= 2} onClick={() => removeQuestionOption(questionIndex, index)}>×</button></div>)}<button type="button" className="add-option-button" disabled={activeQuestion.options.length >= 6} onClick={() => addQuestionOption(questionIndex)}>+ הוספת אפשרות</button></div>
            <label>תשובה נכונה <small>רשות — לחידונים עם ניקוד</small><select value={activeQuestion.correctOption} onChange={(event) => updateQuestion(questionIndex, { correctOption: event.target.value })}><option value="">ללא ניקוד</option>{activeQuestion.options.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          </fieldset>
          <div className="question-stage-navigation"><button type="button" className="button button-outline" disabled={questionIndex === 0} onClick={() => chooseQuestion(questionIndex - 1)}>שאלה קודמת</button><span>{questionIndex + 1} / {c.questions.length}</span><button type="button" className="button button-dark" disabled={questionIndex === c.questions.length - 1} onClick={() => chooseQuestion(questionIndex + 1)}>שאלה הבאה</button></div>
        </div>}

        {section === "completion" && <div className="form-section editor-stage-fields">
          <label>תווית מסך הסיום<input value={c.resultLabel} placeholder="לדוגמה: הפרטים נקלטו" onChange={(event) => onConfig("resultLabel", event.target.value)} /></label>
          <label>כיתוב כפתור סיום השאלות<input value={c.finalButtonText} placeholder="לדוגמה: להצגת הסיכום" onChange={(event) => onConfig("finalButtonText", event.target.value)} /></label>
          <label className="full">כותרת מסך הסיום<input value={c.successTitle} placeholder="כותרת שמאשרת שהתהליך הושלם" onChange={(event) => onConfig("successTitle", event.target.value)} /></label>
          <label className="full">הודעת הסיום<textarea value={c.successText} placeholder="הודעת תודה, ברכה או הסבר על השלב הבא" onChange={(event) => onConfig("successText", event.target.value)} /></label>
          <div className="field-divider full"><b>כפתור WhatsApp</b><span>אפשר להשאיר את המספר ריק ולחבר אותו בהמשך.</span></div>
          <label>מספר כולל קידומת המדינה<input value={c.whatsapp} placeholder="972501234567" inputMode="numeric" dir="ltr" onChange={(event) => onConfig("whatsapp", event.target.value.replace(/\D/g, ""))} /></label>
          <label>כיתוב הכפתור<input value={c.buttonText} placeholder="לדוגמה: שליחת האישור" onChange={(event) => onConfig("buttonText", event.target.value)} /></label>
          <label className="full">הודעה מוכנה לשליחה<textarea value={c.whatsappText} placeholder="הטקסט שיופיע לפני סיכום התשובות" onChange={(event) => onConfig("whatsappText", event.target.value)} /></label>
        </div>}

        {section === "design" && <div className="design-stage">
          <div className="color-grid">
            <label className="color-field"><span><b>צבע ראשי</b><small>כפתורים והדגשות</small></span><input type="color" value={c.accent} aria-label="צבע ראשי" onChange={(event) => onConfig("accent", event.target.value)} /><code>{c.accent}</code></label>
            <label className="color-field"><span><b>צבע רקע</b><small>הרקע הרך של העמוד</small></span><input type="color" value={c.accentSoft} aria-label="צבע רקע" onChange={(event) => onConfig("accentSoft", event.target.value)} /><code>{c.accentSoft}</code></label>
          </div>
          <div className={`page-access-card ${project.passwordProtected ? "protected" : ""}`}><div className="page-access-heading"><span>{project.passwordProtected ? "🔒" : "🔓"}</span><div><b>הגנה באמצעות סיסמה</b><p>{project.passwordProtected ? "המבקרים חייבים להזין סיסמה לפני הצגת העמוד." : "אפשר להפוך את העמוד לפרטי ולשתף את הסיסמה רק עם מי שצריך."}</p></div><strong>{project.passwordProtected ? "פעיל" : "כבוי"}</strong></div><label>{project.passwordProtected ? "סיסמה חדשה — רק אם רוצים להחליף" : "בחירת סיסמה לעמוד"}<input type="password" value={passwordDraft} minLength={6} maxLength={64} autoComplete="new-password" dir="ltr" placeholder="לפחות 6 תווים" onChange={(event) => setPasswordDraft(event.target.value)} /></label><div className="page-access-actions"><button type="button" className="button button-dark" disabled={saving || passwordDraft.length < 6} onClick={savePagePassword}>{saving ? "שומרים…" : project.passwordProtected ? "החלפת סיסמה" : "הפעלת הגנה"}</button>{project.passwordProtected && <button type="button" className="remove-access-button" disabled={saving} onClick={() => onPassword(null)}>הסרת ההגנה</button>}</div></div>
          <div className="publish-card">
            <div className="publish-card-heading"><span className={project.published ? "published" : ""}>{project.published ? "● באוויר" : "○ טיוטה"}</span><div><b>{project.published ? "העמוד זמין לשיתוף" : "העמוד עדיין פרטי"}</b><p>{project.published ? "אפשר להעתיק את הקישור או לפתוח את העמוד המלא." : "פרסמו כשתהיו מרוצים מהתצוגה המקדימה."}</p></div></div>
            <div className="share-url-row"><span dir="ltr">{shareUrl}</span><button type="button" onClick={copyShareUrl}>{copied ? "הועתק ✓" : "העתקת קישור"}</button></div>
            <div className="publish-actions"><button type="button" className="button button-primary" onClick={onPublish}>{project.published ? "הסרה מהאוויר" : "שמירה ופרסום"}</button>{project.published && <a className="button button-outline" href={`/p/${project.slug}`} target="_blank" rel="noreferrer">פתיחת העמוד ↗</a>}</div>
          </div>
          <button type="button" className="delete-project-link" onClick={onDelete}>מחיקת העמוד</button>
        </div>}

        <div className="editor-workflow-actions">
          <button type="button" className="button button-outline" disabled={activeSectionIndex === 0} onClick={() => moveSection(-1)}>חזרה</button>
          <button type="button" className="save-inline" onClick={onSave}>{saving ? "שומר שינויים…" : "שמירת שינויים"}</button>
          {activeSectionIndex < editorSections.length - 1 ? <button type="button" className="button button-primary" onClick={() => moveSection(1)}>המשך: {editorSections[activeSectionIndex + 1].label} ←</button> : <button type="button" className="button button-primary" onClick={project.published ? onSave : onPublish}>{project.published ? "שמירת עדכון" : "שמירה ופרסום"}</button>}
        </div>
      </section>

      <aside className={`live-preview-panel ${mobilePane === "preview" ? "mobile-active" : ""}`} aria-label="תצוגה חיה של העמוד">
        <div className="live-preview-heading"><div><span className="live-dot" /><b>תצוגה חיה</b><small>מתעדכנת בזמן אמת</small></div><span>{profile.plan === "plus" ? "ללא מיתוג" : "תוכנית חינמית"}</span></div>
        <div className="preview-screen-tabs" role="tablist" aria-label="בחירת מסך לתצוגה">
          <button type="button" role="tab" aria-selected={previewScreen === "intro"} className={previewScreen === "intro" ? "active" : ""} onClick={() => setPreviewScreen("intro")}>פתיחה</button>
          {c.questions.map((_, index) => <button type="button" role="tab" aria-selected={previewScreen === "question" && previewQuestion === index} className={previewScreen === "question" && previewQuestion === index ? "active" : ""} key={index} onClick={() => { setPreviewQuestion(index); setPreviewScreen("question"); }}>{index + 1}</button>)}
          <button type="button" role="tab" aria-selected={previewScreen === "result"} className={previewScreen === "result" ? "active" : ""} onClick={() => setPreviewScreen("result")}>סיום</button>
        </div>

        <div className={`preview-frame preview-frame-live preview-${c.theme}`} style={{ "--preview-soft": c.accentSoft, "--preview-accent": c.accent } as React.CSSProperties}>
          <div className="preview-falling" aria-hidden="true">{c.decorations.slice(0, 5).map((item, index) => <span key={index} style={{ left: `${8 + index * 21}%`, animationDelay: `-${index * 1.1}s` }}>{item}</span>)}</div>
          <div className="preview-site-card">
            <div className="preview-site-topline"><span className="preview-site-brand">Link<span>li</span></span><span>{previewScreen === "intro" ? "פתיחה" : previewScreen === "result" ? "סיום" : `${previewQuestion + 1} / ${c.questions.length}`}</span></div>

            {previewScreen === "intro" && <div className="preview-site-screen preview-site-intro">
              <span className="preview-mini-label">{c.introLabel}</span><div className="big-emoji">{c.emoji}</div><p className="preview-greeting">שלום {c.recipient},</p><h2>{c.headline}</h2><p>{c.subtitle}</p>
              <div className="preview-highlights">{c.highlights.map((highlight, index) => <span key={index}>✓ {highlight}</span>)}</div>
              <button type="button" className="preview-action" onClick={() => { setPreviewQuestion(0); setPreviewScreen("question"); }}>{c.startText}<span>←</span></button>
            </div>}

            {previewScreen === "question" && previewQuestionData && <div className="preview-site-screen preview-site-question">
              <div className="preview-progress" style={{ gridTemplateColumns: `repeat(${c.questions.length}, minmax(0, 1fr))` }}>{c.questions.map((_, index) => <i className={index <= previewQuestion ? "active" : ""} key={index} />)}</div>
              <span className="preview-step-label">שאלה {previewQuestion + 1} מתוך {c.questions.length}</span><h2>{previewQuestionData.prompt}</h2><p>{previewQuestionData.helper}</p>
              <div className="preview-options">{previewQuestionData.options.map((option, index) => <button type="button" aria-pressed={previewAnswers[previewQuestion] === option} className={previewAnswers[previewQuestion] === option ? "selected" : ""} key={option} onClick={() => setPreviewAnswer(option)}><span>{index + 1}</span><b>{option}</b><i>✓</i></button>)}</div>
              <div className="preview-navigation"><button type="button" className="preview-back" disabled={previewQuestion === 0} onClick={() => setPreviewQuestion((index) => Math.max(0, index - 1))}>חזרה</button><button type="button" className="preview-action" onClick={advancePreview}>{previewQuestion === c.questions.length - 1 ? c.finalButtonText : "לשאלה הבאה"}<span>←</span></button></div>
            </div>}

            {previewScreen === "result" && <div className="preview-site-screen preview-site-result">
              <div className="preview-result-emoji">{c.emoji}<i>✨</i></div><span className="preview-mini-label">{c.resultLabel}</span><h2>{c.successTitle}</h2><p>{c.successText}</p>
              <div className="preview-answer-recap">{c.questions.map((question, index) => <div key={index}><span>{index + 1}</span><p><small>{question.prompt}</small><b>{previewAnswers[index] || "טרם נבחרה תשובה"}</b></p></div>)}</div>
              <button type="button" className="preview-action preview-whatsapp">{c.buttonText}</button><button type="button" className="preview-restart" onClick={() => setPreviewScreen("intro")}>התחלה מחדש</button>
            </div>}
            {profile.plan === "free" && <div className="preview-watermark">נוצר באמצעות <b>Linkli</b></div>}
          </div>
        </div>
        <p className="preview-interaction-hint">אפשר ללחוץ על הכפתורים והתשובות כדי לבדוק את החוויה המלאה.</p>
      </aside>
    </div>
  </div>;
}
