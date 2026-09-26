"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { getPlanName, type PlanType } from "@/lib/plans";
import { Button } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Badge, Notice, PageHeader } from "@/app/ui/status";
import "./admin.css";

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

  const tabs: [Tab, string, number][] = [
    ["overview", "סקירה", 0],
    ["marketing", "שיווק ומכירות", metrics.openLeads],
    ["users", "משתמשים", 0],
    ["projects", "עמודים", 0],
    ["support", "פניות", metrics.openSupport],
    ["audit", "יומן פעילות", 0],
  ];
  const titles: Record<Tab, string> = { overview: "תמונת מצב", marketing: "שיווק ומכירות", users: "משתמשים ולקוחות", projects: "עמודים", support: "פניות שירות", audit: "יומן פעילות" };
  const num = (value: number) => Number(value).toLocaleString("he-IL");
  const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

  return <div className="admin">
    <Dialog
      open={Boolean(reauth)}
      onClose={cancelReauth}
      title={reauth?.title || "אישור פעולה"}
      description="כדי להמשיך, הזינו שוב את סיסמת המנהל. הפעולה נרשמת ביומן הפעילות."
    >
      <form className="admin-reauth" method="post" action="/api/forms/noscript" onSubmit={submitReauth}>
        <div className="ui-field">
          <label className="ui-label" htmlFor="admin-reauth-password">סיסמת המנהל</label>
          <input id="admin-reauth-password" className="ui-input" name="currentPassword" type="password" required autoFocus autoComplete="current-password" dir="ltr" />
        </div>
        <div className="admin-reauth__actions">
          <Button onClick={cancelReauth}>ביטול</Button>
          <Button type="submit" variant="primary">אישור והמשך</Button>
        </div>
      </form>
    </Dialog>

    <PageHeader
      title={titles[tab]}
      lead="מרכז ניהול Linkli. כל פעולה רגישה דורשת את סיסמת המנהל ונרשמת ביומן."
      actions={tab === "users" ? <>
        <Button variant="primary" size="sm" onClick={() => setShowCreate((value) => !value)}>{showCreate ? "ביטול" : "משתמש דמו חדש"}</Button>
        <Button size="sm" onClick={exportUsers}>ייצוא CSV</Button>
      </> : undefined}
    />

    <nav className="ui-segmented admin-tabs" aria-label="אזורי ניהול">
      {tabs.map(([id, label, badge]) => (
        <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setQuery(""); }}>
          {label}{badge ? <span className="ui-badge" data-tone="accent">{badge}</span> : null}
        </button>
      ))}
    </nav>

    {notice ? <div className="admin-notice"><Notice actions={<Button size="sm" variant="ghost" onClick={() => setNotice("")}>סגירה</Button>}>{notice}</Notice></div> : null}

    {tab === "overview" ? <>
      <dl className="admin-metrics">
        <div><dt>משתמשים</dt><dd>{num(metrics.users)}</dd><p>{metrics.plusUsers} במסלול בתשלום</p></div>
        <div><dt>יצרו עמוד</dt><dd>{activationRate}%</dd><p>{metrics.activatedUsers} משתמשים</p></div>
        <div><dt>פרסמו</dt><dd>{publishRate}%</dd><p>{metrics.publishingUsers} מתוך מי שיצר</p></div>
        <div><dt>צפיות</dt><dd>{num(metrics.views)}</dd><p>{num(metrics.clicks)} תגובות · {conversion}%</p></div>
        <div><dt>לקוחות משלמים</dt><dd>{metrics.payingCustomers}</dd><p>₪{(metrics.oneTimeRevenueMinor / 100).toFixed(2)} חד-פעמי · ₪{(metrics.mrrMinor / 100).toFixed(2)} חודשי</p></div>
        <div><dt>פניות פתוחות</dt><dd>{metrics.openSupport}</dd><p>ממתינות לטיפול</p></div>
      </dl>
      <div className="admin-columns">
        <section className="ui-panel"><div className="ui-panel__section">
          <h2 className="ui-section-title">נרשמו לאחרונה</h2>
          <ul className="admin-feed">{users.slice(0, 6).map((user) => <li key={user.email}><span className="ui-avatar" aria-hidden="true">{user.display_name.slice(0, 1)}</span><div><b>{user.display_name}</b><span>{user.username ? `@${user.username}` : user.email}</span></div><Badge tone={user.plan === "free" ? "neutral" : "accent"}>{getPlanName(user.plan)}</Badge></li>)}</ul>
        </div></section>
        <section className="ui-panel"><div className="ui-panel__section">
          <h2 className="ui-section-title">העמודים הנצפים</h2>
          <ul className="admin-feed">{[...projects].sort((a, b) => Number(b.views) - Number(a.views)).slice(0, 6).map((project) => <li key={project.id}><div><b>{project.title}</b><span>{project.owner_email}</span></div><span className="admin-feed__num">{num(project.views)} צפיות</span></li>)}</ul>
        </div></section>
      </div>
    </> : null}

    {tab === "marketing" ? <>
      <dl className="admin-metrics">
        <div><dt>כניסות מקמפיינים</dt><dd>{num(campaignTotals.landingViews)}</dd><p>30 ימים</p></div>
        <div><dt>לחיצות לפעולה</dt><dd>{num(campaignTotals.ctaClicks)}</dd><p>{pct(campaignTotals.ctaClicks, campaignTotals.landingViews)}% מהכניסות</p></div>
        <div><dt>הרשמות</dt><dd>{num(campaignTotals.signups)}</dd><p>{pct(campaignTotals.signups, campaignTotals.landingViews)}% מהכניסות</p></div>
        <div><dt>עמודים שנוצרו</dt><dd>{num(campaignTotals.projects)}</dd><p>{campaignTotals.publishes} פורסמו</p></div>
        <div><dt>כניסות לתשלום</dt><dd>{num(campaignTotals.checkouts)}</dd><p>כוונת רכישה</p></div>
        <div><dt>לידים</dt><dd>{num(leads.length)}</dd><p>{metrics.openLeads} חדשים</p></div>
      </dl>
      <section className="admin-block">
        <h2 className="ui-section-title">ביצועי קמפיינים</h2>
        <p className="ui-section-lead">לפי מקור וקמפיין (UTM), בלי עוגיות פרסום. 30 הימים האחרונים.</p>
        <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>קמפיין</th><th className="num">כניסות</th><th className="num">לחיצות</th><th className="num">הרשמות</th><th className="num">נוצרו</th><th className="num">פורסמו</th><th className="num">תשלום</th><th className="num">לידים</th></tr></thead><tbody>{campaigns.length ? campaigns.map((row) => <tr key={`${row.source}-${row.campaign}`}><td><b>{row.campaign}</b><div className="admin-sub">{row.source}</div></td><td className="num">{Number(row.landing_views)}</td><td className="num">{Number(row.cta_clicks)}</td><td className="num">{Number(row.signups)}</td><td className="num">{Number(row.projects)}</td><td className="num">{Number(row.publishes)}</td><td className="num">{Number(row.checkouts)}</td><td className="num">{Number(row.leads)}</td></tr>) : <tr><td colSpan={8}>הנתונים יופיעו אחרי הכניסות הראשונות.</td></tr>}</tbody></table></div>
      </section>
      <section className="admin-block">
        <h2 className="ui-section-title">לידים</h2>
        <p className="ui-section-lead">מי שביקש שנחזור אליו: רשימת המתנה למסלול ארגונים, או עדכון כשהתשלום ייפתח.</p>
        {leads.length ? <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>שם</th><th>שימוש</th><th>מקור</th><th>התקבל</th><th>מצב</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.email}>
          <td><b>{lead.name}</b><div className="admin-sub"><a href={`mailto:${lead.email}?subject=${encodeURIComponent("Linkli: המשך לבקשה שלך")}`} dir="ltr">{lead.email}</a></div></td>
          <td>{useCaseLabels[lead.use_case] || lead.use_case}</td>
          <td>{lead.campaign_source || "ישיר"}{lead.campaign_name ? ` / ${lead.campaign_name}` : ""}</td>
          <td>{date(lead.created_at)}</td>
          <td><select className="ui-input admin-select" disabled={busy === lead.email} value={lead.status} onChange={(event) => updateLead(lead, event.target.value as LeadRow["status"])} aria-label={`מצב הליד ${lead.email}`}><option value="new">חדש</option><option value="contacted">נוצר קשר</option><option value="converted">הומר ללקוח</option><option value="closed">סגור</option></select></td>
        </tr>)}</tbody></table></div> : <p className="admin-empty">עוד אין לידים.</p>}
      </section>
    </> : null}

    {tab === "users" && showCreate ? (
      <form className="ui-panel admin-create" method="post" action="/api/forms/noscript" onSubmit={createDemoUser}>
        <div className="ui-panel__section">
          <h2 className="ui-section-title">משתמש דמו בלי דוא״ל</h2>
          <p className="ui-section-lead">נכנסים עם שם המשתמש והסיסמה. אין צורך באימות.</p>
          <div className="admin-create__grid">
            <div className="ui-field"><label className="ui-label" htmlFor="demo-username">שם משתמש</label><input id="demo-username" className="ui-input" name="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" dir="ltr" autoComplete="off" /></div>
            <div className="ui-field"><label className="ui-label" htmlFor="demo-name">שם תצוגה</label><input id="demo-name" className="ui-input" name="displayName" required minLength={2} maxLength={80} /></div>
            <div className="ui-field"><label className="ui-label" htmlFor="demo-password">סיסמה</label><input id="demo-password" className="ui-input" name="password" type="password" required minLength={15} maxLength={128} dir="ltr" autoComplete="new-password" /></div>
            <div className="ui-field"><label className="ui-label" htmlFor="demo-plan">מסלול</label><select id="demo-plan" className="ui-input" name="plan" defaultValue="free">{PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{getPlanName(plan)}</option>)}</select></div>
          </div>
          <Button type="submit" variant="primary" loading={busy === "create"} loadingLabel="יוצרים…">יצירת המשתמש</Button>
        </div>
      </form>
    ) : null}

    {(tab === "users" || tab === "projects") ? <div className="admin-search"><label className="sr-only" htmlFor="admin-search">חיפוש</label><input id="admin-search" className="ui-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "users" ? "חיפוש לפי שם, משתמש או דוא״ל" : "חיפוש לפי עמוד, בעלים או כתובת"} /></div> : null}

    {tab === "users" ? <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>משתמש</th><th>מסלול</th><th>אימות</th><th className="num">עמודים</th><th>מצב</th><th>נרשם</th><th><span className="sr-only">פעולות</span></th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.email}>
      <td><b>{user.display_name}</b><div className="admin-sub">{user.username ? `@${user.username} · דמו` : user.email}{user.email === adminEmail ? " · מנהל ראשי" : ""}</div></td>
      <td><select className="ui-input admin-select" disabled={busy === user.email} value={user.plan} onChange={(event) => updatePlan(user, event.target.value as UserRow["plan"])} aria-label={`מסלול של ${user.display_name}`}>{PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{getPlanName(plan)}</option>)}</select><div className="admin-sub">{user.billing_customer_id ? "לקוח משלם" : user.plan !== "free" ? "גישה ידנית" : ""}</div></td>
      <td><Badge tone={user.username ? "neutral" : user.email_verified ? "success" : "warning"}>{user.username ? "ללא דוא״ל" : user.email_verified ? "מאומת" : "ממתין"}</Badge></td>
      <td className="num">{Number(user.project_count)}<div className="admin-sub">{Number(user.published_count)} באוויר</div></td>
      <td><Badge tone={user.status === "suspended" ? "danger" : "success"}>{statusLabels[user.status]}</Badge>{user.note ? <div className="admin-sub" title={user.note}>יש הערה</div> : null}</td>
      <td className="admin-date">{date(user.created_at)}</td>
      <td><div className="admin-row-actions"><Button size="sm" variant={user.status === "suspended" ? "secondary" : "danger-quiet"} disabled={busy === user.email || user.email === adminEmail} onClick={() => toggleUser(user)}>{user.status === "suspended" ? "החזרה" : "השעיה"}</Button><Button size="sm" variant="danger-quiet" disabled={busy === user.email || user.email === adminEmail} onClick={() => deleteUser(user)}>מחיקה</Button></div></td>
    </tr>)}</tbody></table></div> : null}

    {tab === "projects" ? <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>עמוד</th><th>בעלים</th><th>תבנית</th><th className="num">צפיות</th><th>מצב</th><th><span className="sr-only">פעולות</span></th></tr></thead><tbody>{filteredProjects.map((project) => <tr key={project.id}>
      <td><b>{project.title}</b><div className="admin-sub" dir="ltr">/p/{project.slug}</div></td>
      <td>{project.owner_email}</td>
      <td>{project.template_id}</td>
      <td className="num">{num(project.views)}<div className="admin-sub">{num(project.clicks)} תגובות</div></td>
      <td><Badge tone={project.published ? "success" : "neutral"}>{project.published ? "באוויר" : "טיוטה"}</Badge></td>
      <td><div className="admin-row-actions">{project.owner_email === adminEmail ? <Link className="ui-button" data-size="sm" data-variant="ghost" href={`/studio/${project.id}`}>עריכה</Link> : null}{project.published ? <a className="ui-button" data-size="sm" data-variant="ghost" href={`/p/${project.slug}`} target="_blank" rel="noreferrer">צפייה</a> : null}<Button size="sm" variant={project.published ? "danger-quiet" : "secondary"} disabled={busy === project.id} onClick={() => toggleProject(project)}>{project.published ? "להוריד מהאוויר" : "לפרסם"}</Button></div></td>
    </tr>)}</tbody></table></div> : null}

    {tab === "support" ? (support.length ? <ul className="admin-support">{support.map((item) => {
      const pageUrl = safeHttpUrl(item.page_url);
      return <li key={item.id} className="ui-panel"><div className="ui-panel__section">
        <div className="admin-support__head"><div><b>{item.name}</b><div className="admin-sub"><a href={`mailto:${item.email}`} dir="ltr">{item.email}</a> · {topicLabels[item.topic] || item.topic} · {date(item.created_at)}</div></div><select className="ui-input admin-select" disabled={busy === item.id} value={item.status} onChange={(event) => updateSupport(item, event.target.value as SupportRow["status"])} aria-label={`מצב הפנייה של ${item.name}`}><option value="new">חדש</option><option value="in_progress">בטיפול</option><option value="closed">סגור</option></select></div>
        <p className="admin-support__message">{item.message}</p>
        {pageUrl ? <a className="admin-sub" href={pageUrl} target="_blank" rel="noreferrer" dir="ltr">{pageUrl}</a> : null}
      </div></li>;
    })}</ul> : <p className="admin-empty">אין פניות. טופס יצירת הקשר מעביר אותן לכאן.</p>) : null}

    {tab === "audit" ? (audit.length ? <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>פעולה</th><th>יעד</th><th>מנהל</th><th>מתי</th></tr></thead><tbody>{audit.map((item) => <tr key={item.id}><td><b>{actionLabels[item.action] || item.action}</b></td><td><span className="admin-sub">{item.target_type}:</span> {item.target_id}</td><td>{item.admin_email}</td><td className="admin-date">{date(item.created_at)}</td></tr>)}</tbody></table></div> : <p className="admin-empty">היומן ריק. פעולות ניהול יופיעו כאן.</p>) : null}
  </div>;
}
