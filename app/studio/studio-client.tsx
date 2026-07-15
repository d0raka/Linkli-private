"use client";

import { useEffect, useMemo, useState } from "react";
import { templates, type TemplateConfig, type TemplateQuestion } from "@/lib/templates";
import type { ProjectRecord } from "@/lib/projects";

type Profile = { email: string; displayName: string; plan: "free" | "plus" };
type Notice = { text: string; error?: boolean } | null;

export default function StudioClient({ initialName }: { initialName: string }) {
  const [profile, setProfile] = useState<Profile>({ email: "", displayName: initialName, plan: "free" });
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
      } else setNotice({ text: data.error || "לא הצלחנו לטעון את הסטודיו", error: true });
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
    flash("העמוד נוצר. עכשיו הופכים אותו לשלכם ✨");
  }

  function updateSelected(patch: Partial<ProjectRecord>) {
    setProjects((items) => items.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
  }

  function updateConfig<K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) {
    if (!selected) return;
    updateSelected({ config: { ...selected.config, [key]: value } });
  }

  async function saveProject() {
    if (!selected) return;
    setSaving(true);
    const response = await fetch(`/api/projects/${selected.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: selected.title, config: selected.config }) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return flash(data.error || "השמירה נכשלה", true);
    updateSelected(data.project);
    flash("כל השינויים נשמרו");
  }

  async function togglePublish() {
    if (!selected) return;
    if (!selected.published) await saveProject();
    const response = await fetch(`/api/projects/${selected.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ published: !selected.published }) });
    const data = await response.json();
    if (!response.ok) return flash(data.error || "הפרסום נכשל", true);
    updateSelected(data.project);
    flash(data.project.published ? "העמוד באוויר ומוכן לשיתוף 🚀" : "העמוד הוסר מהאוויר");
  }

  async function removeProject() {
    if (!selected || !window.confirm("למחוק את העמוד הזה?")) return;
    const response = await fetch(`/api/projects/${selected.id}`, { method: "DELETE" });
    if (!response.ok) return flash("המחיקה נכשלה", true);
    const remaining = projects.filter((item) => item.id !== selected.id);
    setProjects(remaining); setSelectedId(remaining[0]?.id ?? null); setMode("dashboard"); flash("העמוד נמחק");
  }

  async function upgrade() {
    window.location.href = "/checkout";
  }

  const publishedCount = projects.filter((project) => project.published).length;
  const totalViews = projects.reduce((sum, project) => sum + project.views, 0);
  const totalClicks = projects.reduce((sum, project) => sum + project.clicks, 0);

  if (loading) return <div className="loading">מכינים את הסטודיו שלך…</div>;

  return (
    <div className="studio-main">
      <div className="studio-title-row">
        <div><h1>{mode === "editor" ? "עריכת העמוד" : mode === "templates" ? "איזה עמוד יוצרים היום?" : `היי ${profile.displayName} 👋`}</h1><p>{mode === "editor" ? "כל שינוי מופיע מיד בתצוגה המקדימה." : "מכאן יוצרים, עורכים ומפרסמים את כל הלינקים שלך."}</p></div>
        {mode !== "templates" && <button className="button button-primary" onClick={() => setMode("templates")}>+ עמוד חדש</button>}
      </div>
      {notice && <div className={`status-message ${notice.error ? "error" : ""}`}>{notice.text}</div>}

      {profile.plan === "free" && mode !== "editor" && <div className="upgrade-banner"><div><h3>רוצים להוריד את סימן המים?</h3><p>כל התבניות, עד 10 עמודים ובלי מיתוג Linkli — ב־₪9.90 לחודש.</p></div><button className="button" onClick={upgrade}>שדרוג ל־Plus</button></div>}

      {mode === "templates" ? (
        <section className="studio-panel">
          <div className="template-picker">
            {templates.map((template) => {
              const locked = !template.free && profile.plan !== "plus";
              return <button className={`template-choice template-choice-${template.config.theme} ${locked ? "locked" : ""}`} key={template.id} onClick={() => locked ? upgrade() : createProject(template.id)}>
                {locked && <span className="lock-label">PLUS</span>}<span className="template-step-label">3 שלבים</span><span className="emoji">{template.emoji}</span><h3>{template.name}</h3><p>{template.description}</p><span className="template-choice-action">יצירת העמוד ←</span>
              </button>;
            })}
          </div>
          <div className="editor-actions"><button className="button button-outline" onClick={() => setMode("dashboard")}>חזרה לעמודים שלי</button></div>
        </section>
      ) : mode === "editor" && selected ? (
        <Editor project={selected} profile={profile} saving={saving} onProject={updateSelected} onConfig={updateConfig} onSave={saveProject} onPublish={togglePublish} onDelete={removeProject} />
      ) : (
        <div className="studio-layout">
          <aside className="studio-panel project-sidebar"><h2>העמודים שלי</h2><div className="project-list">{projects.length ? projects.map((project) => <button key={project.id} className={`project-item ${selectedId === project.id ? "active" : ""}`} onClick={() => setSelectedId(project.id)}><b>{project.title}</b><span>{project.published ? "🟢 באוויר" : "טיוטה"} · /p/{project.slug}</span></button>) : <div className="empty-projects">עוד אין כאן עמודים.<br />זה הזמן ליצור את הראשון ✨</div>}</div></aside>
          <section>
            <div className="metrics"><div className="metric"><strong>{publishedCount}</strong><span>עמודים באוויר</span></div><div className="metric"><strong>{totalViews}</strong><span>פתיחות</span></div><div className="metric"><strong>{totalClicks}</strong><span>לחיצות</span></div></div>
            <div className="studio-panel">{selected ? <><h2>{selected.title}</h2><p style={{color:"var(--muted)",fontSize:13}}>תבנית: {templates.find((item) => item.id === selected.templateId)?.name} · עודכן לאחרונה {new Date(selected.updatedAt).toLocaleDateString("he-IL")}</p><div className="editor-actions"><button className="button button-primary" onClick={() => setMode("editor")}>עריכת העמוד</button>{selected.published && <a className="button button-outline" href={`/p/${selected.slug}`} target="_blank" rel="noreferrer">פתיחת העמוד ↗</a>}</div></> : <><h2>העמוד הראשון מחכה לך</h2><p style={{color:"var(--muted)"}}>בוחרים תבנית ומקבלים עמוד מוכן לעריכה ולשיתוף.</p><button className="button button-primary" onClick={() => setMode("templates")}>בחירת תבנית</button></>}</div>
          </section>
        </div>
      )}
    </div>
  );
}

