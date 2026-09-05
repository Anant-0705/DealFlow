import { NextResponse, type NextRequest } from "next/server";
import { APPROVER_ROLES, SETTINGS_ROLES, hasRole, landingPath } from "@/lib/roles";
import { sessionCookieName, verifySessionToken } from "@/lib/session-token";

function withNext(request: NextRequest, pathname: string) {
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return login;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = verifySessionToken(request.cookies.get(sessionCookieName)?.value);

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (!session) return NextResponse.redirect(withNext(request, `${pathname}${request.nextUrl.search}`));
    if (session.role === "CUSTOMER") return NextResponse.redirect(new URL("/portal", request.url));
    if (pathname === "/app" || pathname === "/app/") {
      return NextResponse.redirect(new URL(landingPath(session.role), request.url));
    }
    if (pathname.startsWith("/app/settings") && !hasRole(session.role, SETTINGS_ROLES)) {
      return NextResponse.redirect(new URL("/app/dashboard?notice=Settings+require+an+admin+or+manager", request.url));
    }
    if (pathname.startsWith("/app/approvals") && !hasRole(session.role, APPROVER_ROLES)) {
      return NextResponse.redirect(new URL("/app/dashboard?notice=Approval+inbox+requires+an+approver", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    if (!session) return NextResponse.redirect(withNext(request, `${pathname}${request.nextUrl.search}`));
    if (session.role !== "CUSTOMER") return NextResponse.redirect(new URL("/app/dashboard", request.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app", "/app/:path*", "/portal", "/portal/:path*"],
};
