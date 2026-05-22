"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const MOCK_AUDIT = [
  { ts: "2026-05-21 10:23", user: "admin@example.com", action: "cancel_job", target: "abc12345" },
  { ts: "2026-05-21 09:50", user: "admin@example.com", action: "update_user_role", target: "u2" },
  { ts: "2026-05-21 09:15", user: "admin@example.com", action: "delete_artifact", target: "job:def67890/zip" },
];

export default function AdminAuditPage() {
  return (
    <>
      <Header title="감사 로그" subtitle="관리자 액션 이력" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 액션</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시각</TableHead>
                  <TableHead>관리자</TableHead>
                  <TableHead>액션</TableHead>
                  <TableHead>대상</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_AUDIT.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{a.ts}</TableCell>
                    <TableCell>{a.user}</TableCell>
                    <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{a.target}</TableCell>
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
