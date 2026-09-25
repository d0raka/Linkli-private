import type { Metadata } from "next";
import { getProductUser } from "@/lib/auth";
import GuidedEventCreator from "../guided-event-creator";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "יוצרים הזמנה לחתונה | Linkli", description: "השמות, הסיפור והאווירה שלכם — הזמנה אישית ששולחים בוואטסאפ." };
export default async function Page() { const user = await getProductUser(); return <GuidedEventCreator template="wedding" signedIn={Boolean(user)} />; }
