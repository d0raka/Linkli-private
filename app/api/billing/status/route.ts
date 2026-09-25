import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { getBillingStatus } from "@/lib/billing";
import { errorResponse, RequestError } from "@/lib/security";

export async function GET() {
  try {
    const user = await getProductUser();
    if (!user) throw new RequestError(401, "נדרשת התחברות");
    const db = await ensureDatabase();
    const status = await getBillingStatus(db, user.email);
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}
