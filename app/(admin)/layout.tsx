/**
 * (admin) 영역 layout — (app) 영역과 동일한 사이드바를 공유.
 * isAdmin=true 강제 전달 → admin 섹션 항상 노출.
 * 실제 권한 검증은 middleware에서 처리.
 */
import { Sidebar } from "@/components/layout/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar isAdmin />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
