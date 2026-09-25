import { requireProductUser } from "@/lib/auth";
import AppTopbar from "@/app/app-topbar";
import "./studio.css";

export default async function StudioShell({ createMode = false }: { createMode?: boolean }) {
  const returnTo = createMode ? "/studio/create" : "/studio";
  const user = await requireProductUser(returnTo);
  const { default: StudioClient } = await import("./studio-client");

  return (
    <main className="studio-app-shell studio-body" id="main-content">
      <AppTopbar
        displayName={user.displayName}
        plan={user.plan}
        isAdmin={user.isAdmin}
        current={createMode ? "create" : "studio"}
      />

      <section className="studio-app-frame">
        <StudioClient
          key={createMode ? "create" : "dashboard"}
          initialName={user.displayName}
          initialMode={createMode ? "templates" : "dashboard"}
        />
      </section>
    </main>
  );
}
