"use client";

/**
 * WebSocket 진행 스트림 표시 — 9-stage 진행률 + 실시간 로그.
 *
 * /api/worker/ws/{job_id} 직접 연결.
 * 이벤트는 zustand 없이 로컬 state로 (단일 페이지 사용).
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
  const wsRef = useRef<JobProgressWS | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 새 잡 페이지 / liveStream 토글 시 초기 이벤트 동기화
  useEffect(() => {
    setLogs(initialEvents.map((m) => ({ job_id: jobId, msg: m, extra: {} })));
  }, [jobId, initialEvents]);

  useEffect(() => {
    if (!liveStream) return;  // FAILED/DONE이면 WS 연결 안 함
    const ws = new JobProgressWS(jobId, {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (ev) => {
        if (typeof ev.extra?.stage === "number") setStage(ev.extra.stage);
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

  const progressPct = Math.round((stage / 9) * 100);

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
            <span className="font-medium">{STAGE_LABELS[Math.min(stage, 9)]}</span>
            <span className="text-muted-foreground">{progressPct}%</span>
          </div>
          <Progress value={progressPct} />
        </div>

        <div className="border rounded-md bg-muted/30 p-3 h-96 overflow-y-auto font-mono text-xs space-y-1">
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
              {log.extra?.loss !== undefined && (
                <span className="text-blue-600 ml-auto shrink-0">
                  loss={(log.extra.loss as number).toFixed(4)}
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
