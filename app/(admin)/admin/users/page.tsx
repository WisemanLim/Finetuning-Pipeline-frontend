"use client";

/** 관리자 사용자 관리 — 실제 GET /admin/users 호출 + 권한/활성 토글. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function AdminUsersPage() {
  const qc = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.admin.listUsers(),
    refetchInterval: 30000,
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { role?: string; is_active?: boolean } }) =>
      api.admin.patchUser(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (e: Error) => alert(`변경 실패: ${e.message}`),
  });

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("ko-KR"); } catch { return iso; }
  };

  const toggleRole = (u: { id: string; email: string; role: string }) => {
    const newRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    if (!confirm(`${u.email}의 권한을 ${u.role} → ${newRole}로 변경?`)) return;
    patch.mutate({ id: u.id, body: { role: newRole } });
  };

  const toggleActive = (u: { id: string; email: string; is_active: boolean }) => {
    const action = u.is_active ? "비활성화" : "활성화";
    if (!confirm(`${u.email}을 ${action}?`)) return;
    patch.mutate({ id: u.id, body: { is_active: !u.is_active } });
  };

  return (
    <>
      <Header title="사용자 관리" subtitle="전체 사용자 목록 및 권한" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용자 {users ? `(${users.length})` : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-destructive">로드 실패: {(error as Error).message}</p>}
            {isLoading && <p className="text-sm text-muted-foreground">로딩 중...</p>}
            {users && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이메일</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead>활성</TableHead>
                    <TableHead>가입</TableHead>
                    <TableHead>최근 로그인</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="text-muted-foreground">{u.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? "success" : "destructive"}>
                          {u.is_active ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(u.created_at)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(u.last_login)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => toggleRole(u)} disabled={patch.isPending}>
                          권한 변경
                        </Button>
                        <Button
                          size="sm"
                          variant={u.is_active ? "destructive" : "default"}
                          onClick={() => toggleActive(u)}
                          disabled={patch.isPending}
                        >
                          {u.is_active ? "비활성" : "활성화"}
                        </Button>
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
