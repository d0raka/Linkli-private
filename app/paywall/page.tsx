import { permanentRedirect } from "next/navigation";

export default function PaywallRedirect() {
  permanentRedirect("/pricing");
}
