/**
 * 인증된 사용자 영역 레이아웃.
 * 사이드바 + 상단 헤더 + main 영역.
 *
 * JWT 는 localStorage 기반이라 Next 미들웨어에서 검증 불가 →
 * 클라이언트 사이드 <AuthGuard> 로 보호. 토큰 없거나 /auth/me 401 시 /login.
 */
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
