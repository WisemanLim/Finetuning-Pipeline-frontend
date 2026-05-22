/**
 * Next.js 미들웨어 — 인증 필요 영역 보호.
 *
 * (app)/* 와 (admin)/* 그룹 접근 시 세션 검증.
 * 미인증 → /login 리다이렉트.
 *
 * 실제 환경에서는 next-auth `withAuth` 미들웨어 사용 권장.
 * 현재는 빌드 검증용 최소 구현.
 */
import { NextResponse, type NextRequest } from "next/server";

// 현재 인증은 client-side JWT(localStorage) 기반.
// 미들웨어는 NextAuth 쿠키 검사 방식이라 일치하지 않으므로 보호 경로 비활성.
// JWT를 httpOnly 쿠키로 마이그레이션 시 아래 배열 복원.
const PROTECTED_PREFIXES: string[] = [];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 보호 경로가 아니면 통과
  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 세션 토큰 검사 (NextAuth의 next-auth.session-token 쿠키)
  const sessionToken =
    req.cookies.get("next-auth.session-token") ??
    req.cookies.get("__Secure-next-auth.session-token");

  if (!sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    // 개발 편의: 인증 미구현 단계에서는 통과시킬 수도 있음
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
      return NextResponse.next();
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
