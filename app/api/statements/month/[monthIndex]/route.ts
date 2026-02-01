import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Statement } from "@/models/Statement";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: { monthIndex: string } }) {
  try {
    const token = cookies().get("penny_session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { uid } = await verifySession(token);
    await dbConnect();

    const monthIndex = Number(ctx.params.monthIndex);
    const st = await Statement.findOne({ userId: uid, monthIndex }).lean();

    return NextResponse.json({ statement: st ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}
