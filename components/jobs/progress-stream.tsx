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
}

export function ProgressStream({ jobId, initialStage = 0 }: Props) {
  const [stage, setStage] = useState(initialStage);
  const [logs, setLogs] = useState<ProgressEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<JobProgressWS | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new JobProgressWS(jobId, {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (ev) => {
        if (typeof ev.extra?.stage === "number") setStage(ev.extra.stage);
        setLogs((prev) => [...prev.slice(-99), ev]); // 최근 100개 유지
      },
      reconnectMs: 3000,
    });
    ws.connect();
    wsRef.current = ws;
    return () => ws.close();
  }, [jobId]);

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

        <div className="border rounded-md bg-muted/30 p-3 h-64 overflow-y-auto font-mono text-xs space-y-1">
          {logs.length === 0 && (
            <p className="text-muted-foreground italic">이벤트 대기 중...</p>
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
