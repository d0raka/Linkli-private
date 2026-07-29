import Link from "next/link";
import LogoutButton from "@/app/studio/logout-button";

export default function AccountHeader({
  displayName,
  email,
  plan,
}: {
  displayName: string;
  email: string;
  plan: "free" | "plus";
}) {
  return (
    <header className="studio-header account-header">
      <Link href="/studio" className="brand" aria-label="חזרה לעמודים שלי">
        Link<span>li</span>
      </Link>
      <div className="studio-user">
        <Link href="/studio" className="account-link">העמודים שלי</Link>
        <span className={`plan-pill ${plan}`}>{plan === "plus" ? "PLUS" : "FREE"}</span>
        <div className="account-header-person">
          <b>{displayName}</b>
          <span>{email}</span>
        </div>
        <div className="user-avatar" aria-hidden="true">{displayName.slice(0, 1)}</div>
        <LogoutButton />
      </div>
    </header>
  );
}
