import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/session-token";

export function proxy(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(sessionCookieName)?.value);
  const path = request.nextUrl.pathname;
  if (path.startsWith("/app")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    if (session.role === "CUSTOMER") return NextResponse.redirect(new URL("/portal", request.url));
    if (path.startsWith("/app/settings") && !["ADMIN", "MANAGER"].includes(session.role)) return NextResponse.redirect(new URL("/app/dashboard?notice=Settings+require+an+admin+or+manager", request.url));
  }
  if (path.startsWith("/portal")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    if (session.role !== "CUSTOMER") return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/portal/:path*"] };
