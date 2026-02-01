import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", "penny_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  return res;
}
