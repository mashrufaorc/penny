import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { signSession, cookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    await dbConnect();

    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

    const token = await signSession({ uid: String(user._id) });

    const res = NextResponse.json({
      user: { id: String(user._id), email: user.email, name: user.name, ageGroup: user.ageGroup },
    });
    res.headers.set("Set-Cookie", `penny_session=${token}; ${cookieOptions()}`);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}
