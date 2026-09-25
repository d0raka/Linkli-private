import AppTopbar from "@/app/app-topbar";
import type { PlanType } from "@/lib/plans";

export default function AccountHeader({
  displayName,
  plan,
  isAdmin,
}: {
  displayName: string;
  email?: string;
  plan: PlanType;
  isAdmin?: boolean;
}) {
  return <AppTopbar displayName={displayName} plan={plan} isAdmin={isAdmin} current="account" />;
}
