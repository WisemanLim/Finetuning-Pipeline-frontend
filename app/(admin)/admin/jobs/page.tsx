"use client";

/**
 * 관리자 잡 모니터링 — 실제 API (/admin/jobs) 호출.
 * 5초 폴링으로 실행 중 잡 상태 추적. 클릭 시 잡 상세로 이동.
 */
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success"> = {
  RUNNING: "default",
  EVAL: "default",
  PENDING: "secondary",
  DONE: "success",
  FAILED: "destructive",
  CANCELLED: "secondary",
};

const STATE_FILTERS = ["", "RUNNING", "PENDING", "EVAL", "DONE", "FAILED", "CANCELLED"];

export default function AdminJobsPage() {
  const qc = useQueryClient();
  const [stateFilter, setStateFilter] = useState("");

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ["admin", "jobs", stateFilter],
    queryFn: () => api.admin.listJobs(stateFilter || undefined),
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const cancel = useMutation({
    mutationFn: (jobId: string) => api.admin.cancelJob(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "jobs"] }),
    onError: (e: Error) => alert(`취소 실패: ${e.message}`),
  });

  const del = useMutation({
    mutationFn: (jobId: string) => api.deleteJob(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "jobs"] }),
    onError: (e: Error) => alert(`삭제 실패: ${e.message}`),
  });

  const bulkDel = useMutation({
    mutationFn: (states: string[]) => api.bulkDeleteJobs(states),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
      alert(`${r.deleted}건 영구 삭제 완료.`);
    },
    onError: (e: Error) => alert(`일괄 삭제 실패: ${e.message}`),
  });

  const handleCancel = (jobId: string) => {
    if (!confirm(`잡 ${jobId.slice(0, 8)}... 을 강제 취소하시겠습니까?`)) return;
    cancel.mutate(jobId);
  };

  const handleDelete = (jobId: string, ownerLabel: string) => {
    const msg = [
      "⚠ 경고: 다른 사용자의 데이터를 영구 삭제합니다.",
      "",
      `잡 ID: ${jobId.slice(0, 8)}...`,
      `소유자: ${ownerLabel}`,
      "",
      "이 작업은 되돌릴 수 없으며, 아티팩트/이벤트 로그까지 함께 사라집니다.",
      "정말 삭제하시겠습니까?",
    ].join("\n");
    if (!confirm(msg)) return;
    del.mutate(jobId);
  };

  const handleBulkDeleteFailed = () => {
    const msg = [
      "⚠ 경고: 모든 사용자의 FAILED 잡을 일괄 영구 삭제합니다.",
      "",
      "본인 잡 뿐 아니라 타 사용자의 잡 데이터까지 모두 사라집니다.",
      "복구 불가능합니다. 계속하시겠습니까?",
    ].join("\n");
    if (!confirm(msg)) return;
    if (!confirm("최종 확인 — 정말 실행할까요?")) return;
    bulkDel.mutate(["FAILED"]);
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("ko-KR", {
        month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const isActive = (s: string) => ["RUNNING", "PENDING", "EVAL"].includes(s);

  return (
    <>
      <Header title="잡 모니터링" subtitle="전체 사용자 잡 현황 + 강제 취소/삭제" />
      <div className="p-6 space-y-4">
        {/* 필터 + 위험 액션 */}
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {STATE_FILTERS.map((s) => (
              <Button
                key={s || "all"}
                size="sm"
                variant={stateFilter === s ? "default" : "outline"}
                onClick={() => setStateFilter(s)}
              >
                {s || "전체"}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDeleteFailed}
            disabled={bulkDel.isPending}
            title="전체 사용자의 FAILED 잡을 일괄 삭제합니다."
          >
            🗑 FAILED 일괄 삭제 (전체 사용자)
          </Button>
        </div>

        <div className="rounded-md border border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          ⚠ 이 페이지의 삭제 기능은 <b>타 사용자의 데이터</b>를 영구 제거합니다. 반드시 사용자 동의/공지를 거친 뒤에만 사용하세요.
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {stateFilter || "전체"} 잡 {jobs ? `(${jobs.length})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="text-sm text-destructive">잡 목록 로드 실패: {(error as Error).message}</p>
            )}
            {isLoading && <p className="text-sm text-muted-foreground">로딩 중...</p>}
            {jobs && jobs.length === 0 && (
              <p className="text-sm text-muted-foreground">해당 상태의 잡이 없습니다.</p>
            )}
            {jobs && jobs.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>사용자</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>KSIC</TableHead>
                    <TableHead>태스크</TableHead>
                    <TableHead>모델</TableHead>
                    <TableHead>생성</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.job_id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/jobs/${j.job_id}`} className="text-blue-600 underline">
                          {j.job_id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">
                        {(() => {
                          const ext = j as { user_email?: string; user_name?: string };
                          if (ext.user_email) return ext.user_email;
                          if (ext.user_name) return ext.user_name;
                          return (
                            <span className="text-muted-foreground italic" title={j.user_id}>
                              (삭제된 사용자)
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATE_VARIANT[j.state] ?? "secondary"}>{j.state}</Badge>
                      </TableCell>
                      <TableCell>{j.current_stage}/9</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{j.ksic_section || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(j as { task_type?: string }).task_type || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {j.model_hf_repo || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtTime(j.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isActive(j.state) ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancel(j.job_id)}
                            disabled={cancel.isPending}
                          >
                            취소
                          </Button>
                        ) : (
                          (() => {
                            const ext = j as { user_email?: string; user_name?: string };
                            const owner = ext.user_email || ext.user_name || `(uid:${j.user_id.slice(0, 8)})`;
                            return (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(j.job_id, owner)}
                                disabled={del.isPending}
                                title={`소유자 ${owner} 의 데이터를 영구 삭제합니다.`}
                              >
                                🗑 삭제
                              </Button>
                            );
                          })()
                        )}
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
