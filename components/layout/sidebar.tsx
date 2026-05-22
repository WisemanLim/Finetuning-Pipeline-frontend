"use client";

/**
 * 좌측 사이드바 — 사용자 영역 + 관리자 영역 통합.
 *
 * /auth/me로 현재 사용자 role 조회 → ADMIN인 경우에만 관리자 섹션을 구분선과 함께 노출.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Plus,
  ListTodo,
  Settings,
  ShieldCheck,
  Users,
  Activity,
  Database,
  ScrollText,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const USER_NAV = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/jobs/new/step-1-category", label: "새 잡 생성", icon: Plus },
  { href: "/jobs", label: "잡 이력", icon: ListTodo },
  { href: "/settings", label: "설정", icon: Settings },
];

const ADMIN_NAV = [
  { href: "/admin/users", label: "사용자", icon: Users },
  { href: "/admin/jobs", label: "잡 모니터링", icon: Activity },
  { href: "/admin/resources", label: "리소스", icon: HardDrive },
  { href: "/admin/catalog", label: "카탈로그", icon: Database },
  { href: "/admin/audit", label: "감사 로그", icon: ScrollText },
];

export function Sidebar({ isAdmin: isAdminProp }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  // isAdmin prop이 명시되지 않았으면 /auth/me 응답으로 판단.
  // (admin) 그룹 layout처럼 prop으로 강제 전달도 가능.
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
    enabled: isAdminProp === undefined,
  });
  const isAdmin = isAdminProp ?? user?.role === "ADMIN";

  return (
    <aside className="w-60 shrink-0 border-r bg-card h-screen flex flex-col">
      <div className="px-6 py-5 border-b">
        <h1 className="text-lg font-bold">WFP</h1>
        <p className="text-xs text-muted-foreground">Fine-tuning Pipeline</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {USER_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            {/* 구분선 + 관리자 섹션 헤더 */}
            <div className="pt-4 mt-4 border-t">
              <div className="flex items-center gap-2 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                관리자
              </div>
            </div>

            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t px-6 py-4 text-xs text-muted-foreground">
        v0.1.0
      </div>
    </aside>
  );
}
