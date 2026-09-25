"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { getPlanName, type PlanType } from "@/lib/plans";

type Metrics = { users: number; plusUsers: number; payingCustomers: number; mrrMinor: number; oneTimeRevenueMinor: number; activatedUsers: number; publishingUsers: number; projects: number; published: number; views: number; clicks: number; openSupport: number; openLeads: number };
type UserRow = { email: string; username?: string | null; display_name: string; plan: "free" | "pro" | "max" | "business"; billing_customer_id?: string | null; created_at: string; status: "active" | "suspended"; note: string; email_verified: number | boolean; project_count: number; published_count: number };
type ProjectRow = { id: string; owner_email: string; title: string; slug: string; template_id: string; published: number | boolean; views: number; clicks: number; updated_at: string };
type SupportRow = { id: string; name: string; email: string; topic: string; message: string; page_url?: string | null; status: "new" | "in_progress" | "closed"; created_at: string };
type AuditRow = { id: string; admin_email: string; action: string; target_type: string; target_id: string; details_json?: string | null; created_at: string };
type CampaignRow = { source: string; campaign: string; landing_views: number; cta_clicks: number; signups: number; projects: number; publishes: number; checkouts: number; leads: number };
type LeadRow = { email: string; name: string; use_case: string; campaign_source?: string | null; campaign_medium?: string | null; campaign_name?: string | null; status: "new" | "contacted" | "converted" | "closed"; created_at: string; updated_at: string };
type Tab = "overview" | "marketing" | "users" | "projects" | "support" | "audit";

