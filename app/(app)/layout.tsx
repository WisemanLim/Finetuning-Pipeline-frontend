/**
 * 인증된 사용자 영역 레이아웃.
 * 사이드바 + 상단 헤더 + main 영역.
 *
 * 실제 환경에서는 middleware.ts에서 세션 검증 후 미인증 시 /login으로 리다이렉트.
 */
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
