import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Account already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      name,
      passwordHash,
    });

    return NextResponse.json(
      { success: true, userId: String(user._id) },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json(
      { error: "Server error creating account" },
      { status: 500 }
    );
  }
}
