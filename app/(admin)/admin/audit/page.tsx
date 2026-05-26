"use client";

/** 관리자 감사 로그 — 실제 GET /admin/audit 호출. */
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function AdminAuditPage() {
  const { data: entries, isLoading, error } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => api.admin.audit(200),
    refetchInterval: 15000,
  });

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString("ko-KR"); } catch { return iso; }
  };

  return (
    <>
      <Header title="감사 로그" subtitle="관리자 액션 이력" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              최근 액션 {entries ? `(${entries.length})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-destructive">로드 실패: {(error as Error).message}</p>}
            {isLoading && <p className="text-sm text-muted-foreground">로딩 중...</p>}
            {entries && entries.length === 0 && (
              <p className="text-sm text-muted-foreground">감사 로그 없음.</p>
            )}
            {entries && entries.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시각</TableHead>
                    <TableHead>관리자</TableHead>
                    <TableHead>액션</TableHead>
                    <TableHead>대상</TableHead>
                    <TableHead>상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((a) => (
                    <TableRow key={(a as { id?: string }).id}>
                      <TableCell className="font-mono text-xs">{fmt((a as { ts: string }).ts)}</TableCell>
                      <TableCell className="text-xs">{(a as { actor_email: string }).actor_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{(a as { action: string }).action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{(a as { target?: string }).target || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                        {(a as { detail?: string }).detail || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
