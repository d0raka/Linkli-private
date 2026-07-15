import Link from "next/link";
import { ensureDatabase } from "@/db";
import { requireAdminUser } from "@/lib/auth";
import LogoutButton from "@/app/studio/logout-button";
import AdminClient from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdminUser();
  const db = await ensureDatabase();
  const [metricsResult, usersResult, projectsResult, supportResult, auditResult] = await db.batch([
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM users WHERE plan = 'plus') AS plus_users,
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM projects WHERE published = 1) AS published,
      (SELECT COALESCE(SUM(views), 0) FROM projects) AS views,
      (SELECT COALESCE(SUM(clicks), 0) FROM projects) AS clicks,
      (SELECT COUNT(*) FROM support_requests WHERE status = 'new') AS open_support`),
    db.prepare(`SELECT users.email, login_aliases.username, users.display_name, users.plan, users.created_at,
      COALESCE(user_controls.status, 'active') AS status,
      COALESCE(user_controls.note, '') AS note,
      CASE WHEN email_verifications.user_email IS NULL OR email_verifications.verified_at IS NOT NULL THEN 1 ELSE 0 END AS email_verified,
      COUNT(projects.id) AS project_count,
      COALESCE(SUM(CASE WHEN projects.published = 1 THEN 1 ELSE 0 END), 0) AS published_count
      FROM users
      LEFT JOIN login_aliases ON login_aliases.user_email = users.email
      LEFT JOIN user_controls ON user_controls.email = users.email
      LEFT JOIN email_verifications ON email_verifications.user_email = users.email
      LEFT JOIN projects ON projects.owner_email = users.email
      GROUP BY users.email, login_aliases.username, users.display_name, users.plan, users.created_at, user_controls.status, user_controls.note, email_verifications.user_email, email_verifications.verified_at
      ORDER BY users.created_at DESC LIMIT 200`),
    db.prepare(`SELECT id, owner_email, title, slug, template_id, published, views, clicks, updated_at
      FROM projects ORDER BY updated_at DESC LIMIT 200`),
    db.prepare(`SELECT id, name, email, topic, message, page_url, status, created_at
      FROM support_requests ORDER BY created_at DESC LIMIT 200`),
    db.prepare(`SELECT id, admin_email, action, target_type, target_id, details_json, created_at
      FROM admin_audit_log ORDER BY created_at DESC LIMIT 100`),
  ]);
  const metrics = (metricsResult.results?.[0] || {}) as Record<string, unknown>;

  return (
    <main className="admin-shell" id="main-content">
      <header className="admin-header">
        <Link href="/studio" className="brand">Link<span>li</span></Link>
        <nav aria-label="ניווט מנהל">
          <Link href="/studio">העמודים שלי</Link>
          <span className="admin-owner-badge">OWNER</span>
          <span className="admin-email">{admin.email}</span>
          <LogoutButton />
        </nav>
      </header>
      <AdminClient
        initialMetrics={{
          users: Number(metrics.users || 0),
          plusUsers: Number(metrics.plus_users || 0),
          projects: Number(metrics.projects || 0),
          published: Number(metrics.published || 0),
          views: Number(metrics.views || 0),
          clicks: Number(metrics.clicks || 0),
          openSupport: Number(metrics.open_support || 0),
        }}
        initialUsers={usersResult.results || []}
        initialProjects={projectsResult.results || []}
        initialSupport={supportResult.results || []}
        initialAudit={auditResult.results || []}
        adminEmail={admin.email}
      />
    </main>
  );
}
