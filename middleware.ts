import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/login", "/signup", "/_next", "/favicon.ico", "/assets"];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get("penny_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|.*\\..*).*)"],
};
