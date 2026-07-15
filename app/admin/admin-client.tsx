"use client";

import { type FormEvent, useMemo, useState } from "react";

type Metrics = { users: number; plusUsers: number; projects: number; published: number; views: number; clicks: number; openSupport: number };
type UserRow = { email: string; username?: string | null; display_name: string; plan: "free" | "plus"; created_at: string; status: "active" | "suspended"; note: string; email_verified: number | boolean; project_count: number; published_count: number };
type ProjectRow = { id: string; owner_email: string; title: string; slug: string; template_id: string; published: number | boolean; views: number; clicks: number; updated_at: string };
type SupportRow = { id: string; name: string; email: string; topic: string; message: string; page_url?: string | null; status: "new" | "in_progress" | "closed"; created_at: string };
type AuditRow = { id: string; admin_email: string; action: string; target_type: string; target_id: string; details_json?: string | null; created_at: string };
type Tab = "overview" | "users" | "projects" | "support" | "audit";

const topicLabels: Record<string, string> = { general: "כללי", billing: "חיוב", accessibility: "נגישות", privacy: "פרטיות", technical: "טכני" };
const statusLabels: Record<string, string> = { new: "חדש", in_progress: "בטיפול", closed: "סגור", active: "פעיל", suspended: "מושעה" };
const actionLabels: Record<string, string> = {
  "user.plan_changed": "שינוי מסלול", "user.suspended": "השעיית משתמש", "user.active": "החזרת משתמש",
  "user.deleted": "מחיקת משתמש",
  "user.created": "יצירת משתמש דמו",
  "project.published": "פרסום עמוד", "project.unpublished": "הסרת עמוד מפרסום", "support.status_changed": "עדכון פנייה",
};

function date(value: string) {
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(`${value.replace(" ", "T")}Z`));
}

async function patch(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "הפעולה נכשלה");
  return data;
}

async function post(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "הפעולה נכשלה");
  return data;
}

async function remove(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "המחיקה נכשלה");
  return data;
}

function safeCsvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export default function AdminClient({ initialMetrics, initialUsers, initialProjects, initialSupport, initialAudit, adminEmail }: {
  initialMetrics: Metrics; initialUsers: unknown[]; initialProjects: unknown[]; initialSupport: unknown[]; initialAudit: unknown[]; adminEmail: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [metrics, setMetrics] = useState(initialMetrics);
  const [users, setUsers] = useState(initialUsers as UserRow[]);
  const [projects, setProjects] = useState(initialProjects as ProjectRow[]);
  const [support, setSupport] = useState(initialSupport as SupportRow[]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const audit = initialAudit as AuditRow[];

  const filteredUsers = useMemo(() => users.filter((user) => `${user.email} ${user.username || ""} ${user.display_name}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const filteredProjects = useMemo(() => projects.filter((project) => `${project.title} ${project.owner_email} ${project.slug}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);
  const conversion = metrics.views ? Math.round((metrics.clicks / metrics.views) * 1000) / 10 : 0;

  async function createDemoUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create"); setNotice("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const data = await post("/api/admin/users", Object.fromEntries(values.entries()));
      setUsers((current) => [data.user as UserRow, ...current]);
      setMetrics((current) => ({ ...current, users: current.users + 1, plusUsers: current.plusUsers + (data.user.plan === "plus" ? 1 : 0) }));
      form.reset(); setShowCreate(false);
      setNotice(`חשבון הדמו ${data.user.username} נוצר. אפשר להתחבר איתו מיד.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "הפעולה נכשלה"); } finally { setBusy(""); }
  }

  async function updatePlan(user: UserRow) {
    const nextPlan = user.plan === "plus" ? "free" : "plus";
    if (!window.confirm(`לשנות את ${user.email} למסלול ${nextPlan.toUpperCase()}?`)) return;
    setBusy(user.email); setNotice("");
    try {
      await patch(`/api/admin/users/${encodeURIComponent(user.email)}`, { action: "set_plan", plan: nextPlan });
      setUsers((current) => current.map((item) => item.email === user.email ? { ...item, plan: nextPlan } : item));
      setNotice("המסלול עודכן ונרשם ביומן הפעילות.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "הפעולה נכשלה"); } finally { setBusy(""); }
  }

  async function toggleUser(user: UserRow) {
    const suspending = user.status !== "suspended";
    if (suspending && user.email === adminEmail) { setNotice("אי אפשר להשעות את חשבון המנהל שלך."); return; }
    if (!window.confirm(suspending ? `להשעות את ${user.email}? כל החיבורים הפעילים שלו ינותקו.` : `להחזיר את ${user.email} לפעילות?`)) return;
    const note = suspending ? (window.prompt("סיבת ההשעיה (אופציונלי):") || "") : "";
    setBusy(user.email); setNotice("");
    try {
      const status = suspending ? "suspended" : "active";
      await patch(`/api/admin/users/${encodeURIComponent(user.email)}`, { action: suspending ? "suspend" : "restore", note });
      setUsers((current) => current.map((item) => item.email === user.email ? { ...item, status, note } : item));
      setNotice(suspending ? "החשבון הושעה וכל החיבורים שלו נותקו." : "החשבון חזר לפעילות.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "הפעולה נכשלה"); } finally { setBusy(""); }
  }

  async function deleteUser(user: UserRow) {
    if (user.email === adminEmail) { setNotice("אי אפשר למחוק את חשבון המנהל שלך."); return; }
    const identifier = user.username || user.email;
    const confirmation = window.prompt(
      `מחיקה לצמיתות של ${identifier}\n\nהחשבון, ההתחברויות וכל ${Number(user.project_count)} העמודים שלו יימחקו. כדי להמשיך, הקלידו ${user.username ? "את שם המשתמש" : "את כתובת הדוא״ל המלאה"}:`,
    );
    if (confirmation === null) return;
    if (confirmation.trim().toLowerCase() !== identifier.toLowerCase()) {
      setNotice("המחיקה בוטלה: הפרטים שהוקלדו אינם תואמים.");
      return;
    }
    setBusy(user.email); setNotice("");
    try {
      await remove(`/api/admin/users/${encodeURIComponent(user.email)}`, { confirmation: user.email });
      setUsers((current) => current.filter((item) => item.email !== user.email));
      setProjects((current) => current.filter((item) => item.owner_email !== user.email));
      setMetrics((current) => ({
        ...current,
        users: Math.max(0, current.users - 1),
        plusUsers: Math.max(0, current.plusUsers - (user.plan === "plus" ? 1 : 0)),
        projects: Math.max(0, current.projects - Number(user.project_count)),
        published: Math.max(0, current.published - Number(user.published_count)),
      }));
      setNotice(`${identifier} נמחק.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "המחיקה נכשלה"); } finally { setBusy(""); }
  }

  async function toggleProject(project: ProjectRow) {
    const published = !Boolean(project.published);
    if (!window.confirm(published ? "לפרסם מחדש את העמוד?" : "להחזיר את העמוד למצב טיוטה?")) return;
    setBusy(project.id); setNotice("");
    try {
      await patch(`/api/admin/projects/${project.id}`, { published });
      setProjects((current) => current.map((item) => item.id === project.id ? { ...item, published } : item));
      setNotice(published ? "העמוד פורסם מחדש." : "העמוד הוחזר למצב טיוטה.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "הפעולה נכשלה"); } finally { setBusy(""); }
  }

  async function updateSupport(item: SupportRow, status: SupportRow["status"]) {
    setBusy(item.id); setNotice("");
    try {
      await patch(`/api/admin/support/${item.id}`, { status });
      setSupport((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
      setNotice("מצב הפנייה עודכן.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "הפעולה נכשלה"); } finally { setBusy(""); }
  }

  function exportUsers() {
    const rows = [["email", "username", "name", "plan", "email_verified", "status", "projects", "published", "created_at"], ...users.map((user) => [user.username ? "" : user.email, user.username || "", user.display_name, user.plan, user.email_verified ? "yes" : "no", user.status, user.project_count, user.published_count, user.created_at])];
    const csv = `\uFEFF${rows.map((row) => row.map(safeCsvCell).join(",")).join("\n")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `linkli-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); URL.revokeObjectURL(link.href);
  }

  return <div className="admin-layout">
    <aside className="admin-sidebar" aria-label="תפריט ניהול">
      <div><b>מרכז ניהול</b><span>שליטה ובקרה על Linkli</span></div>
      {([['overview','סקירה','⌂'],['users','משתמשים','♙'],['projects','עמודים','▤'],['support','פניות','✉'],['audit','יומן פעילות','✓']] as [Tab,string,string][]).map(([id,label,icon]) =>
        <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setQuery(""); }}><span>{icon}</span>{label}{id === "support" && initialMetrics.openSupport ? <i>{initialMetrics.openSupport}</i> : null}</button>)}
    </aside>
    <section className="admin-main">
      <div className="admin-title-row"><div><span className="kicker">מרכז ניהול</span><h1>{tab === "overview" ? "תמונת מצב" : tab === "users" ? "משתמשים ולקוחות" : tab === "projects" ? "עמודים שפורסמו" : tab === "support" ? "פניות שירות" : "יומן פעילות"}</h1></div>{tab === "users" ? <div className="admin-title-actions"><button className="button button-primary button-small" onClick={() => setShowCreate((value) => !value)}>{showCreate ? "ביטול" : "יצירת משתמש דמו"}</button><button className="button button-outline button-small" onClick={exportUsers}>ייצוא CSV</button></div> : null}</div>
      {notice ? <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="סגירה">×</button></div> : null}
      {tab === "overview" ? <>
        <div className="admin-metric-grid">
          <article><span>משתמשים</span><strong>{metrics.users.toLocaleString("he-IL")}</strong><small>{metrics.plusUsers} במסלול Plus</small></article>
          <article><span>עמודים</span><strong>{metrics.projects.toLocaleString("he-IL")}</strong><small>{metrics.published} פורסמו</small></article>
          <article><span>צפיות</span><strong>{metrics.views.toLocaleString("he-IL")}</strong><small>בכל העמודים</small></article>
          <article><span>לחיצות</span><strong>{metrics.clicks.toLocaleString("he-IL")}</strong><small>{conversion}% המרה מצפייה</small></article>
          <article><span>הכנסה חודשית משוערת</span><strong>₪{(metrics.plusUsers * 9.9).toFixed(2)}</strong><small>לפני עמלות, לפי ₪9.90</small></article>
          <article><span>פניות חדשות</span><strong>{metrics.openSupport}</strong><small>ממתינות לטיפול</small></article>
        </div>
        <div className="admin-two-columns">
          <article className="admin-card"><h2>לקוחות אחרונים</h2>{users.slice(0,5).map((user) => <div className="admin-feed-row" key={user.email}><div className="admin-avatar">{user.display_name.slice(0,1)}</div><div><b>{user.display_name}</b><span>{user.email}</span></div><em className={`admin-status ${user.plan}`}>{user.plan.toUpperCase()}</em></div>)}</article>
          <article className="admin-card"><h2>עמודים מובילים</h2>{[...projects].sort((a,b) => Number(b.views)-Number(a.views)).slice(0,5).map((project) => <div className="admin-feed-row" key={project.id}><div className="admin-avatar">↗</div><div><b>{project.title}</b><span>{project.owner_email}</span></div><em>{Number(project.views).toLocaleString("he-IL")} צפיות</em></div>)}</article>
        </div>
      </> : null}
      {tab === "users" && showCreate ? <form className="admin-create-user" onSubmit={createDemoUser}><h2>חשבון דמו ללא דוא״ל</h2><label>שם משתמש<input name="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" dir="ltr" autoComplete="off" /></label><label>שם תצוגה<input name="displayName" required minLength={2} maxLength={80} /></label><label>סיסמה<input name="password" type="password" required minLength={15} maxLength={128} dir="ltr" autoComplete="new-password" /></label><label>מסלול<select name="plan" defaultValue="free"><option value="free">Free</option><option value="plus">Plus</option></select></label><button className="button button-primary" disabled={busy === "create"}>{busy === "create" ? "יוצר…" : "יצירת החשבון"}</button><small>המשתמש יוכל להתחבר עם שם המשתמש והסיסמה. אין צורך באימות דוא״ל.</small></form> : null}
      {(tab === "users" || tab === "projects") ? <div className="admin-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "users" ? "חיפוש לפי שם, משתמש או דוא״ל..." : "חיפוש עמוד, בעלים או כתובת..."} aria-label="חיפוש" /></div> : null}
      {tab === "users" ? <div className="admin-table-wrap"><table><thead><tr><th>לקוח</th><th>מסלול</th><th>אימות</th><th>עמודים</th><th>מצב</th><th>נרשם</th><th>פעולות</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.email}><td><b>{user.display_name}</b><span>{user.username ? `@${user.username} · חשבון דמו` : user.email}</span>{user.email === adminEmail ? <small>מנהל ראשי</small> : null}</td><td><span className={`admin-status ${user.plan}`}>{user.plan.toUpperCase()}</span></td><td><span className={`admin-status ${user.email_verified ? "active" : "new"}`}>{user.username ? "ללא דוא״ל" : user.email_verified ? "מאומת" : "ממתין"}</span></td><td>{Number(user.project_count)} <small>({Number(user.published_count)} פורסמו)</small></td><td><span className={`admin-status ${user.status}`}>{statusLabels[user.status]}</span>{user.note ? <small title={user.note}>יש הערה</small> : null}</td><td>{date(user.created_at)}</td><td><div className="admin-actions"><button disabled={busy === user.email} onClick={() => updatePlan(user)}>{user.plan === "plus" ? "העבר לחינם" : "הענק Plus"}</button><button className={user.status === "suspended" ? "restore" : "danger"} disabled={busy === user.email || user.email === adminEmail} onClick={() => toggleUser(user)}>{user.status === "suspended" ? "החזר" : "השעיה"}</button><button className="delete" disabled={busy === user.email || user.email === adminEmail} onClick={() => deleteUser(user)}>מחיקה</button></div></td></tr>)}</tbody></table></div> : null}
      {tab === "projects" ? <div className="admin-table-wrap"><table><thead><tr><th>עמוד</th><th>בעלים</th><th>תבנית</th><th>תנועה</th><th>מצב</th><th>פעולה</th></tr></thead><tbody>{filteredProjects.map((project) => <tr key={project.id}><td><b>{project.title}</b><span dir="ltr">/p/{project.slug}</span></td><td>{project.owner_email}</td><td>{project.template_id}</td><td>{Number(project.views)} צפיות · {Number(project.clicks)} לחיצות</td><td><span className={`admin-status ${project.published ? "active" : "closed"}`}>{project.published ? "פורסם" : "טיוטה"}</span></td><td><div className="admin-actions">{project.published ? <a href={`/p/${project.slug}`} target="_blank" rel="noreferrer">צפייה</a> : null}<button className={project.published ? "danger" : "restore"} disabled={busy === project.id} onClick={() => toggleProject(project)}>{project.published ? "העבר לטיוטה" : "פרסם"}</button></div></td></tr>)}</tbody></table></div> : null}
      {tab === "support" ? <div className="support-list">{support.map((item) => <article className="admin-card support-item" key={item.id}><header><div><b>{item.name}</b><a href={`mailto:${item.email}`}>{item.email}</a></div><span className={`admin-status ${item.status}`}>{statusLabels[item.status]}</span></header><p>{item.message}</p><footer><span>{topicLabels[item.topic] || item.topic} · {date(item.created_at)}</span><select disabled={busy === item.id} value={item.status} onChange={(event) => updateSupport(item, event.target.value as SupportRow["status"])} aria-label="סטטוס פנייה"><option value="new">חדש</option><option value="in_progress">בטיפול</option><option value="closed">סגור</option></select></footer></article>)}</div> : null}
      {tab === "audit" ? <div className="admin-card audit-list">{audit.length ? audit.map((item) => <div className="audit-row" key={item.id}><span>✓</span><div><b>{actionLabels[item.action] || item.action}</b><small>{item.target_type}: {item.target_id}</small></div><time>{date(item.created_at)}</time></div>) : <p className="admin-empty">היומן עדיין ריק. פעולות ניהול יופיעו כאן.</p>}</div> : null}
    </section>
  </div>;
}
