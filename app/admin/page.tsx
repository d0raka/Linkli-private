import { ensureDatabase } from "@/db";
import { requireAdminUser } from "@/lib/auth";
import { billingMetrics } from "@/lib/billing";
import { normalizePlan } from "@/lib/plans";
import AppShell from "@/app/app-shell/app-shell";
import AdminClient from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdminUser();
  const db = await ensureDatabase();
  const [metricsResult, usersResult, projectsResult, supportResult, auditResult, campaignsResult, leadsResult] = await db.batch([
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM users WHERE plan = 'plus' OR COALESCE(plan_tier, '') IN ('pro', 'max', 'business')) AS plus_users,
      (SELECT COUNT(*) FROM users WHERE plan = 'plus' AND billing_customer_id IS NOT NULL AND TRIM(billing_customer_id) <> '') AS paying_customers,
      (SELECT COUNT(DISTINCT owner_email) FROM projects) AS activated_users,
      (SELECT COUNT(DISTINCT owner_email) FROM projects WHERE published = 1) AS publishing_users,
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM projects WHERE published = 1) AS published,
      (SELECT COALESCE(SUM(views), 0) FROM projects) AS views,
      (SELECT COALESCE(SUM(clicks), 0) FROM projects) AS clicks,
      (SELECT COUNT(*) FROM support_requests WHERE status = 'new') AS open_support,
      (SELECT COUNT(*) FROM marketing_leads WHERE status = 'new') AS open_leads`),
    db.prepare(`SELECT users.email, login_aliases.username, users.display_name, users.plan, users.plan_tier, users.billing_customer_id, users.created_at,
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
      GROUP BY users.email, login_aliases.username, users.display_name, users.plan, users.plan_tier, users.billing_customer_id, users.created_at, user_controls.status, user_controls.note, email_verifications.user_email, email_verifications.verified_at
      ORDER BY users.created_at DESC LIMIT 200`),
    db.prepare(`SELECT id, owner_email, title, slug, template_id, published, views, clicks, updated_at
      FROM projects ORDER BY updated_at DESC LIMIT 200`),
    db.prepare(`SELECT id, name, email, topic, message, page_url, status, created_at
      FROM support_requests ORDER BY created_at DESC LIMIT 200`),
    db.prepare(`SELECT id, admin_email, action, target_type, target_id, details_json, created_at
      FROM admin_audit_log ORDER BY created_at DESC LIMIT 100`),
    db.prepare(`SELECT
      COALESCE(NULLIF(campaign_source, ''), 'direct') AS source,
      COALESCE(NULLIF(campaign_name, ''), 'ללא קמפיין') AS campaign,
      SUM(CASE WHEN event_name = 'landing_view' THEN 1 ELSE 0 END) AS landing_views,
      SUM(CASE WHEN event_name = 'cta_click' THEN 1 ELSE 0 END) AS cta_clicks,
      SUM(CASE WHEN event_name = 'signup' THEN 1 ELSE 0 END) AS signups,
      SUM(CASE WHEN event_name = 'project_created' THEN 1 ELSE 0 END) AS projects,
      SUM(CASE WHEN event_name = 'project_published' THEN 1 ELSE 0 END) AS publishes,
      SUM(CASE WHEN event_name = 'checkout_started' THEN 1 ELSE 0 END) AS checkouts,
      SUM(CASE WHEN event_name = 'waitlist_joined' THEN 1 ELSE 0 END) AS leads
      FROM marketing_events
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY COALESCE(NULLIF(campaign_source, ''), 'direct'), COALESCE(NULLIF(campaign_name, ''), 'ללא קמפיין')
      ORDER BY signups DESC, landing_views DESC LIMIT 100`),
    db.prepare(`SELECT email, name, use_case, campaign_source, campaign_medium, campaign_name, status, created_at, updated_at
      FROM marketing_leads ORDER BY created_at DESC LIMIT 200`),
  ]);
  const metrics = (metricsResult.results?.[0] || {}) as Record<string, unknown>;
  const revenue = await billingMetrics(db);

  return (
    <AppShell user={admin} current="admin">
      <div className="admin-shell">
      <AdminClient
        initialMetrics={{
          users: Number(metrics.users || 0),
          plusUsers: Number(metrics.plus_users || 0),
          payingCustomers: revenue.payingCustomers,
          mrrMinor: revenue.mrrMinor,
          oneTimeRevenueMinor: revenue.oneTimeRevenueMinor,
          activatedUsers: Number(metrics.activated_users || 0),
          publishingUsers: Number(metrics.publishing_users || 0),
          projects: Number(metrics.projects || 0),
          published: Number(metrics.published || 0),
          views: Number(metrics.views || 0),
          clicks: Number(metrics.clicks || 0),
          openSupport: Number(metrics.open_support || 0),
          openLeads: Number(metrics.open_leads || 0),
        }}
        initialUsers={(usersResult.results || []).map((row: Record<string, unknown>) => ({
          ...row,
          plan: normalizePlan(String(row.plan_tier || row.plan || "free")),
        }))}
        initialProjects={projectsResult.results || []}
        initialSupport={supportResult.results || []}
        initialAudit={auditResult.results || []}
        initialCampaigns={campaignsResult.results || []}
        initialLeads={leadsResult.results || []}
        adminEmail={admin.email}
      />
      </div>
    </AppShell>
  );
}
