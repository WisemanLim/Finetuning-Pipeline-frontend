"use client";

/**
 * 잡 이력 — 현재 사용자의 모든 잡 (GET /jobs).
 *
 * 5초마다 자동 갱신 (백그라운드 실행 중인 잡 상태 추적).
 * 잡 행 클릭 시 모니터링 페이지로 이동.
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/utils";
import { KSIC_SECTIONS } from "@/lib/ksic";

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success"> = {
  PENDING: "secondary",
  RUNNING: "default",
  EVAL: "default",
  DONE: "success",
  FAILED: "destructive",
  CANCELLED: "secondary",
};

export default function JobsListPage() {
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ["jobs", "all"],
    queryFn: () => api.listJobs(),
    // 실행 중 잡 상태 추적 (5초 폴링)
    refetchInterval: 5000,
    retry: false,
  });

  if (error) {
    return (
      <>
        <Header title="잡 이력" subtitle="과거 파인튜닝 잡 목록" />
        <div className="p-6">
          <p className="text-sm text-destructive">
            잡 목록을 불러오지 못했습니다. 다시 로그인하세요.
          </p>
        </div>
      </>
    );
  }

  const hasJobs = jobs && jobs.length > 0;

  return (
    <>
      <Header title="잡 이력" subtitle="현재 사용자의 잡 목록 (5초 자동 갱신)" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                전체 ({jobs?.length ?? 0})
              </CardTitle>
              <Link href="/jobs/new/step-1-category">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> 새 잡 생성
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-6">로딩 중...</p>
            )}
            {!isLoading && !hasJobs && (
              <div className="text-center py-10 text-sm text-muted-foreground space-y-2">
                <p>아직 생성된 잡이 없습니다.</p>
                <p>위의 &quot;새 잡 생성&quot; 버튼으로 시작하세요.</p>
              </div>
            )}
            {hasJobs && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>KSIC</TableHead>
                    <TableHead>모델</TableHead>
                    <TableHead>생성</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => {
                    const section = KSIC_SECTIONS.find((s) => s.code === j.ksic_section);
                    return (
                      <TableRow key={j.job_id}>
                        <TableCell className="font-mono text-xs">
                          {j.job_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATE_VARIANT[j.state] || "secondary"}>
                            {j.state}
                          </Badge>
                          {j.error_code && (
                            <p className="text-xs text-destructive mt-1">{j.error_code}</p>
                          )}
                        </TableCell>
                        <TableCell>{j.current_stage}/9</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {j.ksic_section}
                          </Badge>
                          {section && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {section.koName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {j.model_hf_repo || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {j.created_at ? relativeTime(j.created_at) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/jobs/${j.job_id}`}>
                            <Button size="sm" variant="outline">상세</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
