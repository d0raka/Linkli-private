"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash } from "@phosphor-icons/react/ssr";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { Button, IconButton } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Notice } from "@/app/ui/status";

export default function DeleteResponseButton({ projectId, responseId, name }: { projectId: string; responseId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/projects/${projectId}/rsvp/${responseId}`, { method: "DELETE", json: {} });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught, "לא הצלחנו למחוק את המענה."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <IconButton label={`מחיקת המענה של ${name}`} tone="danger" onClick={() => setOpen(true)}><Trash aria-hidden="true" /></IconButton>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        role="alertdialog"
        dismissible={!busy}
        title="למחוק את המענה?"
        description={`המענה של ${name} יימחק מהרשימה ומהייצוא. אי אפשר לשחזר אותו.`}
        footer={<>
          <Button onClick={() => setOpen(false)} disabled={busy} autoFocus>ביטול</Button>
          <Button variant="danger" onClick={remove} loading={busy} loadingLabel="מוחקים…">מחיקה</Button>
        </>}
      >
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </Dialog>
    </>
  );
}
