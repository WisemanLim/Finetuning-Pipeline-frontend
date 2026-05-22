"use client";

/**
 * 잡 모니터링 페이지.
 * - WebSocket 실시간 진행 스트림
 * - 손실 그래프
 * - 잡 메타 정보
 * - 완료 시 playground / artifacts 링크
 */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressStream } from "@/components/jobs/progress-stream";
import { LossChart } from "@/components/jobs/loss-chart";
import { JobProgressWS } from "@/lib/ws";
import { api } from "@/lib/api";
import { useWizard } from "@/lib/store";
import { useEffect } from "react";
import { XCircle, Download, Play, RefreshCw } from "lucide-react";

export default function JobMonitorPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const [lossData, setLossData] = useState<{ step: number; loss?: number; eval_loss?: number }[]>([]);

  // 잡 상태 폴링 (WS와 보완)
  const { data: job, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId),
    refetchInterval: 5000,
  });

  // 손실 데이터를 WS로 누적 (별도 WS 인스턴스)
  useEffect(() => {
    const ws = new JobProgressWS(jobId, {
      onMessage: (ev) => {
        if (typeof ev.extra?.step === "number" && typeof ev.extra?.loss === "number") {
          setLossData((prev) =>
            [...prev.slice(-199), {
              step: ev.extra.step as number,
              loss: ev.extra.loss as number,
              eval_loss: ev.extra.eval_loss as number | undefined,
            }],
          );
        }
      },
      reconnectMs: 3000,
    });
    ws.connect();
    return () => ws.close();
  }, [jobId]);

  const cancel = useMutation({
    mutationFn: () => api.cancelJob(jobId),
    onSuccess: () => refetch(),
  });

  const router = useRouter();
  const loadFromJob = useWizard((s) => s.loadFromJob);

  const isRunning = job?.state === "RUNNING" || job?.state === "EVAL" || job?.state === "PENDING";
  const isDone = job?.state === "DONE";
  const isFailed = job?.state === "FAILED";
  const isCancelled = job?.state === "CANCELLED";

  // 재실행 — 현재 잡의 spec을 위자드 store에 로드 후 step-1로 이동
  const handleRerun = () => {
    if (!job) return;
    loadFromJob(job);
    router.push("/jobs/new/step-1-category");
  };

  return (
    <>
      <Header
        title={`잡 ${jobId.slice(0, 8)}`}
        subtitle={`상태: ${job?.state || "—"} · Stage ${job?.current_stage || 0}/9`}
      />

      <div className="p-6 space-y-6 max-w-6xl">
        {/* 상단 상태 카드 */}
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={isDone ? "success" : isFailed ? "destructive" : "default"}>
                  {job?.state || "LOADING"}
                </Badge>
                <span className="text-sm text-muted-foreground">Job ID</span>
                <code className="text-xs">{jobId}</code>
              </div>
              {job?.error_message && (
                <p className="text-sm text-destructive mt-2">
                  [{job.error_code}] {job.error_message}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {isRunning && (
                <Button variant="destructive" size="sm" onClick={() => cancel.mutate()} className="gap-2">
                  <XCircle className="h-4 w-4" /> 취소
                </Button>
              )}
              {(isFailed || isCancelled) && (
                <Button size="sm" onClick={handleRerun} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> 수정 후 재실행
                </Button>
              )}
              {isDone && (
                <>
                  <Link href={`/jobs/${jobId}/playground`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Play className="h-4 w-4" /> 추론 시연
                    </Button>
                  </Link>
                  <Link href={`/jobs/${jobId}/artifacts`}>
                    <Button size="sm" className="gap-2">
                      <Download className="h-4 w-4" /> 다운로드
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 진행 스트림 */}
        <ProgressStream jobId={jobId} initialStage={job?.current_stage || 0} />

        {/* 손실 그래프 (Stage 7 진행 중) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">학습 손실</CardTitle>
          </CardHeader>
          <CardContent>
            <LossChart data={lossData} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
