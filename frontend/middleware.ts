import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hasSession =
    request.cookies.get("sb-access-token") ||
    request.cookies.get("sb-refresh-token");

  const { pathname } = request.nextUrl;

  // 로그인 페이지는 통과
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // 세션 없으면 로그인으로
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};