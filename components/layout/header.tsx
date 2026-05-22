"use client";

/** 상단 헤더 — 페이지 타이틀 + 사용자 메뉴. */
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";
import { api } from "@/lib/api";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  // 헤더 우측에 이메일 노출 (로그인 상태 확인 + UX)
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  });

  const handleLogout = () => {
    api.logout();              // localStorage 토큰 제거
    qc.clear();                // TanStack Query 캐시 비우기
    router.replace("/login");
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <span className="text-sm text-muted-foreground hidden md:inline">
            {user.email}
          </span>
        )}
        <Button variant="ghost" size="icon" aria-label="알림">
          <Bell className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="로그아웃"
          onClick={handleLogout}
          title="로그아웃"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
