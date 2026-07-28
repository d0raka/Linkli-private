"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CUSTOM_BLOCKS, getTemplateFeatures, templates, type TemplateConfig, type TemplateFeature, type TemplateQuestion } from "@/lib/templates";
import type { ProjectRecord } from "@/lib/projects";
import { PROJECT_LIMITS } from "@/lib/plans";

type Profile = { email: string; displayName: string; plan: "free" | "plus"; emailVerified: boolean };
type Notice = { text: string; error?: boolean } | null;

function toDisplayPhone(raw: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) {
    digits = "0" + digits.slice(3);
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function toNormalizedPhone(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) {
    return "972" + digits.slice(1);
  }
  if (digits.startsWith("972")) {
    return digits;
  }
  return "972" + digits;
}

export default function StudioClient({ initialName, initialMode = "dashboard" }: { initialName: string; initialMode?: "dashboard" | "templates" }) {
  const [profile, setProfile] = useState<Profile>({ email: "", displayName: initialName, plan: "free", emailVerified: true });
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"dashboard" | "templates" | "editor">(initialMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const creationInFlight = useRef(false);

  const selected = projects.find((project) => project.id === selectedId) ?? null;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects", { cache: "no-store" }).then((response) => response.json().then((data) => ({ response, data }))).then(({ response, data }) => {
      if (cancelled) return;
      if (response.ok) {
        setProfile(data.profile);
        setProjects(data.projects);
        if (data.projects.length) setSelectedId(data.projects[0].id);
      } else setNotice({ text: data.error || "לא הצלחנו לטעון את האזור האישי.", error: true });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function flash(text: string, error = false) {
    setNotice({ text, error });
    window.setTimeout(() => setNotice(null), 4500);
  }

  async function createProject(templateId: string) {
    if (creationInFlight.current) return;
    creationInFlight.current = true;
    setCreatingTemplateId(templateId);
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": requestId }, body: JSON.stringify({ templateId }) });
      const data = await response.json();
      if (!response.ok) { flash(data.error || "לא הצלחנו ליצור את העמוד", true); return; }
      setProjects((items) => [data.project, ...items.filter((item) => item.id !== data.project.id)]);
      setSelectedId(data.project.id);
      setMode("editor");
      flash("העמוד נוצר. עכשיו אפשר להתאים אותו בדיוק למה שצריך ✨");
    } catch {
      flash("החיבור התעכב ולא הצלחנו ליצור את העמוד. נסו שוב.", true);
    } finally {
      creationInFlight.current = false;
      setCreatingTemplateId(null);
    }
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

  async function removeProject(project: ProjectRecord | null = selected) {
    if (!project || !window.confirm(`למחוק את ״${project.title}״?\n\nהעמוד וכל הנתונים שלו יימחקו לצמיתות ולא ניתן יהיה לבטל את הפעולה.`)) return;
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return flash(data.error || "לא הצלחנו למחוק את העמוד.", true);
    const remaining = projects.filter((item) => item.id !== project.id);
    setProjects(remaining);
    if (selectedId === project.id) {
      setSelectedId(remaining[0]?.id ?? null);
      setMode("dashboard");
    }
    flash("העמוד נמחק בהצלחה.");
  }

  async function upgrade() {
    window.location.href = "/checkout";
  }

  const publishedCount = projects.filter((project) => project.published).length;
  const totalViews = projects.reduce((sum, project) => sum + project.views, 0);
  const totalClicks = projects.reduce((sum, project) => sum + project.clicks, 0);
  const firstPublishedProject = projects.find((project) => project.published);
  const firstPublishedUrl = firstPublishedProject ? `https://linkli.online/p/${firstPublishedProject.slug}` : "";
  const whatsappLaunchUrl = firstPublishedProject
    ? `https://wa.me/?text=${encodeURIComponent(`${firstPublishedProject.config.headline}\n${firstPublishedUrl}`)}`
    : "";
  const launchProgress = Number(projects.length > 0) + Number(publishedCount > 0) + Number(totalViews > 0);

  if (loading) return <div className="loading">טוענים את האזור האישי…</div>;

  return (
    <div className="studio-main">
      <div className="studio-title-row">
        <div><h1>{mode === "editor" ? "עריכת העמוד" : mode === "templates" ? "איזה עמוד ניצור היום?" : `שלום ${profile.displayName} 👋`}</h1><p>{mode === "editor" ? "השינויים מופיעים מיד בתצוגה המקדימה." : "כאן אפשר ליצור, לערוך ולפרסם את העמודים שלכם."}</p></div>
        {mode !== "templates" && <Link className="button button-primary" href="/studio/create">+ עמוד חדש</Link>}
      </div>
      {notice && <div className={`status-message ${notice.error ? "error" : ""}`}>{notice.text}</div>}

      {!profile.emailVerified && <div className="verification-banner"><div><b>כתובת הדוא״ל עדיין לא אומתה</b><span>אימות הכתובת שומר על החשבון ומאפשר שחזור גישה.</span></div><a className="button button-outline" href="/verify-email">אימות עכשיו</a></div>}

      {profile.plan === "free" && mode !== "editor" && <div className="upgrade-banner"><div><h3>העמוד הראשון שלכם יכול להיות אישי לגמרי</h3><p>כל כלי ההתאמה פתוחים גם במסלול החינמי לעמוד הראשון. Plus מוסיף עד {PROJECT_LIMITS.plus} עמודים, את כל התבניות ועמודים ללא מיתוג Linkli — ב־₪9.90 לחודש.</p></div><button className="button" onClick={upgrade}>שדרוג ל־Plus</button></div>}

      {mode === "dashboard" && launchProgress < 3 ? <section className="launch-checklist" aria-labelledby="launch-checklist-title">
        <div className="launch-checklist-heading">
          <div><span>מסלול השקה</span><h2 id="launch-checklist-title">מעמוד ראשון לביקור ראשון</h2><p>שלושה צעדים קצרים עד שהעמוד שלכם עובד באמת.</p></div>
          <strong>{launchProgress}/3</strong>
        </div>
        <div className="launch-progress" aria-label={`${launchProgress} מתוך 3 צעדים הושלמו`}><span style={{ width: `${(launchProgress / 3) * 100}%` }} /></div>
        <ol>
          <li className={projects.length ? "complete" : "current"}><span>{projects.length ? "✓" : "1"}</span><div><b>יצירת עמוד</b><small>{projects.length ? "העמוד הראשון מוכן לעריכה" : "בחרו תבנית והתחילו להתאים"}</small></div></li>
          <li className={publishedCount ? "complete" : projects.length ? "current" : ""}><span>{publishedCount ? "✓" : "2"}</span><div><b>פרסום העמוד</b><small>{publishedCount ? "יש לכם קישור פעיל" : "שמרו ופרסמו כשהעמוד מוכן"}</small></div></li>
          <li className={totalViews ? "complete" : publishedCount ? "current" : ""}><span>{totalViews ? "✓" : "3"}</span><div><b>הביקור הראשון</b><small>{totalViews ? "מישהו כבר נכנס לעמוד" : "שתפו את הקישור עם אדם אחד"}</small></div></li>
        </ol>
        <div className="launch-checklist-action">
          {!projects.length ? <Link className="button button-primary" href="/studio/create">יצירת העמוד הראשון</Link>
            : !publishedCount ? <button className="button button-primary" onClick={() => { setSelectedId(projects[0].id); setMode("editor"); }}>המשך לעריכה ופרסום</button>
              : <a className="button button-whatsapp" href={whatsappLaunchUrl} target="_blank" rel="noreferrer">שיתוף ראשון ב־WhatsApp</a>}
        </div>
      </section> : null}

      {mode === "templates" ? (
        <section className="studio-panel">
          <div className="template-picker">
            {templates.map((template) => {
              const locked = !template.free && profile.plan !== "plus";
              const creating = creatingTemplateId === template.id;
              return <button className={`template-choice template-choice-${template.config.theme} ${locked ? "locked" : ""}`} key={template.id} disabled={creatingTemplateId !== null} aria-busy={creating} onClick={() => locked ? upgrade() : createProject(template.id)}>
                {locked && <span className="lock-label">PLUS</span>}<span className="template-step-label">4 שלבים</span><span className="emoji">{template.emoji}</span><h3>{template.name}</h3><p>{template.description}</p><span className="template-choice-action">{creating ? "יוצרים את העמוד…" : "יצירת עמוד ←"}</span>
              </button>;
            })}
          </div>
          <div className="editor-actions"><Link className="button button-outline" href="/studio">חזרה לעמודים שלי</Link></div>
        </section>
      ) : mode === "editor" && selected ? (
        <Editor key={selected.id} project={selected} profile={profile} saving={saving} onProject={updateSelected} onConfig={updateConfig} onSave={saveProject} onPublish={togglePublish} onPassword={updatePagePassword} onDelete={removeProject} />
      ) : (
        <div className="studio-layout">
          <aside className="studio-panel project-sidebar"><h2>העמודים שלי</h2><div className="project-list">{projects.length ? projects.map((project) => <div className="project-list-row" key={project.id}><button className={`project-item ${selectedId === project.id ? "active" : ""}`} onClick={() => setSelectedId(project.id)}><b>{project.title}</b><span>{project.published ? "🟢 פורסם" : "טיוטה"} · /p/{project.slug}</span></button><button className="project-quick-delete" onClick={() => removeProject(project)} aria-label={`מחיקת העמוד ${project.title}`} title="מחיקת העמוד">🗑️</button></div>) : <div className="empty-projects">עדיין לא יצרת עמודים.<br />אפשר להתחיל מבחירת תבנית ✨</div>}</div></aside>
          <section>
            <div className="metrics"><div className="metric"><strong>{publishedCount}</strong><span>עמודים שפורסמו</span></div><div className="metric"><strong>{totalViews}</strong><span>צפיות</span></div><div className="metric"><strong>{totalClicks}</strong><span>לחיצות על הכפתור</span></div></div>
            <div className="studio-panel">{selected ? <><h2>{selected.title}</h2><p style={{color:"var(--muted)",fontSize:13}}>תבנית: {templates.find((item) => item.id === selected.templateId)?.name} · עודכן לאחרונה {new Date(selected.updatedAt).toLocaleDateString("he-IL")}</p><div className="editor-actions"><button className="button button-primary" onClick={() => setMode("editor")}>עריכת העמוד</button>{selected.published && <><a className="button button-outline" href={`/p/${selected.slug}`} target="_blank" rel="noreferrer">פתיחת העמוד ↗</a><a className="button button-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(`${selected.config.headline}\nhttps://linkli.online/p/${selected.slug}`)}`} target="_blank" rel="noreferrer">שיתוף ב־WhatsApp</a></>}</div></> : <><h2>העמוד הראשון מחכה לכם</h2><p style={{color:"var(--muted)"}}>בוחרים תבנית ומקבלים עמוד מוכן לעריכה ולשיתוף.</p><Link className="button button-primary" href="/studio/create">בחירת תבנית</Link></>}</div>
          </section>
        </div>
      )}
    </div>
  );
}

type EditorSection = "opening" | "questions" | "completion" | "design";
type PreviewScreen = "all" | "intro" | "question" | "result";

const editorSections: { id: EditorSection; label: string; helper: string }[] = [
  { id: "opening", label: "פתיחה", helper: "מה רואים כשנכנסים לעמוד" },
  { id: "questions", label: "שאלות", helper: "השאלות ואפשרויות התשובה" },
  { id: "completion", label: "סיום", helper: "מה רואים בסוף" },
  { id: "design", label: "עיצוב ושיתוף", helper: "צבעים, הגנה ושיתוף" },
];

type FeatureStage = "opening" | "questions" | "completion";

function featureBelongsToStage(feature: TemplateFeature, stage: FeatureStage) {
  if (stage === "questions") return ["showGuests", "showDjSong"].includes(feature.key);
  if (stage === "completion") return ["showScratchCard", "showCandle", "showVoucher", "showWhatsApp", "showTelegram", "showCopy", "showAnswerRecap"].includes(feature.key);
  return !["showGuests", "showDjSong", "showScratchCard", "showCandle", "showVoucher", "showWhatsApp", "showTelegram", "showCopy", "showAnswerRecap"].includes(feature.key);
}

function ToggleField({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-field"><span><b>{label}</b>{hint ? <small>{hint}</small> : null}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function Editor({ project, profile, saving, onProject, onConfig, onSave, onPublish, onPassword, onDelete }: { project: ProjectRecord; profile: Profile; saving: boolean; onProject: (patch: Partial<ProjectRecord>) => void; onConfig: <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => void; onSave: () => void; onPublish: () => void; onPassword: (password: string | null) => Promise<boolean>; onDelete: () => void }) {
  const c = project.config;
  const template = templates.find((item) => item.id === project.templateId) || templates[0];
  const templateFeatures = getTemplateFeatures(project.templateId);
  const isCustomBlank = project.templateId === "custom-blank";
  const hasShareFeature = isCustomBlank ? (c.customBlocks || CUSTOM_BLOCKS.map((item) => item.id)).includes("share") : templateFeatures.some((feature) => feature.key === "showWhatsApp");
  const [section, setSection] = useState<EditorSection>("opening");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>("all");
  const [previewQuestion, setPreviewQuestion] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<string[]>(() => c.questions.map(() => ""));
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const visibleEditorSections = editorSections.filter((item) => item.id !== "questions" || !isCustomBlank || (c.customBlocks || CUSTOM_BLOCKS.map((block) => block.id)).includes("questions"));
  const shareUrl = typeof window === "undefined" ? `/p/${project.slug}` : `${window.location.origin}/p/${project.slug}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${c.headline}\n${shareUrl}`)}`;
  const activeSectionIndex = visibleEditorSections.findIndex((item) => item.id === section);
  const activeSection = visibleEditorSections[activeSectionIndex] || visibleEditorSections[0];
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

  function updateHighlight(position: number, value: string) {
    onConfig("highlights", c.highlights.map((highlight, index) => index === position ? value.slice(0, 80) : highlight));
  }

  function addHighlight() {
    if (c.highlights.length >= 2) return;
    onConfig("highlights", [...c.highlights, ""]);
  }

  function removeHighlight(position: number) {
    onConfig("highlights", c.highlights.filter((_, index) => index !== position));
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
    const nextIndex = Math.min(visibleEditorSections.length - 1, Math.max(0, activeSectionIndex + direction));
    chooseSection(visibleEditorSections[nextIndex].id);
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

  function updateFeature(key: string, value: boolean) {
    onConfig(key as keyof TemplateConfig, value as never);
  }

  function toggleCustomBlock(blockId: string) {
    const current = c.customBlocks?.length ? c.customBlocks : CUSTOM_BLOCKS.map((block) => block.id);
    onConfig("customBlocks", current.includes(blockId) ? current.filter((item) => item !== blockId) : [...current, blockId]);
  }

  function featureEnabled(feature: TemplateFeature) {
    return Boolean((c as unknown as Record<string, unknown>)[feature.key]);
  }

  function previewBlockEnabled(blockId: string) {
    return !isCustomBlank || (c.customBlocks || CUSTOM_BLOCKS.map((item) => item.id)).includes(blockId);
  }

  function renderFeaturePanel(stage: FeatureStage) {
    if (isCustomBlank) return null;
    const features = templateFeatures.filter((feature) => featureBelongsToStage(feature, stage));
    if (!features.length) return null;
    const stageCopy = stage === "opening"
      ? { eyebrow: "ייחודי לתבנית הזו", title: "בונים את הפתיחה", helper: "הפעילו רק את החוויה שמתאימה לעמוד הזה. את התוכן שלה עורכים כאן, באותו שלב." }
      : stage === "questions"
        ? { eyebrow: "ייחודי לשאלות", title: "מעצבים את הדרך לתשובה", helper: "כל תבנית מציגה שאלות שונות. אפשר להפעיל כאן את השדות המיוחדים שלה." }
        : { eyebrow: "ייחודי לסיום", title: "מתאימים את הרגע האחרון", helper: "הגדירו מה המבקר יראה ויוכל לעשות כשהוא מסיים את העמוד." };
    return <div className="template-feature-panel contextual-feature-panel">
      <div className="feature-section-heading"><div><span>{stageCopy.eyebrow}</span><h3>{stageCopy.title}</h3><p>{stageCopy.helper}</p></div><strong>{features.filter(featureEnabled).length}/{features.length}</strong></div>
      <div className="template-feature-grid">{features.map((feature) => <label className={`template-feature-card ${featureEnabled(feature) ? "enabled" : ""}`} key={feature.key}><span className="template-feature-icon">{feature.icon}</span><span className="template-feature-copy"><b>{feature.label}</b><small>{feature.description}</small></span><input type="checkbox" checked={featureEnabled(feature)} onChange={(event) => updateFeature(feature.key, event.target.checked)} /></label>)}</div>
    </div>;
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
      {visibleEditorSections.map((item, index) => <button type="button" key={item.id} className={`${section === item.id ? "active" : ""} ${index < activeSectionIndex ? "complete" : ""}`} aria-current={section === item.id ? "step" : undefined} onClick={() => chooseSection(item.id)}>
        <span>{index < activeSectionIndex ? "✓" : index + 1}</span><b>{item.label}</b><small>{item.helper}</small>
      </button>)}
    </div>

    <div className="editor-grid editor-grid-guided">
      <section className={`studio-panel editor-panel ${mobilePane === "edit" ? "mobile-active" : ""}`}>
        <div className="editor-section-heading">
          <div><span>שלב {activeSectionIndex + 1} מתוך {visibleEditorSections.length}</span><h2>{activeSection.label}</h2><p>{activeSection.helper}. כל שינוי מופיע מיד בתצוגה.</p></div>
          <strong>{Math.round(((activeSectionIndex + 1) / visibleEditorSections.length) * 100)}%</strong>
        </div>

        {section === "opening" && <div className="form-section editor-stage-fields">
          <label>שם העמוד <small>לשימוש שלכם בלבד</small><input value={project.title} maxLength={80} placeholder="לדוגמה: אישור הגעה לחתונה" onChange={(event) => onProject({ title: event.target.value })} /></label>
          <label>שם הנמען או הקבוצה<input value={c.recipient} maxLength={80} placeholder="לדוגמה: משפחת לוי" onChange={(event) => onConfig("recipient", event.target.value)} /></label>
          <label>טקסט מעל הכותרת<input value={c.introLabel} maxLength={80} placeholder="לדוגמה: הזמנה אישית" onChange={(event) => onConfig("introLabel", event.target.value)} /></label>
          <label>טקסט על כפתור ההתחלה<input value={c.startText} maxLength={80} placeholder="לדוגמה: מתחילים" onChange={(event) => onConfig("startText", event.target.value)} /></label>
          <label className="full">כותרת ראשית<input value={c.headline} maxLength={120} placeholder="הכותרת שתופיע בראש העמוד" onChange={(event) => onConfig("headline", event.target.value)} /></label>
          <label className="full">תיאור קצר<textarea value={c.subtitle} maxLength={320} placeholder="הסבר קצר שמכין את המבקרים לתהליך" onChange={(event) => onConfig("subtitle", event.target.value)} /></label>
          <fieldset className="highlight-editor full"><legend>פרטים חשובים <small>עד שתי שורות</small></legend><div className="highlight-list">{c.highlights.map((highlight, index) => <div className="highlight-row" key={index}><input value={highlight} maxLength={80} aria-label={`פרט חשוב ${index + 1}`} placeholder={index === 0 ? "לדוגמה: 18.09.2026 · 19:30" : "לדוגמה: חוות רונית, השרון"} onChange={(event) => updateHighlight(index, event.target.value)} /><button type="button" onClick={() => removeHighlight(index)} aria-label={`מחיקת פרט חשוב ${index + 1}`}>×</button></div>)}</div><button type="button" className="highlight-add" disabled={c.highlights.length >= 2} onClick={addHighlight}>+ הוספת שורה</button></fieldset>
          {isCustomBlank ? <div className="custom-block-builder contextual-builder">
            <div className="feature-section-heading"><div><span>בונה העמוד</span><h3>מה מתאים לעמוד שלכם?</h3><p>בחרו את החלקים שיופיעו בעמוד. אחרי הבחירה, עורכים כל חלק בשלב שבו הוא מופיע.</p></div><strong>{c.customBlocks?.length || CUSTOM_BLOCKS.length}/{CUSTOM_BLOCKS.length}</strong></div>
            <div className="custom-block-grid">{CUSTOM_BLOCKS.map((block) => { const enabled = (c.customBlocks || CUSTOM_BLOCKS.map((item) => item.id)).includes(block.id); return <button type="button" key={block.id} className={`custom-block-card ${enabled ? "enabled" : ""}`} aria-pressed={enabled} onClick={() => toggleCustomBlock(block.id)}><span>{block.icon}</span><div><b>{block.label}</b><small>{block.description}</small></div><i>{enabled ? "✓" : "+"}</i></button>; })}</div>
            <div className="custom-builder-tip">💡 אין תבנית נכונה או לא נכונה — התחילו מהפתיחה, הוסיפו רק מה שצריך, וראו את כל הרצף בתצוגה החיה.</div>
          </div> : renderFeaturePanel("opening")}
          {(isCustomBlank || templateFeatures.some((feature) => ["showCountdown", "showVenueCard", "showCalendar", "showAppleCalendar", "showWaze", "showGoogleMaps"].includes(feature.key))) && <div className="feature-detail-panel">
            <div className="field-divider full"><b>📍 תאריך, מקום וניווט</b><span>ממלאים את פרטי האירוע כאן — ורק הפעולות שהופעלו יוצגו בעמוד.</span></div>
            <label>תאריך ושעת האירוע<input value={c.eventDate || "18.09.2026 · 19:30"} maxLength={60} placeholder="לדוגמה: 18.09.2026 · 19:30" onChange={(e) => onConfig("eventDate", e.target.value)} /></label>
            <label>שם המקום / אולם<input value={c.venueName || ""} maxLength={80} placeholder="לדוגמה: חוות רונית, השרון" onChange={(e) => onConfig("venueName", e.target.value)} /></label>
            <label>קישור ל-Waze<input value={c.wazeUrl || ""} maxLength={300} placeholder="https://waze.com/ul?..." onChange={(e) => onConfig("wazeUrl", e.target.value)} /></label>
            <label>קישור ל-Google Maps<input value={c.googleMapsUrl || ""} maxLength={500} placeholder="https://maps.google.com/?q=..." onChange={(e) => onConfig("googleMapsUrl", e.target.value)} /></label>
            {isCustomBlank && <div className="toggle-grid full">
              <ToggleField label="ספירה לאחור" checked={c.showCountdown ?? false} onChange={(value) => onConfig("showCountdown", value)} />
              <ToggleField label="כרטיס מקום" checked={c.showVenueCard ?? false} onChange={(value) => onConfig("showVenueCard", value)} />
              <ToggleField label="Google Calendar" checked={c.showCalendar ?? false} onChange={(value) => onConfig("showCalendar", value)} />
              <ToggleField label="Apple Calendar" checked={c.showAppleCalendar ?? false} onChange={(value) => onConfig("showAppleCalendar", value)} />
              <ToggleField label="ניווט Waze" checked={c.showWaze ?? false} onChange={(value) => onConfig("showWaze", value)} />
              <ToggleField label="Google Maps" checked={c.showGoogleMaps ?? false} onChange={(value) => onConfig("showGoogleMaps", value)} />
            </div>}
          </div>}
        </div>}

        {section === "questions" && activeQuestion && <div className="questions-stage">
          <div className="question-tabs" role="tablist" aria-label="בחירת שאלה לעריכה">
            {c.questions.map((_, index) => <button type="button" role="tab" aria-selected={questionIndex === index} className={questionIndex === index ? "active" : ""} key={index} onClick={() => chooseQuestion(index)}>שאלה {index + 1}</button>)}
            <button type="button" className="add-question-tab" disabled={c.questions.length >= 10} onClick={addQuestion}>+ הוספת שאלה</button>
          </div>
          <fieldset className="question-editor question-editor-focused">
            <legend><span>{questionIndex + 1}</span> עריכת שאלה {questionIndex + 1}</legend>
            <button type="button" className="remove-question-button" disabled={c.questions.length === 1} onClick={() => removeQuestion(questionIndex)}>מחיקת השאלה</button>
            <label>השאלה<input value={activeQuestion.prompt} maxLength={140} placeholder="כתבו שאלה קצרה וברורה" onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} /></label>
            <label>הסבר קצר<input value={activeQuestion.helper} maxLength={240} placeholder="מידע שיעזור לבחור תשובה" onChange={(event) => updateQuestion(questionIndex, { helper: event.target.value })} /></label>
            <div className="option-editor"><div><b>אפשרויות תשובה</b><small>כל אפשרות נשמרת בשורה נפרדת.</small></div>{activeQuestion.options.map((option, index) => <div className="option-editor-row" key={index}><span>{index + 1}</span><input value={option} aria-label={`אפשרות ${index + 1}`} maxLength={120} onChange={(event) => updateQuestionOption(questionIndex, index, event.target.value)} /><button type="button" aria-label={`מחיקת אפשרות ${index + 1}`} disabled={activeQuestion.options.length <= 2} onClick={() => removeQuestionOption(questionIndex, index)}>×</button></div>)}<button type="button" className="add-option-button" disabled={activeQuestion.options.length >= 6} onClick={() => addQuestionOption(questionIndex)}>+ הוספת אפשרות</button></div>
            <label>תשובה נכונה <small>לא חובה — רק לחידונים עם ניקוד</small><select value={activeQuestion.correctOption} onChange={(event) => updateQuestion(questionIndex, { correctOption: event.target.value })}><option value="">ללא ניקוד</option>{activeQuestion.options.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          </fieldset>
          <div className="question-stage-navigation"><button type="button" className="button button-outline" disabled={questionIndex === 0} onClick={() => chooseQuestion(questionIndex - 1)}>שאלה קודמת</button><span>{questionIndex + 1} / {c.questions.length}</span><button type="button" className="button button-dark" disabled={questionIndex === c.questions.length - 1} onClick={() => chooseQuestion(questionIndex + 1)}>שאלה הבאה</button></div>
          {renderFeaturePanel("questions")}
          {templateFeatures.some((feature) => feature.key === "showGuests") && <div className="feature-detail-panel question-detail-panel">
            <div className="field-divider full"><b>👥 פרטי אישור ההגעה</b><span>הגדירו כמה אורחים אפשר לבחור ואילו פרטים ייאספו בדרך.</span></div>
            <label>מקסימום אורחים<input type="number" min={1} max={20} value={c.maxGuests ?? 10} onChange={(event) => onConfig("maxGuests", Math.min(20, Math.max(1, Number(event.target.value) || 1)))} /></label>
          </div>}
        </div>}

        {section === "completion" && <div className="form-section editor-stage-fields">
          <label>טקסט מעל כותרת הסיום<input value={c.resultLabel} maxLength={80} placeholder="לדוגמה: הסיכום מוכן" onChange={(event) => onConfig("resultLabel", event.target.value)} /></label>
          <label>טקסט על כפתור הסיום<input value={c.finalButtonText} maxLength={80} placeholder="לדוגמה: להצגת הסיכום" onChange={(event) => onConfig("finalButtonText", event.target.value)} /></label>
          <label className="full">כותרת הסיום<input value={c.successTitle} maxLength={140} placeholder="הכותרת שתופיע לאחר השאלות" onChange={(event) => onConfig("successTitle", event.target.value)} /></label>
          <label className="full">הודעת הסיום<textarea value={c.successText} maxLength={700} placeholder="הודעת תודה, ברכה או הסבר על השלב הבא" onChange={(event) => onConfig("successText", event.target.value)} /></label>
          {renderFeaturePanel("completion")}
          {project.templateId === "gift" && <div className="feature-detail-panel">
            <div className="field-divider full"><b>🎟️ תוכן השובר</b><span>הפרטים שיופיעו אחרי פתיחת קופסת המתנה.</span></div>
            <label>כותרת השובר<input value={c.voucherTitle || "סופשבוע מפנק בסוויטה"} maxLength={100} placeholder="לדוגמה: שובר ספא זוגי" onChange={(e) => onConfig("voucherTitle", e.target.value)} /></label>
            <label>קוד מימוש אישי<input value={c.voucherCode || "LINKLI-GIFT-2026"} maxLength={40} placeholder="LINKLI-GIFT-2026" onChange={(e) => onConfig("voucherCode", e.target.value)} /></label>
            <label className="full">תנאי מימוש ומידע נוסף<textarea value={c.voucherTerms || "בתוקף לשנה מיום ההנפקה · כולל ארוחת בוקר וספא"} maxLength={200} placeholder="תנאים ופרטי מימוש..." onChange={(e) => onConfig("voucherTerms", e.target.value)} /></label>
          </div>}
          {isCustomBlank && <div className="feature-detail-panel">
            <div className="field-divider full"><b>📲 פעולות בסיום</b><span>הפעילו רק את כפתורי הפעולה שתרצו להציג למבקרים.</span></div>
            <div className="toggle-grid full">
              <ToggleField label="WhatsApp" checked={c.showWhatsApp ?? true} onChange={(value) => onConfig("showWhatsApp", value)} />
              <ToggleField label="Telegram" checked={c.showTelegram ?? true} onChange={(value) => onConfig("showTelegram", value)} />
              <ToggleField label="העתקת מענה" checked={c.showCopy ?? true} onChange={(value) => onConfig("showCopy", value)} />
              <ToggleField label="סיכום תשובות" checked={c.showAnswerRecap ?? true} onChange={(value) => onConfig("showAnswerRecap", value)} />
            </div>
          </div>}
          {hasShareFeature && <><div className="field-divider full"><b>📲 פעולות שיתוף</b><span>התאימו את ההודעה והכפתור שיופיעו בסיום העמוד.</span></div>
          <label>מספר טלפון לקבלת תשובות ב-WhatsApp
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }} dir="ltr">
              <span style={{ padding: "10px 12px", background: "#f3eff6", border: "1px solid #e2d9eb", borderRadius: "10px", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center" }}>🇮🇱 +972</span>
              <input
                type="tel"
                value={toDisplayPhone(c.whatsapp)}
                maxLength={14}
                placeholder="050-123-4567"
                inputMode="numeric"
                dir="ltr"
                onChange={(event) => onConfig("whatsapp", toNormalizedPhone(event.target.value))}
              />
            </div>
            <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>הקלידו מספר נייד רגיל (כמו 050-1234567) והוא יחובר אוטומטית ל-WhatsApp</small>
          </label>
          <label>טקסט על הכפתור<input value={c.buttonText} maxLength={80} placeholder="לדוגמה: שליחת האישור" onChange={(event) => onConfig("buttonText", event.target.value)} /></label>
          <label className="full">הודעת WhatsApp<textarea value={c.whatsappText} maxLength={500} placeholder="הטקסט שיופיע לפני סיכום התשובות" onChange={(event) => onConfig("whatsappText", event.target.value)} /></label></>}
        </div>}

        {section === "design" && <div className="design-stage">
          <div className="color-grid">
            <label className="color-field"><span><b>צבע ראשי</b><small>כפתורים והדגשות</small></span><input type="color" value={c.accent} aria-label="צבע ראשי" onChange={(event) => onConfig("accent", event.target.value)} /><code>{c.accent}</code></label>
            <label className="color-field"><span><b>צבע רקע</b><small>הרקע הרך של העמוד</small></span><input type="color" value={c.accentSoft} aria-label="צבע רקע" onChange={(event) => onConfig("accentSoft", event.target.value)} /><code>{c.accentSoft}</code></label>
          </div>

          <div className="form-section editor-stage-fields" style={{ marginTop: "20px" }}>
            <div className="field-divider full"><b>✨ טיפוגרפיה וצורניות הקארד</b><span>בחירת גופן עברי, צורת הקארד, רקע, מסגרת ורמת הטשטוש.</span></div>
            <label>גופן עברי ראשי
              <select value={c.fontFamily || "Rubik"} onChange={(e) => onConfig("fontFamily", e.target.value)}>
                <option value="Rubik">Rubik (מודרני ודינמי)</option>
                <option value="Heebo">Heebo (נקי ואלגנטי)</option>
                <option value="Assistant">Assistant (קליל ונעים)</option>
                <option value="Varela Round">Varela Round (מעוגל ורך)</option>
                <option value="Secular One">Secular One (בולט וחגיגי)</option>
              </select>
            </label>

            <label>צורת הקארד
              <select value={c.cardShape || "rounded-3d"} onChange={(e) => onConfig("cardShape", e.target.value)}>
                <option value="rounded-3d">3D Glassmorphism (מעוגל תלת-מימדי)</option>
                <option value="rounded-pill">Pill Badge (עיגול רך מושלם)</option>
                <option value="square-minimal">Minimal Clean (פינות מעוגלות קלות)</option>
              </select>
            </label>

            <label>סגנון רקע
              <select value={c.bgStyle || "fluid-mesh"} onChange={(e) => onConfig("bgStyle", e.target.value)}>
                <option value="fluid-mesh">רשת צבעונית נעה</option>
                <option value="soft">רך ונקי</option>
                <option value="solid">צבע מלא</option>
                <option value="dots">נקודות עדינות</option>
              </select>
            </label>

            <label>סגנון כפתורים
              <select value={c.buttonStyle || "gradient"} onChange={(e) => onConfig("buttonStyle", e.target.value)}>
                <option value="gradient">Gradient</option>
                <option value="solid">צבע מלא</option>
                <option value="outline">קו מתאר</option>
                <option value="soft">רך ובהיר</option>
              </select>
            </label>

            <label className="color-field"><span><b>רקע הקארד</b><small>הצבע של הכרטיס עצמו</small></span><input type="color" value={c.cardBackground || "#ffffff"} aria-label="רקע הקארד" onChange={(event) => onConfig("cardBackground", event.target.value)} /><code>{c.cardBackground || "#ffffff"}</code></label>
            <label className="color-field"><span><b>צבע המסגרת</b><small>הקו שמקיף את הכרטיס</small></span><input type="color" value={c.cardBorderColor || "#ffffff"} aria-label="צבע המסגרת" onChange={(event) => onConfig("cardBorderColor", event.target.value)} /><code>{c.cardBorderColor || "#ffffff"}</code></label>

            <label className="full">עיגול פינות הקארד — <span>{c.cardRadius ?? 34}px</span><input type="range" min={0} max={48} value={c.cardRadius ?? 34} onChange={(e) => onConfig("cardRadius", Number(e.target.value))} /></label>

            <div className="field-divider full"><b>😊 האימוג׳י והאווירה</b><span>אפשר להחליף את הסמל, הרקע שלו, הצורה והגודל.</span></div>
            <label>אימוג׳י ראשי<input value={c.emoji} maxLength={16} placeholder="✨" onChange={(e) => onConfig("emoji", e.target.value)} /></label>
            <label>צורת רקע לאימוג׳י
              <select value={c.emojiShape || "rounded"} onChange={(e) => onConfig("emojiShape", e.target.value)}>
                <option value="rounded">מעוגל</option><option value="circle">עיגול</option><option value="square">מרובע</option><option value="pill">גלולה</option>
              </select>
            </label>
            <label className="color-field"><span><b>צבע רקע לאימוג׳י</b><small>הכתם מאחורי הסמל</small></span><input type="color" value={c.emojiBackground || c.accentSoft} aria-label="צבע רקע לאימוג׳י" onChange={(event) => onConfig("emojiBackground", event.target.value)} /><code>{c.emojiBackground || c.accentSoft}</code></label>
            <label>גודל האימוג׳י — <span>{c.emojiSize ?? 55}px</span><input type="range" min={28} max={96} value={c.emojiSize ?? 55} onChange={(e) => onConfig("emojiSize", Number(e.target.value))} /></label>
            <label className="full">אימוג׳ים לאווירה <small>הפרידו בפסיקים — למשל: ✨, 💕, 🌸</small><input value={c.decorations.join(", ")} maxLength={140} onChange={(e) => onConfig("decorations", e.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8))} /></label>
            <label className="full">שקיפות אימוג׳י רקע — <span>{Math.round((c.decorationOpacity ?? 0.5) * 100)}%</span><input type="range" min={0} max={1} step={0.05} value={c.decorationOpacity ?? 0.5} onChange={(e) => onConfig("decorationOpacity", Number(e.target.value))} /></label>

            <label className="full">רמת טשטוש הזכוכית (Glassmorphism Blur) — <span>{c.glassBlur ?? 30}px</span>
              <input type="range" min={0} max={50} value={c.glassBlur ?? 30} onChange={(e) => onConfig("glassBlur", Number(e.target.value))} />
            </label>

            <div className="field-divider full"><b>🌐 דומיין מותאם אישית & מיתוג (Plus & Max)</b><span>חיבור תת-דומיין, דומיין אישי והסרת לוגו.</span></div>

            <label className="full" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "14px 18px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <div>
                <b style={{ display: "block", fontSize: "14px", color: "#0f172a" }}>הסרת מיתוג Linkli בתחתית העמוד</b>
                <small style={{ color: "#64748b", fontSize: "12px" }}>מציג עמוד 100% נקי וממותג אישית בלבד</small>
              </div>
              <input type="checkbox" checked={c.hideBranding || profile.plan !== "free"} onChange={(e) => onConfig("hideBranding", e.target.checked)} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
            </label>

            <label>תת-דומיין מותאם (Custom Subdomain)
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }} dir="ltr">
                <input value={c.customSubdomain || ""} placeholder="my-event" onChange={(e) => onConfig("customSubdomain", e.target.value)} />
                <span style={{ fontSize: "13px", fontWeight: "bold", color: "#64748b" }}>.linkli.app</span>
              </div>
            </label>

            <label>דומיין אישי מלא (Custom Domain)
              <input value={c.customDomain || ""} placeholder="www.my-event.co.il" dir="ltr" onChange={(e) => onConfig("customDomain", e.target.value)} />
              <small style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "4px" }}>הגדירו תקליט CNAME בדומיין שלכם לכתובת: <code>cname.linkli.app</code></small>
            </label>
          </div>

          <div className={`page-access-card ${project.passwordProtected ? "protected" : ""}`}><div className="page-access-heading"><span>{project.passwordProtected ? "🔒" : "🔓"}</span><div><b>הגנה באמצעות סיסמה</b><p>{project.passwordProtected ? "המבקרים חייבים להזין סיסמה לפני הצגת העמוד." : "אפשר להגן על העמוד ולשתף את הסיסמה רק עם מי שצריך."}</p></div><strong>{project.passwordProtected ? "פעיל" : "כבוי"}</strong></div><label>{project.passwordProtected ? "סיסמה חדשה — רק אם רוצים להחליף" : "בחירת סיסמה לעמוד"}<input type="password" value={passwordDraft} minLength={6} maxLength={64} autoComplete="new-password" dir="ltr" placeholder="לפחות 6 תווים" onChange={(event) => setPasswordDraft(event.target.value)} /></label><div className="page-access-actions"><button type="button" className="button button-dark" disabled={saving || passwordDraft.length < 6} onClick={savePagePassword}>{saving ? "שומרים…" : project.passwordProtected ? "החלפת סיסמה" : "הפעלת הגנה"}</button>{project.passwordProtected && <button type="button" className="remove-access-button" disabled={saving} onClick={() => onPassword(null)}>הסרת ההגנה</button>}</div></div>
          <div className="publish-card">
            <div className="publish-card-heading"><span className={project.published ? "published" : ""}>{project.published ? "● באוויר" : "○ טיוטה"}</span><div><b>{project.published ? "העמוד זמין לשיתוף" : "העמוד עדיין פרטי"}</b><p>{project.published ? "אפשר להעתיק את הקישור או לפתוח את העמוד המלא." : "פרסמו כשתהיו מרוצים מהתצוגה המקדימה."}</p></div></div>
            <div className="share-url-row"><span dir="ltr">{shareUrl}</span><button type="button" onClick={copyShareUrl}>{copied ? "הועתק ✓" : "העתקת קישור"}</button></div>
            <div className="publish-actions"><button type="button" className="button button-primary" onClick={onPublish}>{project.published ? "הסרה מהאוויר" : "שמירה ופרסום"}</button>{project.published && <><a className="button button-outline" href={`/p/${project.slug}`} target="_blank" rel="noreferrer">פתיחת העמוד ↗</a><a className="button button-whatsapp" href={whatsappShareUrl} target="_blank" rel="noreferrer">שיתוף ב־WhatsApp</a></>}</div>
          </div>
          <button type="button" className="delete-project-link" onClick={onDelete}>מחיקת העמוד</button>
        </div>}

        <div className="editor-workflow-actions">
          <button type="button" className="button button-outline" disabled={activeSectionIndex === 0} onClick={() => moveSection(-1)}>חזרה</button>
          <button type="button" className="save-inline" onClick={onSave}>{saving ? "שומר שינויים…" : "שמירת שינויים"}</button>
          {activeSectionIndex < visibleEditorSections.length - 1 ? <button type="button" className="button button-primary" onClick={() => moveSection(1)}>המשך: {visibleEditorSections[activeSectionIndex + 1].label} ←</button> : <button type="button" className="button button-primary" onClick={project.published ? onSave : onPublish}>{project.published ? "שמירת השינויים" : "שמירה ופרסום"}</button>}
        </div>
      </section>

      <aside className={`live-preview-panel ${mobilePane === "preview" ? "mobile-active" : ""}`} aria-label="תצוגה חיה של העמוד">
        <div className="live-preview-heading"><div><span className="live-dot" /><b>תצוגה חיה</b><small>מתעדכנת בזמן אמת</small></div><span>{profile.plan === "plus" ? "ללא מיתוג" : "מסלול חינמי"}</span></div>
        <div className="preview-screen-tabs" role="tablist" aria-label="בחירת מסך לתצוגה">
          <button type="button" role="tab" aria-selected={previewScreen === "all"} className={previewScreen === "all" ? "active" : ""} onClick={() => setPreviewScreen("all")}>כל האתר</button>
          <button type="button" role="tab" aria-selected={previewScreen === "intro"} className={previewScreen === "intro" ? "active" : ""} onClick={() => setPreviewScreen("intro")}>פתיחה</button>
          {previewBlockEnabled("questions") && c.questions.map((_, index) => <button type="button" role="tab" aria-selected={previewScreen === "question" && previewQuestion === index} className={previewScreen === "question" && previewQuestion === index ? "active" : ""} key={index} onClick={() => { setPreviewQuestion(index); setPreviewScreen("question"); }}>{index + 1}</button>)}
          <button type="button" role="tab" aria-selected={previewScreen === "result"} className={previewScreen === "result" ? "active" : ""} onClick={() => setPreviewScreen("result")}>סיום</button>
        </div>

        <div className={`preview-frame preview-frame-live preview-${c.theme}`} style={{ "--preview-soft": c.accentSoft, "--preview-accent": c.accent, "--preview-card-bg": c.cardBackground || "#ffffff", "--preview-card-border": c.cardBorderColor || "#ffffff", "--preview-card-radius": `${c.cardRadius ?? 34}px`, "--preview-emoji-bg": c.emojiBackground || c.accentSoft, "--preview-emoji-size": `${c.emojiSize ?? 55}px`, "--preview-decoration-opacity": c.decorationOpacity ?? 0.5 } as React.CSSProperties}>
          {c.showFallingEmojis !== false && previewBlockEnabled("decorations") && <div className="preview-falling" aria-hidden="true">{c.decorations.slice(0, 5).map((item, index) => <span key={index} style={{ left: `${8 + index * 21}%`, animationDelay: `-${index * 1.1}s` }}>{item}</span>)}</div>}
          <div className="preview-site-card">
            <div className="preview-site-topline"><span className="preview-site-brand">Link<span>li</span></span><span>{previewScreen === "all" ? "כל האתר" : previewScreen === "intro" ? "פתיחה" : previewScreen === "result" ? "סיום" : `${previewQuestion + 1} / ${c.questions.length}`}</span></div>

            {previewScreen === "all" && <div className="preview-site-flow">
              <div className="preview-flow-heading"><div><span className="preview-flow-kicker">תצוגת העמוד המלא</span><h2>{c.headline}</h2><p>כאן רואים את כל השלבים ברצף אחד — הפתיחה, השאלות והסיום.</p></div><button type="button" onClick={() => setSection("opening")}>עריכת פתיחה</button></div>
              <section className="preview-flow-section preview-flow-intro">
                <div className="preview-flow-section-heading"><span>01</span><b>פתיחה</b><button type="button" onClick={() => setSection("opening")}>עריכה</button></div>
                {c.showIntroLabel !== false && <span className="preview-mini-label">{c.introLabel}</span>}{c.showEmoji !== false && previewBlockEnabled("emoji") && <div className="big-emoji">{c.emoji}</div>}{c.showGreeting !== false && <p className="preview-greeting">שלום {c.recipient},</p>}<h3>{c.headline}</h3><p>{c.subtitle}</p>
                {c.showHighlights !== false && previewBlockEnabled("highlights") && <div className="preview-highlights">{c.highlights.filter(Boolean).map((highlight, index) => <span key={index}>✓ {highlight}</span>)}</div>}
                {previewBlockEnabled("location") && (c.showCalendar || c.showAppleCalendar || c.showWaze || c.showGoogleMaps) && <div className="preview-utility-actions">{c.showCalendar && <button type="button">📅 Google</button>}{c.showAppleCalendar && <button type="button"> Apple</button>}{c.showWaze && <button type="button">🧭 Waze</button>}{c.showGoogleMaps && <button type="button">📍 Maps</button>}</div>}
                <button type="button" className="preview-action" onClick={() => { setPreviewQuestion(0); setPreviewScreen(previewBlockEnabled("questions") ? "question" : "result"); }}>{c.startText}<span>←</span></button>
              </section>

              {previewBlockEnabled("questions") && <section className="preview-flow-section preview-flow-questions">
                <div className="preview-flow-section-heading"><span>02</span><b>שאלות</b><button type="button" onClick={() => setSection("questions")}>עריכה</button></div>
                {c.questions.map((question, questionPosition) => <div className="preview-flow-question" key={questionPosition}><span className="preview-step-label">שאלה {questionPosition + 1}</span><h3>{question.prompt}</h3><p>{question.helper}</p><div className="preview-options">{question.options.map((option, optionPosition) => <button type="button" aria-pressed={previewAnswers[questionPosition] === option} className={previewAnswers[questionPosition] === option ? "selected" : ""} key={option} onClick={() => setPreviewAnswers((answers) => answers.map((value, index) => index === questionPosition ? option : value))}><span>{optionPosition + 1}</span><b>{option}</b><i>✓</i></button>)}</div></div>)}
              </section>}

              <section className="preview-flow-section preview-flow-result">
                <div className="preview-flow-section-heading"><span>{previewBlockEnabled("questions") ? "03" : "02"}</span><b>סיום</b><button type="button" onClick={() => setSection("completion")}>עריכה</button></div>
                {c.showEmoji !== false && previewBlockEnabled("emoji") && <div className="preview-result-emoji">{c.emoji}<i>✨</i></div>}<span className="preview-mini-label">{c.resultLabel}</span><h3>{c.successTitle}</h3><p>{c.successText}</p>
                {c.showAnswerRecap !== false && previewBlockEnabled("answers") && <div className="preview-answer-recap">{c.questions.map((question, index) => <div key={index}><span>{index + 1}</span><p><small>{question.prompt}</small><b>{previewAnswers[index] || "עדיין לא נבחרה תשובה"}</b></p></div>)}</div>}
                {previewBlockEnabled("share") && <div className="preview-share-actions">{c.showWhatsApp !== false && <button type="button" className="preview-action preview-whatsapp">{c.buttonText}</button>}{c.showTelegram !== false && <button type="button" className="preview-share-button">✈️ Telegram</button>}{c.showCopy !== false && <button type="button" className="preview-share-button">📋 העתקה</button>}</div>}
              </section>
            </div>}

            {previewScreen === "intro" && <div className="preview-site-screen preview-site-intro">
              {c.showIntroLabel !== false && <span className="preview-mini-label">{c.introLabel}</span>}{c.showEmoji !== false && previewBlockEnabled("emoji") && <div className="big-emoji">{c.emoji}</div>}{c.showGreeting !== false && <p className="preview-greeting">שלום {c.recipient},</p>}<h2>{c.headline}</h2><p>{c.subtitle}</p>
              {c.showHighlights !== false && previewBlockEnabled("highlights") && <div className="preview-highlights">{c.highlights.filter(Boolean).map((highlight, index) => <span key={index}>✓ {highlight}</span>)}</div>}
              {previewBlockEnabled("location") && (c.showCalendar || c.showAppleCalendar || c.showWaze || c.showGoogleMaps) && <div className="preview-utility-actions">{c.showCalendar && <button type="button">📅 Google</button>}{c.showAppleCalendar && <button type="button"> Apple</button>}{c.showWaze && <button type="button">🧭 Waze</button>}{c.showGoogleMaps && <button type="button">📍 Maps</button>}</div>}
              <button type="button" className="preview-action" onClick={() => { setPreviewQuestion(0); setPreviewScreen(previewBlockEnabled("questions") ? "question" : "result"); }}>{c.startText}<span>←</span></button>
              {c.showStartHint !== false && <small className="preview-start-hint">זה לוקח בערך דקה</small>}
            </div>}

            {previewScreen === "question" && previewBlockEnabled("questions") && previewQuestionData && <div className="preview-site-screen preview-site-question">
              <div className="preview-progress" style={{ gridTemplateColumns: `repeat(${c.questions.length}, minmax(0, 1fr))` }}>{c.questions.map((_, index) => <i className={index <= previewQuestion ? "active" : ""} key={index} />)}</div>
              <span className="preview-step-label">שאלה {previewQuestion + 1} מתוך {c.questions.length}</span><h2>{previewQuestionData.prompt}</h2><p>{previewQuestionData.helper}</p>
              <div className="preview-options">{previewQuestionData.options.map((option, index) => <button type="button" aria-pressed={previewAnswers[previewQuestion] === option} className={previewAnswers[previewQuestion] === option ? "selected" : ""} key={option} onClick={() => setPreviewAnswer(option)}><span>{index + 1}</span><b>{option}</b><i>✓</i></button>)}</div>
              <div className="preview-navigation"><button type="button" className="preview-back" disabled={previewQuestion === 0} onClick={() => setPreviewQuestion((index) => Math.max(0, index - 1))}>חזרה</button><button type="button" className="preview-action" onClick={advancePreview}>{previewQuestion === c.questions.length - 1 ? c.finalButtonText : "לשאלה הבאה"}<span>←</span></button></div>
            </div>}

            {previewScreen === "result" && <div className="preview-site-screen preview-site-result">
              {c.showEmoji !== false && previewBlockEnabled("emoji") && <div className="preview-result-emoji">{c.emoji}<i>✨</i></div>}<span className="preview-mini-label">{c.resultLabel}</span><h2>{c.successTitle}</h2><p>{c.successText}</p>
              {c.showAnswerRecap !== false && previewBlockEnabled("answers") && <div className="preview-answer-recap">{c.questions.map((question, index) => <div key={index}><span>{index + 1}</span><p><small>{question.prompt}</small><b>{previewAnswers[index] || "עדיין לא נבחרה תשובה"}</b></p></div>)}</div>}
              {previewBlockEnabled("share") && <div className="preview-share-actions">{c.showWhatsApp !== false && <button type="button" className="preview-action preview-whatsapp">{c.buttonText}</button>}{c.showTelegram !== false && <button type="button" className="preview-share-button">✈️ Telegram</button>}{c.showCopy !== false && <button type="button" className="preview-share-button">📋 העתקה</button>}</div>}<button type="button" className="preview-restart" onClick={() => setPreviewScreen("intro")}>התחלה מחדש</button>
            </div>}
            {profile.plan === "free" && <div className="preview-watermark">נוצר עם <b>Linkli</b></div>}
          </div>
        </div>
        <p className="preview-interaction-hint">אפשר ללחוץ על הכפתורים והתשובות כדי לבדוק את החוויה המלאה.</p>
      </aside>
    </div>
  </div>;
}
