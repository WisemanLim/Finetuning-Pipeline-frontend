"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOCK_JOBS = [
  { id: "abc12345", user: "alice@example.com", state: "RUNNING", stage: 7, ksic: "J", started: "10:23" },
  { id: "def67890", user: "bob@example.com", state: "DONE", stage: 9, ksic: "Q", started: "08:15" },
  { id: "ghi54321", user: "alice@example.com", state: "FAILED", stage: 7, ksic: "C", started: "06:42" },
];

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success"> = {
  RUNNING: "default",
  DONE: "success",
  FAILED: "destructive",
  PENDING: "secondary",
  CANCELLED: "secondary",
  EVAL: "default",
};

export default function AdminJobsPage() {
  return (
    <>
      <Header title="잡 모니터링" subtitle="전체 사용자 잡 현황 + 강제 취소" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">실행 중 잡 ({MOCK_JOBS.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>사용자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>KSIC</TableHead>
                  <TableHead>시작</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_JOBS.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono text-xs">{j.id}</TableCell>
                    <TableCell>{j.user}</TableCell>
                    <TableCell>
                      <Badge variant={STATE_VARIANT[j.state]}>{j.state}</Badge>
                    </TableCell>
                    <TableCell>{j.stage}/9</TableCell>
                    <TableCell><Badge variant="outline">{j.ksic}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{j.started}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="destructive">취소</Button>
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
