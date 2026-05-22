/**
 * (admin) 영역 layout.
 * 사이드바에 isAdmin=true 전달. 실제 환경에서는 middleware가 ADMIN 권한 검증.
 */
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const ADMIN_NAV = [
  { href: "/admin/users", label: "사용자" },
  { href: "/admin/jobs", label: "잡 모니터링" },
  { href: "/admin/resources", label: "리소스" },
  { href: "/admin/catalog", label: "카탈로그" },
  { href: "/admin/audit", label: "감사 로그" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 border-r bg-card">
        <div className="px-6 py-5 border-b">
          <h1 className="text-lg font-bold">WFP Admin</h1>
          <p className="text-xs text-muted-foreground">관리자 콘솔</p>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
