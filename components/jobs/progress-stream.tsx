"use client";

/**
 * WebSocket 진행 스트림 표시 — 9-stage 진행률 + 실시간 로그.
 *
 * /api/worker/ws/{job_id} 직접 연결.
 * 이벤트는 zustand 없이 로컬 state로 (단일 페이지 사용).
 *
 * 전체 progress bar 는 stage + stage 내 sub-progress 가중치 반영.
 * Stage 7 학습의 step-level 진행은 세부 로그 영역 상단에
 * tqdm 스타일 라인으로 추가 렌더(병행 표시).
 */
import { useEffect, useRef, useState } from "react";
import { JobProgressWS } from "@/lib/ws";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { ProgressEvent } from "@/types/api";

const STAGE_LABELS = [
  "대기",
  "1. 목표 정의",
  "2. HW 프로빙",
  "3. 환경 검사",
  "4. 모델 다운로드",
  "5. 데이터 수집·정제",
  "6. 학습 설정",
  "7. 학습 실행",
  "8. 평가",
  "9. 패키징",
];

interface Props {
  jobId: string;
  initialStage?: number;
  /** 서버 저장 이벤트 (FAILED/완료 잡의 과거 로그) — 문자열 메시지 배열 */
  initialEvents?: string[];
  /** WS 연결 시도 여부. false면 과거 이벤트만 표시 (FAILED/DONE 잡). */
  liveStream?: boolean;
}

interface TrainInfo {
  step: number;
  total: number;
  pct: number;        // 0~1
  startedAt: number;  // ms epoch — 첫 step 이벤트 시각
  lastUpdate: number; // ms epoch — 최신 step 이벤트 시각
}

/** mm:ss 또는 hh:mm:ss 포맷. */
function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "??:??";
  const t = Math.floor(sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** tqdm 스타일 바 — █ + ▌ (half-block) 로 width 칸 채움. */
function makeBar(pct: number, width = 20): string {
  const clamped = Math.min(1, Math.max(0, pct));
  const filled = clamped * width;
  const full = Math.floor(filled);
  const half = filled - full >= 0.5 ? "▌" : "";
  const emptyLen = Math.max(0, width - full - (half ? 1 : 0));
  return "█".repeat(full) + half + " ".repeat(emptyLen);
}

export function ProgressStream({
  jobId,
  initialStage = 0,
  initialEvents = [],
  liveStream = true,
}: Props) {
  const [stage, setStage] = useState(initialStage);
  // 과거 이벤트는 msg만 있는 형태로 변환해 logs와 통합 렌더링
  const [logs, setLogs] = useState<ProgressEvent[]>(() =>
    initialEvents.map((m) => ({ job_id: jobId, msg: m, extra: {} })),
  );
  const [connected, setConnected] = useState(false);
  const [stageProgress, setStageProgress] = useState(0); // 0~1 within current stage
  const [trainInfo, setTrainInfo] = useState<TrainInfo | null>(null);
  const wsRef = useRef<JobProgressWS | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 새 잡 페이지 / liveStream 토글 시 초기 상태 동기화
  useEffect(() => {
    setLogs(initialEvents.map((m) => ({ job_id: jobId, msg: m, extra: {} })));
    setTrainInfo(null);
  }, [jobId, initialEvents]);

  useEffect(() => {
    if (!liveStream) return;  // FAILED/DONE이면 WS 연결 안 함
    const ws = new JobProgressWS(jobId, {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (ev) => {
        if (typeof ev.extra?.stage === "number") {
          setStage((prev) => {
            if (prev !== ev.extra!.stage) {
              setTrainInfo(null);  // stage 전환 시 tqdm 리셋
            }
            return ev.extra!.stage as number;
          });
          setStageProgress(0);  // 새 stage 진입 시 sub-progress 초기화
        }
        // Stage 7 학습 중 sub-progress (0~1) 갱신
        const sp = ev.extra?.stage_progress;
        if (typeof sp === "number" && sp >= 0 && sp <= 1) {
          setStageProgress(sp);
        }
        // Stage 7 step-level 진행 정보 갱신 (tqdm 라인용)
        const step = ev.extra?.step;
        const total = ev.extra?.total_steps;
        if (typeof step === "number" && typeof total === "number" && total > 0) {
          setTrainInfo((prev) => {
            const now = Date.now();
            return {
              step,
              total,
              pct: step / total,
              startedAt: prev?.startedAt ?? now,
              lastUpdate: now,
            };
          });
        }
        setLogs((prev) => [...prev.slice(-199), ev]); // 최근 200개
      },
      reconnectMs: 3000,
    });
    ws.connect();
    wsRef.current = ws;
    return () => ws.close();
  }, [jobId, liveStream]);

  // 새 로그 도착 시 자동 스크롤
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // 전체 진행률 — stage 기반 + 현재 stage 내 sub-progress 가중치 적용
  const progressPct = Math.round(((stage + stageProgress) / 9) * 100);

  // tqdm 스타일 라인 (Stage 7 학습 / Stage 8 평가 추론 진행 시 표시)
  let tqdmLine: string | null = null;
  if ((stage === 7 || stage === 8) && trainInfo && trainInfo.total > 0) {
    const { step, total, pct, startedAt, lastUpdate } = trainInfo;
    const elapsedSec = Math.max(0, (lastUpdate - startedAt) / 1000);
    const rate = step > 0 && elapsedSec > 0 ? step / elapsedSec : 0; // it/s
    const remaining = Math.max(0, total - step);
    const etaSec = rate > 0 ? remaining / rate : Number.POSITIVE_INFINITY;
    const pctStr = String(Math.floor(pct * 100)).padStart(3);
    const rateStr =
      rate > 0
        ? rate >= 1
          ? `${rate.toFixed(2)}it/s`
          : `${(1 / rate).toFixed(2)}s/it`
        : "?it/s";
    tqdmLine = `${pctStr}%|${makeBar(pct)}| ${step}/${total} [${fmtTime(elapsedSec)}<${fmtTime(etaSec)}, ${rateStr}]`;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">실시간 진행 상황</CardTitle>
          <Badge variant={connected ? "success" : "secondary"}>
            {connected ? "● 연결됨" : "○ 끊김"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">
              {STAGE_LABELS[Math.min(stage, 9)]}
              {stage === 7 && stageProgress > 0 && stageProgress < 1 && (
                <span className="text-muted-foreground ml-2 font-normal">
                  ({Math.round(stageProgress * 100)}%)
                </span>
              )}
            </span>
            <span className="text-muted-foreground">{progressPct}%</span>
          </div>
          <Progress value={progressPct} />
        </div>

        <div className="border rounded-md bg-muted/30 p-3 h-64 overflow-y-auto font-mono text-xs space-y-1">
          {tqdmLine && (
            <div className="sticky top-0 -mx-3 px-3 py-2 mb-2 bg-background/95 backdrop-blur border-b border-border whitespace-pre text-emerald-700 dark:text-emerald-400">
              {tqdmLine}
            </div>
          )}
          {logs.length === 0 && (
            <p className="text-muted-foreground italic">
              {liveStream ? "이벤트 대기 중..." : "저장된 이벤트 없음"}
            </p>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground shrink-0">
                [{log.extra?.stage ?? "?"}]
              </span>
              <span>{log.msg}</span>
              {typeof log.extra?.loss === "number" && (
                <span className="text-blue-600 ml-auto shrink-0">
                  loss={log.extra.loss.toFixed(4)}
                </span>
              )}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </CardContent>
    </Card>
  );
}
