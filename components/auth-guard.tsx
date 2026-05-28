"use client";

/**
 * 클라이언트 사이드 인증 가드.
 *
 * JWT 가 localStorage 에 저장돼 Next 미들웨어가 직접 검사할 수 없으므로
 * (app)/(admin) 레이아웃을 이 컴포넌트로 감싸 토큰 + role 을 확인한다.
 *
 * 토큰 없음 → /login?callbackUrl=현재경로 리다이렉트.
 * /auth/me 401 → request() 가 자동 리다이렉트 (lib/api.ts).
 * ADMIN 미달 → 403 안내 화면.
 */
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { api, tokenStore } from "@/lib/api";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hasToken =
    typeof window !== "undefined" ? !!tokenStore.get() : false;

  // 토큰 없으면 /login 리다이렉트
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!tokenStore.get()) {
      const cb = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?callbackUrl=${cb}`);
    }
  }, [pathname, router]);

  // 토큰 있는 경우만 /auth/me 호출. 토큰 무효면 request() 가 401 → /login 자동.
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    enabled: hasToken,
    retry: false,
    staleTime: 30 * 1000,
  });

  if (!hasToken) {
    // 리다이렉트 진행 중 — 빈 화면
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        인증 확인 중...
      </div>
    );
  }

  if (error || !user) {
    // request() 가 이미 /login 리다이렉트 트리거. 잔여 렌더 차단.
    return null;
  }

  if (requireAdmin && user.role !== "ADMIN") {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-3 p-6">
        <h1 className="text-xl font-semibold">접근 권한 없음</h1>
        <p className="text-sm text-muted-foreground">
          이 페이지는 관리자(ADMIN) 권한이 필요합니다.
        </p>
        <button
          onClick={() => router.replace("/dashboard")}
          className="text-sm underline"
        >
          대시보드로 이동
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
