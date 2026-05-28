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
import { HFUploadCard } from "@/components/jobs/hf-upload-card";
import { JobProgressWS } from "@/lib/ws";
import { api } from "@/lib/api";
import { useWizard } from "@/lib/store";
import { useEffect } from "react";
import { XCircle, Download, Play, RefreshCw, FileDown, SkipForward, FastForward } from "lucide-react";

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
  const setWizard = useWizard((s) => s.set);

  const isRunning = job?.state === "RUNNING" || job?.state === "EVAL" || job?.state === "PENDING";
  const isDone = job?.state === "DONE";
  const isFailed = job?.state === "FAILED";
  const isCancelled = job?.state === "CANCELLED";

  // Stage 5 이상 진입 + SYNTHETIC("synth") 외 모드면 원시 수집 데이터 다운로드 가능
  const canDownloadRaw =
    (job?.current_stage ?? 0) >= 5 && job?.data_source_mode !== "synth";

  const handleDownloadRaw = async () => {
    try {
      await api.downloadRawData(jobId);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // 멈춤 감지 — RUNNING/EVAL/PENDING 에서 5분간 이벤트 부재 시 노출
  const STUCK_THRESHOLD_MS = 5 * 60 * 1000;
  const lastEventAt = job?.last_event_at ? Date.parse(job.last_event_at) : NaN;
  const stuckMs =
    isRunning && Number.isFinite(lastEventAt) ? Date.now() - lastEventAt : 0;
  const isStuck = isRunning && stuckMs > STUCK_THRESHOLD_MS;
  const stuckMinutes = Math.floor(stuckMs / 60000);

  // 작업 계속(advance) — 현재 stage 강제 스킵 후 다음 stage 재실행
  const advance = useMutation({
    mutationFn: () => api.advanceJob(jobId),
    onSuccess: (data) => {
      refetch();
      if (data.restarted) {
        alert(`Stage ${data.advanced_from} 스킵 → Stage ${data.new_start_stage} 부터 재개`);
      } else {
        alert(`마지막 stage 도달 — 잡 완료 처리됨`);
      }
    },
    onError: (e: Error) => alert(`작업 계속 실패: ${e.message}`),
  });

  // 조기 종료(finalize) — Stage 7 산출물로 DONE 마킹, 평가/패키징 스킵
  const finalize = useMutation({
    mutationFn: () => api.finalizeJob(jobId),
    onSuccess: (data) => {
      refetch();
      alert(
        data.checkpoint_dir
          ? `Stage ${data.finalized_at_stage} 까지 산출물로 완료 처리. 체크포인트: ${data.checkpoint_dir}`
          : `Stage ${data.finalized_at_stage} 에서 완료 처리. 체크포인트 없음.`,
      );
    },
    onError: (e: Error) => alert(`조기 종료 실패: ${e.message}`),
  });

  const handleAdvance = () => {
    const stage = job?.current_stage ?? 0;
    const warnMap: Record<number, string> = {
      2: "Stage 2(HW) 스킵 — fallback plan 적용 안 됨. 위험.",
      3: "Stage 3(환경 검사) 스킵 — 환경 경고 무시.",
      4: "Stage 4(모델 다운로드) 스킵 — 모델 없이 진행 불가. 후속 stage 실패 예상.",
      5: "Stage 5(데이터) 스킵 — 학습 데이터 없이 진행 불가. 실패 예상.",
      6: "Stage 6(설정) 스킵 — 학습 설정 없이 진행 불가.",
      7: "Stage 7(학습) 스킵 — 체크포인트 없으면 Stage 8/9 실패.",
      8: "Stage 8(평가) 스킵 — 평가 지표 누락. Stage 9 진행.",
      9: "Stage 9(패키징) 스킵 — 산출물 zip 누락. DONE 처리됨.",
    };
    const detail = warnMap[stage] ?? "현재 stage 의 산출물 누락 가능.";
    if (!confirm(`작업을 계속 진행할까요?\n\n${detail}\n\nStage ${stage} → Stage ${stage + 1}`)) return;
    advance.mutate();
  };

  const handleFinalize = () => {
    const stage = job?.current_stage ?? 0;
    if (
      !confirm(
        `잡을 조기 종료할까요?\n\n현재 stage ${stage} 에서 멈춤 — DONE 마킹. 평가/패키징 스킵.\n` +
        `Stage 7 까지 진행됐다면 체크포인트로 추론 가능.`,
      )
    )
      return;
    finalize.mutate();
  };

  // WFP-0203 = HW 사양 매칭 규칙 없음 → 강제 진행 옵션 제공
  const canForce = isFailed && job?.error_code === "WFP-0203";

  // WFP-030x = 환경 패키지 미설치/드라이버 문제 → 관리자에게 알림 권장
  const isEnvError = isFailed && (job?.error_code?.startsWith("WFP-030") ?? false);

  /** error_message에서 install 명령 추출 + uv 형태로 정규화. 없으면 null. */
  const extractResolutionCmd = (msg: string | undefined): string | null => {
    if (!msg) return null;
    // 패턴: `pip install ... pkg[>=ver]` (역따옴표/일반 둘 다)
    const m = msg.match(/`?(?:uv\s+)?pip install\s+(-U\s+)?(['"]?)([\w\-\.]+(?:[<>=!~]+[\d.]+)?)\2`?/i);
    if (m) {
      const pkg = m[3];
      return `uv pip install -U '${pkg}' --python .venv/bin/python`;
    }
    // WFP-0302 — "학습 패키지 미설치: ['torch', 'transformers', ...]"
    const m2 = msg.match(/미설치[:\s]+\[([^\]]+)\]/);
    if (m2) {
      const pkgs = m2[1].split(",").map((s) => s.trim().replace(/['"]/g, "")).filter(Boolean);
      if (pkgs.length > 0) {
        return `uv pip install -U ${pkgs.map((p) => `'${p}'`).join(" ")} --python .venv/bin/python`;
      }
    }
    return null;
  };

  const notify = useMutation({
    mutationFn: () => {
      const resolutionCmd = extractResolutionCmd(job?.error_message);
      return api.notifyAdmin({
        job_id: jobId,
        kind: isEnvError ? "env_missing" : "other",
        error_code: job?.error_code,
        message: `[${job?.error_code}] ${job?.error_message}`,
        detail: {
          ksic_section: job?.ksic_section,
          task_type: job?.task_type,
          model_hf_repo: job?.model_hf_repo,
          current_stage: job?.current_stage,
          resolution_cmd: resolutionCmd,
          worker_cwd: "Finetuning-Pipeline-worker",
        },
      });
    },
    onSuccess: () => alert("관리자에게 알림을 보냈습니다."),
    onError: (e: Error) => alert(`알림 송신 실패: ${e.message}`),
  });

  const handleNotifyAdmin = () => {
    if (!confirm(`다음 내용을 관리자에게 알리시겠습니까?\n\n[${job?.error_code}] ${job?.error_message}`)) return;
    notify.mutate();
  };

  // 재실행 — 현재 잡의 spec을 위자드 store에 로드 후 step-1로 이동
  const handleRerun = () => {
    if (!job) return;
    loadFromJob(job);
    setWizard({ allowForcePlan: false });
    router.push("/jobs/new/step-1-category");
  };

  // 강제 진행 재실행 — fallback plan 적용 동의 후 confirm step으로 직행
  const handleForceRerun = () => {
    if (!job) return;
    const detail = `[${job.error_code}] ${job.error_message}\n\n` +
      "현재 환경에 맞는 표준 플랜 규칙이 없습니다.\n" +
      "최소 안전 fallback plan으로 강제 진행합니다.\n" +
      "(QLoRA + int4 + 보수적 batch/seq, 학습 결과 보장 안 됨)\n\n" +
      "계속하시겠습니까?";
    if (!confirm(detail)) return;
    loadFromJob(job);
    setWizard({ allowForcePlan: true });
    router.push("/jobs/new/step-5-confirm");
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
                <div className="text-sm text-destructive mt-2 space-y-1">
                  <p className="font-medium">[{job.error_code}] {job.error_message}</p>
                  {canForce && (
                    <p className="text-xs text-muted-foreground">
                      현재 HW(GPU/RAM)에 맞는 표준 규칙이 없습니다. 우측 "강제 진행 재실행" 버튼으로 fallback plan 적용 가능.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {canDownloadRaw && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadRaw}
                  className="gap-2"
                  title="Stage 5 수집된 원시 JSONL 다운로드"
                >
                  <FileDown className="h-4 w-4" /> 수집 데이터
                </Button>
              )}
              {isRunning && (
                <Button variant="destructive" size="sm" onClick={() => cancel.mutate()} className="gap-2">
                  <XCircle className="h-4 w-4" /> 취소
                </Button>
              )}
              {isRunning && (
                <>
                  {isStuck && (
                    <Badge variant="destructive" className="self-center">
                      멈춤 감지 · {stuckMinutes}분 무이벤트
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant={isStuck ? "default" : "outline"}
                    onClick={handleAdvance}
                    disabled={advance.isPending}
                    className="gap-2"
                    title={
                      isStuck
                        ? `마지막 이벤트 ${stuckMinutes}분 전 — 현재 stage 스킵`
                        : "현재 stage 강제 스킵 → 다음 stage 재실행"
                    }
                  >
                    <SkipForward className="h-4 w-4" /> 작업 계속
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFinalize}
                    disabled={finalize.isPending}
                    className="gap-2"
                    title="현재 산출물로 DONE 처리 (평가/패키징 스킵)"
                  >
                    <FastForward className="h-4 w-4" /> 조기 종료
                  </Button>
                </>
              )}
              {(isFailed || isCancelled) && (
                <Button size="sm" onClick={handleRerun} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> 수정 후 재실행
                </Button>
              )}
              {canForce && (
                <Button variant="outline" size="sm" onClick={handleForceRerun} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> 강제 진행 재실행
                </Button>
              )}
              {isFailed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNotifyAdmin}
                  disabled={notify.isPending}
                  className="gap-2"
                  title={isEnvError ? "환경 패키지 미설치 — 관리자가 자동 설치 가능" : "관리자에게 에러 전송"}
                >
                  📩 관리자에게 알림
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
        <ProgressStream
          jobId={jobId}
          initialStage={job?.current_stage || 0}
          initialEvents={job?.events || []}
          liveStream={isRunning}
        />

        {/* HF Hub 업로드 (DONE 상태만) */}
        {isDone && <HFUploadCard jobId={jobId} />}

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
