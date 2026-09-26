import { getProductUser } from "@/lib/auth";
import BirthdayCreator from "./birthday-creator";
import "@/app/styles/experience.css";
import "@/app/site/phone.css";
import "../create.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "יצירת הפתעת יום הולדת | Linkli",
  description: "יוצרים הפתעת יום הולדת אישית ומקבלים תצוגה מוכנה לפני ההרשמה.",
};

export default async function BirthdayCreatorPage() {
  const user = await getProductUser();
  return <BirthdayCreator signedIn={Boolean(user)} />;
}