const topicLabels: Record<string, string> = { general: "כללי", billing: "חיוב", accessibility: "נגישות", privacy: "פרטיות", technical: "טכני" };
const statusLabels: Record<string, string> = { new: "חדש", in_progress: "בטיפול", contacted: "נוצר קשר", converted: "הומר", closed: "סגור", active: "פעיל", suspended: "מושעה" };
const useCaseLabels: Record<string, string> = { events: "אירועים והזמנות", birthdays: "ימי הולדת", couples: "זוגיות ודייטים", creators: "תוכן וקהל", business: "שימוש עסקי", other: "אחר" };
const actionLabels: Record<string, string> = {
  "user.plan_changed": "שינוי מסלול", "user.suspended": "השעיית משתמש", "user.active": "החזרת משתמש",
  "user.deleted": "מחיקת משתמש",
  "user.created": "יצירת משתמש דמו",
  "project.published": "פרסום עמוד", "project.unpublished": "הסרת עמוד מפרסום", "support.status_changed": "עדכון פנייה",
  "marketing.lead_status_changed": "עדכון ליד שיווקי",
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

function safeHttpUrl(value?: string | null) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    if (parsed.username || parsed.password) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

const PLAN_OPTIONS: PlanType[] = ["free", "pro", "max", "business"];

export default function AdminClient({ initialMetrics, initialUsers, initialProjects, initialSupport, initialAudit, initialCampaigns, initialLeads, adminEmail }: {
  initialMetrics: Metrics; initialUsers: unknown[]; initialProjects: unknown[]; initialSupport: unknown[]; initialAudit: unknown[]; initialCampaigns: unknown[]; initialLeads: unknown[]; adminEmail: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [metrics, setMetrics] = useState(initialMetrics);
  const [users, setUsers] = useState(initialUsers as UserRow[]);
  const [projects, setProjects] = useState(initialProjects as ProjectRow[]);
  const [support, setSupport] = useState(initialSupport as SupportRow[]);
  const campaigns = initialCampaigns as CampaignRow[];
  const [leads, setLeads] = useState(initialLeads as LeadRow[]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [reauth, setReauth] = useState<{ title: string; resolve: (password: string | null) => void } | null>(null);
  const [audit, setAudit] = useState(initialAudit as AuditRow[]);

  function recordAudit(action: string, targetType: string, targetId: string, details?: Record<string, unknown>) {
    setAudit((current) => [{
      id: crypto.randomUUID(),
      admin_email: adminEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      details_json: details ? JSON.stringify(details) : null,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    }, ...current]);
  }

  // Destructive actions are confirmed with the admin's own password (the API enforces it).
  function askAdminPassword(title: string) {
    return new Promise<string | null>((resolve) => setReauth({ title, resolve }));
  }

  function submitReauth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("currentPassword") || "");
    reauth?.resolve(password || null);
    setReauth(null);
  }

  function cancelReauth() {
    reauth?.resolve(null);
    setReauth(null);
  }

  const filteredUsers = useMemo(() => users.filter((user) => `${user.email} ${user.username || ""} ${user.display_name}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const filteredProjects = useMemo(() => projects.filter((project) => `${project.title} ${project.owner_email} ${project.slug}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);
  const conversion = metrics.views ? Math.round((metrics.clicks / metrics.views) * 1000) / 10 : 0;
  const activationRate = metrics.users ? Math.round((metrics.activatedUsers / metrics.users) * 1000) / 10 : 0;
  const publishRate = metrics.activatedUsers ? Math.round((metrics.publishingUsers / metrics.activatedUsers) * 1000) / 10 : 0;
  const campaignTotals = useMemo(() => campaigns.reduce((totals, row) => ({
    landingViews: totals.landingViews + Number(row.landing_views),
    ctaClicks: totals.ctaClicks + Number(row.cta_clicks),
    signups: totals.signups + Number(row.signups),
    projects: totals.projects + Number(row.projects),
    publishes: totals.publishes + Number(row.publishes),
    checkouts: totals.checkouts + Number(row.checkouts),
    leads: totals.leads + Number(row.leads),
  }), { landingViews: 0, ctaClicks: 0, signups: 0, projects: 0, publishes: 0, checkouts: 0, leads: 0 }), [campaigns]);

  async function createDemoUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create"); setNotice("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const data = await post("/api/admin/users", Object.fromEntries(values.entries()));
      setUsers((current) => [{ ...data.user, project_count: 0, published_count: 0 } as UserRow, ...current]);
      setMetrics((current) => ({ ...current, users: current.users + 1, plusUsers: current.plusUsers + (data.user.plan !== "free" ? 1 : 0) }));
      recordAudit("user.created", "user", String(data.user.username || data.user.email), { plan: data.user.plan, demo: true });
      form.reset(); setShowCreate(false);
      setNotice(`חשבון הדמו ${data.user.username} נוצר. אפשר להתחבר איתו מיד.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "הפעולה נכשלה"); } finally { setBusy(""); }
  }

  async function updatePlan(user: UserRow, nextPlan: UserRow["plan"]) {
    if (nextPlan === user.plan) return;
    if (!window.confirm(`לשנות את ${user.email} למסלול ${getPlanName(nextPlan)}?`)) return;
    const currentPassword = await askAdminPassword(`אישור שינוי המסלול של ${user.email}`);
    if (currentPassword === null) return;
    setBusy(user.email); setNotice("");
    try {
      const data = await patch(`/api/admin/users/${encodeURIComponent(user.email)}`, { action: "set_plan", plan: nextPlan, currentPassword });
      const persisted = data.plan === "free" || data.plan === "pro" || data.plan === "max" || data.plan === "business" ? data.plan : nextPlan;
      setUsers((current) => current.map((item) => item.email === user.email ? { ...item, plan: persisted } : item));
      setMetrics((current) => ({
        ...current,
        plusUsers: Math.max(0, current.plusUsers + (Number(persisted !== "free") - Number(user.plan !== "free"))),
      }));
      recordAudit("user.plan_changed", "user", user.email, { from: user.plan, to: persisted });
      setNotice("המסלול עודכן ונרשם ביומן הפעילות.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "הפעולה נכשלה"); } finally { setBusy(""); }
  }

  async function toggleUser(user: UserRow) {
    const suspending = user.status !== "suspended";
    if (suspending && user.email === adminEmail) { setNotice("אי אפשר להשעות את חשבון המנהל שלך."); return; }
    if (!window.confirm(suspending ? `להשעות את ${user.email}? כל החיבורים הפעילים שלו ינותקו.` : `להחזיר את ${user.email} לפעילות?`)) return;
    const note = suspending ? (window.prompt("סיבת ההשעיה (אופציונלי):") || "") : "";
    const currentPassword = await askAdminPassword(suspending ? `השעיית ${user.email}` : `החזרת ${user.email} לפעילות`);
    if (currentPassword === null) return;
    setBusy(user.email); setNotice("");
    try {
      const status = suspending ? "suspended" : "active";
      await patch(`/api/admin/users/${encodeURIComponent(user.email)}`, { action: suspending ? "suspend" : "restore", note, currentPassword });
      setUsers((current) => current.map((item) => item.email === user.email ? { ...item, status, note } : item));
      recordAudit(suspending ? "user.suspended" : "user.active", "user", user.email, { note: note || null });
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
    const currentPassword = await askAdminPassword(`מחיקה לצמיתות של ${identifier}`);
    if (currentPassword === null) return;
    setBusy(user.email); setNotice("");
    try {
      await remove(`/api/admin/users/${encodeURIComponent(user.email)}`, { confirmation: user.email, currentPassword });
      recordAudit("user.deleted", "user", user.email, { plan: user.plan, projectCount: Number(user.project_count) });
      setUsers((current) => current.filter((item) => item.email !== user.email));
      setProjects((current) => current.filter((item) => item.owner_email !== user.email));
      setMetrics((current) => ({
        ...current,
        users: Math.max(0, current.users - 1),
        plusUsers: Math.max(0, current.plusUsers - (user.plan !== "free" ? 1 : 0)),
        payingCustomers: Math.max(0, current.payingCustomers - (user.billing_customer_id ? 1 : 0)),
        activatedUsers: Math.max(0, current.activatedUsers - (Number(user.project_count) > 0 ? 1 : 0)),
        publishingUsers: Math.max(0, current.publishingUsers - (Number(user.published_count) > 0 ? 1 : 0)),
        projects: Math.max(0, current.projects - Number(user.project_count)),
        published: Math.max(0, current.published - Number(user.published_count)),
      }));
      setNotice(`${identifier} נמחק.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "המחיקה נכשלה"); } finally { setBusy(""); }
  }

  async function toggleProject(project: ProjectRow) {
    const published = !Boolean(project.published);
    const owner = users.find((user) => user.email === project.owner_email);
    const ownerPublishedBefore = Number(owner?.published_count || 0);
    if (!window.confirm(published ? "לפרסם מחדש את העמוד?" : "להחזיר את העמוד למצב טיוטה?")) return;
    const currentPassword = await askAdminPassword(published ? `פרסום מחדש של ${project.title}` : `הורדת ${project.title} מהאוויר`);
    if (currentPassword === null) return;
    setBusy(project.id); setNotice("");
    try {
      await patch(`/api/admin/projects/${project.id}`, { published, currentPassword });
      recordAudit(published ? "project.published" : "project.unpublished", "project", project.id, { ownerEmail: project.owner_email });
      setProjects((current) => current.map((item) => item.id === project.id ? { ...item, published } : item));
      setUsers((current) => current.map((user) => user.email === project.owner_email
        ? { ...user, published_count: Math.max(0, Number(user.published_count) + (published ? 1 : -1)) }
        : user));
      setMetrics((current) => ({
        ...current,
        published: Math.max(0, current.published + (published ? 1 : -1)),
        publishingUsers: Math.max(0, current.publishingUsers
          + (published && ownerPublishedBefore === 0 ? 1 : !published && ownerPublishedBefore === 1 ? -1 : 0)),
      }));
      setNotice(published ? "העמוד פורסם מחדש." : "העמוד הוחזר למצב טיוטה.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "הפעולה נכשלה"); } finally { setBusy(""); }
  }

  async function updateSupport(item: SupportRow, status: SupportRow["status"]) {
    setBusy(item.id); setNotice("");
    try {
      await patch(`/api/admin/support/${item.id}`, { status });
      recordAudit("support.status_changed", "support", item.id, { status });
      setSupport((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
      setMetrics((current) => ({
        ...current,
        openSupport: Math.max(0, current.openSupport
          + (item.status !== "new" && status === "new" ? 1 : item.status === "new" && status !== "new" ? -1 : 0)),
      }));
      setNotice("מצב הפנייה עודכן.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "הפעולה נכשלה"); } finally { setBusy(""); }
  }

  async function updateLead(item: LeadRow, status: LeadRow["status"]) {
    setBusy(item.email); setNotice("");
    try {
      await patch(`/api/admin/leads/${encodeURIComponent(item.email)}`, { status });
      recordAudit("marketing.lead_status_changed", "marketing_lead", item.email, { status });
      setLeads((current) => current.map((lead) => lead.email === item.email ? { ...lead, status } : lead));
      setMetrics((current) => ({
        ...current,
        openLeads: Math.max(0, current.openLeads
          + (item.status !== "new" && status === "new" ? 1 : item.status === "new" && status !== "new" ? -1 : 0)),
      }));
      setNotice("מצב הליד עודכן.");
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

  const tabs: [Tab, string, string][] = [
    ["overview", "סקירה", "⌂"],
    ["marketing", "שיווק ומכירות", "↗"],
    ["users", "משתמשים", "♙"],
    ["projects", "עמודים", "▤"],
    ["support", "פניות", "✉"],
    ["audit", "יומן פעילות", "✓"],
  ];

  return <div className="admin-layout">
    {reauth ? (
      <div className="admin-reauth-overlay" role="presentation" onClick={cancelReauth}>
        <form
          className="admin-reauth-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-reauth-title"
          method="post"
          action="/api/forms/noscript"
          onClick={(event) => event.stopPropagation()}
          onSubmit={submitReauth}
        >
          <span className="kicker">אישור פעולה רגישה</span>
          <h2 id="admin-reauth-title">{reauth.title}</h2>
          <p id="admin-reauth-help">כדי להמשיך, הזינו שוב את סיסמת המנהל שלכם. הפעולה נרשמת ביומן הפעילות.</p>
          <label>סיסמת המנהל<input name="currentPassword" type="password" required autoFocus autoComplete="current-password" dir="ltr" aria-describedby="admin-reauth-help" /></label>
          <div className="admin-reauth-actions">
            <button type="button" className="button button-outline" onClick={cancelReauth}>ביטול</button>
            <button type="submit" className="button button-primary">אישור והמשך</button>
          </div>
        </form>
      </div>
    ) : null}
    <aside className="admin-sidebar" aria-label="תפריט ניהול">
      <div className="admin-sidebar-brand"><b>מרכז ניהול</b><span>שליטה ובקרה על Linkli</span></div>
      <nav className="admin-sidebar-nav">
        {tabs.map(([id, label, icon]) => {
          const badge = id === "support" && metrics.openSupport
            ? metrics.openSupport
            : id === "marketing" && metrics.openLeads
              ? metrics.openLeads
              : 0;
          return (
            <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => { setTab(id); setQuery(""); }}>
              <span className="admin-sidebar-icon" aria-hidden="true">{icon}</span>
              <span className="admin-sidebar-label">{label}</span>
              {badge ? <i>{badge}</i> : null}
            </button>
          );
        })}
      </nav>
    </aside>
    <section className="admin-main">
      <div className="admin-main-inner">
      <Link href="/studio" className="account-back"><span aria-hidden="true">→</span> חזרה לסטודיו</Link>
      <div className="admin-title-row"><div><span className="kicker">מרכז ניהול</span><h1>{tab === "overview" ? "תמונת מצב" : tab === "marketing" ? "שיווק ומכירות" : tab === "users" ? "משתמשים ולקוחות" : tab === "projects" ? "עמודים שפורסמו" : tab === "support" ? "פניות שירות" : "יומן פעילות"}</h1></div>{tab === "users" ? <div className="admin-title-actions"><button type="button" className="button button-primary button-small" onClick={() => setShowCreate((value) => !value)}>{showCreate ? "ביטול" : "יצירת משתמש דמו"}</button><button type="button" className="button button-outline button-small" onClick={exportUsers}>ייצוא CSV</button></div> : null}</div>
      {notice ? <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="סגירה">×</button></div> : null}
      {tab === "overview" ? <>
        <div className="admin-metric-grid">
          <article><span>משתמשים</span><strong>{metrics.users.toLocaleString("he-IL")}</strong><small>{metrics.plusUsers} במסלול בתשלום</small></article>
          <article><span>הפעלת מוצר</span><strong>{activationRate}%</strong><small>{metrics.activatedUsers} יצרו לפחות עמוד אחד</small></article>
          <article><span>פרסום ראשון</span><strong>{publishRate}%</strong><small>{metrics.publishingUsers} פרסמו לפחות עמוד אחד</small></article>
          <article><span>תנועה לעמודים</span><strong>{metrics.views.toLocaleString("he-IL")}</strong><small>{metrics.clicks.toLocaleString("he-IL")} לחיצות · {conversion}% המרה</small></article>
          <article><span>לקוחות משלמים</span><strong>{metrics.payingCustomers}</strong><small>₪{(metrics.mrrMinor / 100).toFixed(2)} MRR מאומת · ₪{(metrics.oneTimeRevenueMinor / 100).toFixed(2)} חד-פעמי</small></article>
          <article><span>פניות חדשות</span><strong>{metrics.openSupport}</strong><small>ממתינות לטיפול</small></article>
        </div>
        <div className="admin-two-columns">
          <article className="admin-card"><h2>לקוחות אחרונים</h2>{users.slice(0,5).map((user) => <div className="admin-feed-row" key={user.email}><div className="admin-avatar">{user.display_name.slice(0,1)}</div><div><b>{user.display_name}</b><span>{user.email}</span></div><em className={`admin-status ${user.plan}`}>{getPlanName(user.plan)}</em></div>)}</article>
          <article className="admin-card"><h2>עמודים מובילים</h2>{[...projects].sort((a,b) => Number(b.views)-Number(a.views)).slice(0,5).map((project) => <div className="admin-feed-row" key={project.id}><div className="admin-avatar">↗</div><div><b>{project.title}</b><span>{project.owner_email}</span></div><em>{Number(project.views).toLocaleString("he-IL")} צפיות</em></div>)}</article>
        </div>
      </> : null}
      {tab === "marketing" ? <>
        <div className="admin-metric-grid marketing-metrics">
          <article><span>כניסות לקמפיינים</span><strong>{campaignTotals.landingViews.toLocaleString("he-IL")}</strong><small>30 הימים האחרונים</small></article>
          <article><span>לחיצות לפעולה</span><strong>{campaignTotals.ctaClicks.toLocaleString("he-IL")}</strong><small>{campaignTotals.landingViews ? Math.round((campaignTotals.ctaClicks / campaignTotals.landingViews) * 1000) / 10 : 0}% מהכניסות</small></article>
          <article><span>הרשמות</span><strong>{campaignTotals.signups.toLocaleString("he-IL")}</strong><small>{campaignTotals.landingViews ? Math.round((campaignTotals.signups / campaignTotals.landingViews) * 1000) / 10 : 0}% מהכניסות</small></article>
          <article><span>עמודים שנוצרו</span><strong>{campaignTotals.projects.toLocaleString("he-IL")}</strong><small>{campaignTotals.publishes} הגיעו לפרסום</small></article>
          <article><span>כוונת רכישה</span><strong>{campaignTotals.checkouts.toLocaleString("he-IL")}</strong><small>כניסות לתשלום</small></article>
          <article><span>לידים לתשלום</span><strong>{leads.length.toLocaleString("he-IL")}</strong><small>{metrics.openLeads} חדשים לטיפול</small></article>
        </div>
        <section className="admin-card marketing-section">
          <div className="marketing-section-heading"><div><h2>ביצועי קמפיינים</h2><p>מקור וקמפיין לפי UTM, ללא עוגיות פרסום.</p></div><small>30 ימים</small></div>
          <div className="admin-table-wrap"><table><thead><tr><th>מקור / קמפיין</th><th>כניסות</th><th>CTA</th><th>הרשמות</th><th>נוצרו</th><th>פורסמו</th><th>תשלום</th><th>לידים</th></tr></thead><tbody>{campaigns.length ? campaigns.map((row) => <tr key={`${row.source}-${row.campaign}`}><td><b>{row.campaign}</b><span>{row.source}</span></td><td>{Number(row.landing_views)}</td><td>{Number(row.cta_clicks)}</td><td>{Number(row.signups)}</td><td>{Number(row.projects)}</td><td>{Number(row.publishes)}</td><td>{Number(row.checkouts)}</td><td>{Number(row.leads)}</td></tr>) : <tr><td colSpan={8}>נתוני הקמפיינים יופיעו אחרי הכניסות הראשונות.</td></tr>}</tbody></table></div>
        </section>
        <section className="admin-card marketing-section">
          <div className="marketing-section-heading"><div><h2>לידים לתשלום</h2><p>אנשים שביקשו שניצור איתם קשר בנושא המסלול בתשלום.</p></div><strong>{metrics.openLeads} חדשים</strong></div>
          <div className="marketing-lead-list">{leads.length ? leads.map((lead) => <article key={lead.email}>
            <div><b>{lead.name}</b><a href={`mailto:${lead.email}?subject=${encodeURIComponent("Linkli — המשך לבקשת הגישה")}`}>{lead.email}</a><small>{useCaseLabels[lead.use_case] || lead.use_case} · {lead.campaign_source || "ישיר"}{lead.campaign_name ? ` / ${lead.campaign_name}` : ""} · {date(lead.created_at)}</small></div>
            <select disabled={busy === lead.email} value={lead.status} onChange={(event) => updateLead(lead, event.target.value as LeadRow["status"])} aria-label={`סטטוס ליד ${lead.email}`}><option value="new">חדש</option><option value="contacted">נוצר קשר</option><option value="converted">הומר ללקוח</option><option value="closed">סגור</option></select>
          </article>) : <p className="admin-empty">עדיין אין לידים. טופס ההמתנה באתר מוכן לאסוף אותם.</p>}</div>
        </section>
      </> : null}
      {tab === "users" && showCreate ? <form className="admin-create-user" method="post" action="/api/forms/noscript" onSubmit={createDemoUser}><h2>חשבון דמו ללא דוא״ל</h2><label>שם משתמש<input name="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" dir="ltr" autoComplete="off" /></label><label>שם תצוגה<input name="displayName" required minLength={2} maxLength={80} /></label><label>סיסמה<input name="password" type="password" required minLength={15} maxLength={128} dir="ltr" autoComplete="new-password" /></label><label>מסלול<select name="plan" defaultValue="free">{PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{getPlanName(plan)}</option>)}</select></label><button className="button button-primary" disabled={busy === "create"}>{busy === "create" ? "יוצר…" : "יצירת החשבון"}</button><small>המשתמש יוכל להתחבר עם שם המשתמש והסיסמה. אין צורך באימות דוא״ל.</small></form> : null}
      {(tab === "users" || tab === "projects") ? <div className="admin-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "users" ? "חיפוש לפי שם, משתמש או דוא״ל..." : "חיפוש עמוד, בעלים או כתובת..."} aria-label="חיפוש" /></div> : null}
      {tab === "users" ? <div className="admin-table-wrap"><table><thead><tr><th>לקוח</th><th>מסלול</th><th>אימות</th><th>עמודים</th><th>מצב</th><th>נרשם</th><th>פעולות</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.email}><td><b>{user.display_name}</b><span>{user.username ? `@${user.username} · חשבון דמו` : user.email}</span>{user.email === adminEmail ? <small>מנהל ראשי</small> : null}</td><td><span className={`admin-status ${user.plan}`}>{getPlanName(user.plan)}</span>{user.billing_customer_id ? <small>לקוח משלם</small> : user.plan !== "free" ? <small>גישה ידנית</small> : null}</td><td><span className={`admin-status ${user.email_verified ? "active" : "new"}`}>{user.username ? "ללא דוא״ל" : user.email_verified ? "מאומת" : "ממתין"}</span></td><td>{Number(user.project_count)} <small>({Number(user.published_count)} פורסמו)</small></td><td><span className={`admin-status ${user.status}`}>{statusLabels[user.status]}</span>{user.note ? <small title={user.note}>יש הערה</small> : null}</td><td>{date(user.created_at)}</td><td><div className="admin-actions"><select className="admin-plan-select" disabled={busy === user.email} value={user.plan} onChange={(event) => updatePlan(user, event.target.value as UserRow["plan"])} aria-label={`מסלול עבור ${user.display_name}`}>{PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{getPlanName(plan)}</option>)}</select><button className={user.status === "suspended" ? "restore" : "danger"} disabled={busy === user.email || user.email === adminEmail} onClick={() => toggleUser(user)}>{user.status === "suspended" ? "החזר" : "השעיה"}</button><button className="delete" disabled={busy === user.email || user.email === adminEmail} onClick={() => deleteUser(user)}>מחיקה</button></div></td></tr>)}</tbody></table></div> : null}
      {tab === "projects" ? <div className="admin-table-wrap"><table><thead><tr><th>עמוד</th><th>בעלים</th><th>תבנית</th><th>תנועה</th><th>מצב</th><th>פעולה</th></tr></thead><tbody>{filteredProjects.map((project) => <tr key={project.id}><td><b>{project.title}</b><span dir="ltr">/p/{project.slug}</span></td><td>{project.owner_email}</td><td>{project.template_id}</td><td>{Number(project.views)} צפיות · {Number(project.clicks)} לחיצות</td><td><span className={`admin-status ${project.published ? "active" : "closed"}`}>{project.published ? "פורסם" : "טיוטה"}</span></td><td><div className="admin-actions">{project.owner_email === adminEmail ? <a href={`/studio?edit=${project.id}`}>עריכה בסטודיו</a> : null}{project.published ? <a href={`/p/${project.slug}`} target="_blank" rel="noreferrer">צפייה</a> : null}<button className={project.published ? "danger" : "restore"} disabled={busy === project.id} onClick={() => toggleProject(project)}>{project.published ? "העבר לטיוטה" : "פרסם"}</button></div></td></tr>)}</tbody></table></div> : null}
      {tab === "support" ? <div className="support-list">{support.length ? support.map((item) => {
        const pageUrl = safeHttpUrl(item.page_url);
        return <article className="admin-card support-item" key={item.id}><header><div><b>{item.name}</b><a href={`mailto:${item.email}`}>{item.email}</a>{pageUrl ? <a href={pageUrl} target="_blank" rel="noreferrer">{pageUrl}</a> : null}</div><span className={`admin-status ${item.status}`}>{statusLabels[item.status]}</span></header><p>{item.message}</p><footer><span>{topicLabels[item.topic] || item.topic} · {date(item.created_at)}</span><select disabled={busy === item.id} value={item.status} onChange={(event) => updateSupport(item, event.target.value as SupportRow["status"])} aria-label="סטטוס פנייה"><option value="new">חדש</option><option value="in_progress">בטיפול</option><option value="closed">סגור</option></select></footer></article>;
      }) : <p className="admin-empty">אין פניות ממתינות. טופס יצירת הקשר באתר מעביר אותן לכאן.</p>}</div> : null}
      {tab === "audit" ? <div className="admin-card audit-list">{audit.length ? audit.map((item) => <div className="audit-row" key={item.id}><span>✓</span><div><b>{actionLabels[item.action] || item.action}</b><small>{item.target_type}: {item.target_id}</small></div><time>{date(item.created_at)}</time></div>) : <p className="admin-empty">היומן עדיין ריק. פעולות ניהול יופיעו כאן.</p>}</div> : null}
      </div>
    </section>
  </div>;
}
