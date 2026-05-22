"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// 운영 시 GET /api/admin/users
const MOCK_USERS = [
  { id: "u1", email: "alice@example.com", role: "USER", lastLogin: "2026-05-20", jobs: 3 },
  { id: "u2", email: "bob@example.com", role: "USER", lastLogin: "2026-05-19", jobs: 1 },
  { id: "u3", email: "admin@example.com", role: "ADMIN", lastLogin: "2026-05-21", jobs: 0 },
];

export default function AdminUsersPage() {
  return (
    <>
      <Header title="사용자 관리" subtitle="전체 사용자 목록 및 권한" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용자 ({MOCK_USERS.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>권한</TableHead>
                  <TableHead>잡 수</TableHead>
                  <TableHead>최근 로그인</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_USERS.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>{u.jobs}</TableCell>
                    <TableCell className="text-muted-foreground">{u.lastLogin}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline">권한 변경</Button>
                      <Button size="sm" variant="destructive">비활성</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
