"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error("logout failed");
      window.location.replace("/");
    } catch {
      setBusy(false);
      window.location.reload();
    }
  }
  return <button className="logout-button" onClick={logout} disabled={busy}>{busy ? "יוצאים…" : "יציאה"}</button>;
}
