"use client";

/**
 * 좌측 사이드바 — 사용자(앱) 영역 내비게이션.
 * 관리자 메뉴는 (admin) 그룹의 별도 layout에서 처리.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, ListTodo, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/jobs/new/step-1-category", label: "새 잡 생성", icon: Plus },
  { href: "/jobs", label: "잡 이력", icon: ListTodo },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r bg-card h-screen flex flex-col">
      <div className="px-6 py-5 border-b">
        <h1 className="text-lg font-bold">WFP</h1>
        <p className="text-xs text-muted-foreground">Fine-tuning Pipeline</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin/users"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
              pathname?.startsWith("/admin")
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            관리자
          </Link>
        )}
      </nav>

      <div className="border-t px-6 py-4 text-xs text-muted-foreground">
        v0.1.0
      </div>
    </aside>
  );
}
