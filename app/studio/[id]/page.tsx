import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureDatabase } from "@/db";
import { requireProductUser } from "@/lib/auth";
import { applyPlanToConfig, pageLimit } from "@/lib/plans";
import { projectFromRow } from "@/lib/projects";
import { validUuid } from "@/lib/security";
import AppShell from "@/app/app-shell/app-shell";
import EditorScreen from "@/app/studio/editor/editor-screen";
import "@/app/styles/experience.css";
import "@/app/studio/editor.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "עריכת עמוד | Linkli", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function EditPage({ params }: Props) {
  const { id } = await params;
  const user = await requireProductUser(`/studio/${id}`);
  if (!validUuid(id)) notFound();
  const db = await ensureDatabase();
  const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
  if (!row) notFound();
  const project = projectFromRow(row);

  return (
    <AppShell user={user} current="pages" width="full">
      <div className="studio-app-shell studio-body">
        <section className="studio-app-frame">
          <div className="studio-main studio-main-editor">
            <EditorScreen
          initialProject={{ ...project, config: applyPlanToConfig(project.config, user.plan) }}
          profile={{
            email: user.email,
            displayName: user.displayName,
            plan: user.plan,
            bonusPages: user.bonusPages,
            pageLimit: pageLimit(user.plan, user.bonusPages),
            emailVerified: user.emailVerified,
          }}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
