import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = cookies().get("penny_session")?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 200 });

    const { uid } = await verifySession(token);
    await dbConnect();

    const user = await User.findById(uid).lean();
    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    return NextResponse.json({
      user: { id: String(user._id), email: user.email, name: user.name, ageGroup: user.ageGroup },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
