"use client";

export default function LogoutButton() {
  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) window.location.assign("/");
  }
  return <button className="logout-button" onClick={logout}>יציאה</button>;
}