function Editor({ project, profile, saving, onProject, onConfig, onSave, onPublish, onDelete }: { project: ProjectRecord; profile: Profile; saving: boolean; onProject: (patch: Partial<ProjectRecord>) => void; onConfig: <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => void; onSave: () => void; onPublish: () => void; onDelete: () => void }) {
  const c = project.config;
  const shareUrl = typeof window === "undefined" ? `/p/${project.slug}` : `${window.location.origin}/p/${project.slug}`;
  const questionOptionText = useMemo(() => c.questions.map((question) => question.options.join("\n")), [c.questions]);
  function updateQuestion(index: number, patch: Partial<TemplateQuestion>) {
    onConfig("questions", c.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question));
  }
  return <div className="editor-grid">
    <section className="studio-panel">
      <div className="metrics"><div className="metric"><strong>{project.views}</strong><span>פתיחות</span></div><div className="metric"><strong>{project.clicks}</strong><span>לחיצות</span></div><div className="metric"><strong>{profile.plan === "plus" ? "ללא" : "מוצג"}</strong><span>סימן מים</span></div></div>
      <div className="form-section">
        <label>שם הפרויקט<input value={project.title} onChange={(e) => onProject({ title: e.target.value })} /></label>
        <label>שם הנמען/ת<input value={c.recipient} onChange={(e) => onConfig("recipient", e.target.value)} /></label>
        <label className="full">כותרת ראשית<input value={c.headline} onChange={(e) => onConfig("headline", e.target.value)} /></label>
        <label className="full">טקסט מסביר<input value={c.subtitle} onChange={(e) => onConfig("subtitle", e.target.value)} /></label>
        <label>טקסט פתיחה<input value={c.introLabel} onChange={(e) => onConfig("introLabel", e.target.value)} /></label>
        <label>טקסט כפתור ההתחלה<input value={c.startText} onChange={(e) => onConfig("startText", e.target.value)} /></label>
        <div className="question-editor-list full">
          {c.questions.map((question, index) => <fieldset className="question-editor" key={index}>
            <legend><span>{index + 1}</span> שאלה {index + 1}</legend>
            <label>השאלה<input value={question.prompt} onChange={(e) => updateQuestion(index, { prompt: e.target.value })} /></label>
            <label>טקסט עזר<input value={question.helper} onChange={(e) => updateQuestion(index, { helper: e.target.value })} /></label>
            <label>אפשרויות — שורה לכל אפשרות<textarea value={questionOptionText[index]} onChange={(e) => {
              const options = e.target.value.split("\n").map((value) => value.trim()).filter(Boolean).slice(0, 6);
              updateQuestion(index, { options, correctOption: options.includes(question.correctOption) ? question.correctOption : "" });
            }} /></label>
            <label>תשובה נכונה (אופציונלי)<select value={question.correctOption} onChange={(e) => updateQuestion(index, { correctOption: e.target.value })}><option value="">אין תשובה שגויה</option>{question.options.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          </fieldset>)}
        </div>
        <label className="full">כותרת הצלחה<input value={c.successTitle} onChange={(e) => onConfig("successTitle", e.target.value)} /></label>
        <label className="full">טקסט הצלחה<textarea value={c.successText} onChange={(e) => onConfig("successText", e.target.value)} /></label>
        <label>מספר וואטסאפ<input value={c.whatsapp} inputMode="numeric" onChange={(e) => onConfig("whatsapp", e.target.value.replace(/\D/g,""))} /></label>
        <label>טקסט הכפתור<input value={c.buttonText} onChange={(e) => onConfig("buttonText", e.target.value)} /></label>
        <label className="full">הודעת וואטסאפ<input value={c.whatsappText} onChange={(e) => onConfig("whatsappText", e.target.value)} /></label>
        <label>צבע ראשי<input type="color" value={c.accent} onChange={(e) => onConfig("accent", e.target.value)} /></label>
        <label>צבע רקע<input type="color" value={c.accentSoft} onChange={(e) => onConfig("accentSoft", e.target.value)} /></label>
      </div>
      {project.published && <div className="share-url">{shareUrl}</div>}
      <div className="editor-actions"><button className="button button-outline" onClick={onSave}>{saving ? "שומר…" : "שמירת שינויים"}</button><button className="button button-primary" onClick={onPublish}>{project.published ? "הסרה מהאוויר" : "פרסום העמוד"}</button>{project.published && <a className="button button-outline" href={`/p/${project.slug}`} target="_blank" rel="noreferrer">צפייה ↗</a>}<button className="button button-danger" onClick={onDelete}>מחיקה</button></div>
    </section>
    <aside className={`preview-frame preview-${c.theme}`} style={{"--preview-soft":c.accentSoft,"--preview-accent":c.accent} as React.CSSProperties}>
      <div className="preview-falling" aria-hidden="true">{c.decorations.slice(0,4).map((item,index)=><span key={index} style={{left:`${12 + index * 24}%`,animationDelay:`-${index * 1.1}s`}}>{item}</span>)}</div>
      <div className="preview-card preview-card-designed"><span className="preview-mini-label">{c.introLabel}</span><div className="big-emoji">{c.emoji}</div><p style={{color:c.accent,fontWeight:800}}>היי {c.recipient}!</p><h2>{c.headline}</h2><p>{c.subtitle}</p><div className="preview-progress"><i /><i /><i /></div><button className="preview-action">{c.startText}</button></div>
    </aside>
  </div>;
}
