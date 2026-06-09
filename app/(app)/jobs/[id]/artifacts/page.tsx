"use client";

/**
 * 잡 아티팩트 다운로드 페이지.
 *
 * Stage 9 패키징 결과(adapter / model_card / zip 등)를 표시 + 다운로드.
 * 추가: 파인튜닝 완료 모델을 다른 포맷(gguf/mlx/pytorch/onnx/merged)으로
 *       on-demand 변환 후 다운로드.
 */
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { formatBytes, relativeTime } from "@/lib/utils";
import type { ConvertFormat, FormatStatus } from "@/types/api";

const KIND_LABELS: Record<string, string> = {
  adapter: "LoRA 어댑터",
  merged: "병합 weights (safetensors)",
  gguf: "GGUF (llama.cpp/Ollama)",
  mlx: "MLX (Apple Silicon)",
  pytorch: "PyTorch (.bin)",
  onnx: "ONNX",
  zip: "전체 ZIP",
  model_card: "Model Card (.md)",
};

const CONVERT_LABELS: Record<ConvertFormat, string> = {
  merged: "병합 weights (safetensors)",
  gguf: "GGUF (llama.cpp/Ollama)",
  mlx: "MLX (Apple Silicon)",
  pytorch: "PyTorch (.bin)",
  onnx: "ONNX",
};

const GGUF_QUANTS = ["Q4_K_M", "Q5_K_M", "Q6_K", "q8_0", "f16"];

export default function ArtifactsPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const { data: job, isLoading, refetch: refetchJob } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId),
  });

  const [busyKind, setBusyKind] = useState<string | null>(null);
  const onDownload = async (kind: string) => {
    setBusyKind(kind);
    try {
      await api.downloadArtifact(jobId, kind);
    } catch (e) {
      alert(`다운로드 실패: ${(e as Error).message}`);
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <>
      <Header title="아티팩트" subtitle="학습 완료 모델 다운로드 · 포맷 변환" />

      <div className="p-6 max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">생성된 아티팩트</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">로딩 중...</p>
            ) : !job || job.artifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">아직 아티팩트가 없습니다. 학습 완료 후 표시됩니다.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>종류</TableHead>
                    <TableHead>크기</TableHead>
                    <TableHead>SHA256</TableHead>
                    <TableHead>생성</TableHead>
                    <TableHead className="text-right">다운로드</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {job.artifacts.map((a) => (
                    <TableRow key={a.uri}>
                      <TableCell>
                        <Badge variant="outline">{KIND_LABELS[a.kind] || a.kind}</Badge>
                      </TableCell>
                      <TableCell>{formatBytes(a.size_bytes)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {a.sha256 ? a.sha256.slice(0, 12) + "..." : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {a.created_at ? relativeTime(a.created_at) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => onDownload(a.kind)}
                          disabled={busyKind === a.kind}
                        >
                          <Download className="h-4 w-4" />
                          {busyKind === a.kind ? "받는 중..." : "다운로드"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ConvertPanel jobId={jobId} onConverted={() => refetchJob()} />
      </div>
    </>
  );
}

function ConvertPanel({ jobId, onConverted }: { jobId: string; onConverted: () => void }) {
  const [quant, setQuant] = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["convertStatus", jobId],
    queryFn: () => api.convertStatus(jobId),
    // 변환 진행 중이면 자동 폴링
    refetchInterval: (q) => {
      const d = q.state.data;
      return d && d.formats.some((f) => f.state === "running") ? 2500 : false;
    },
  });

  const trigger = useMutation({
    mutationFn: ({ format, q }: { format: string; q: string }) =>
      api.convertArtifact(jobId, format, q),
    onSuccess: (res) => {
      if (["tooling_missing", "not_done", "error"].includes(res.status)) {
        alert(`${res.status}: ${res.detail}`);
      }
      refetch();
    },
    onError: (e) => alert(`변환 요청 실패: ${(e as Error).message}`),
  });

  const onDownload = async (format: string) => {
    try {
      await api.downloadArtifact(jobId, format);
      onConverted();
    } catch (e) {
      alert(`다운로드 실패: ${(e as Error).message}`);
    }
  };

  if (!isLoading && data && !data.job_done) {
    return null; // 잡 미완료 — 변환 패널 숨김
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">변환 후 다운로드</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            병합·GGUF·MLX·PyTorch·ONNX 포맷으로 변환합니다. 도구가 설치된 포맷만 활성화됩니다.
          </p>
        </div>
        <Button size="sm" variant="ghost" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> 새로고침
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">상태를 불러올 수 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {data.formats.map((f) => (
              <FormatRow
                key={f.format}
                f={f}
                quant={quant[f.format] ?? "Q4_K_M"}
                onQuant={(v) => setQuant((s) => ({ ...s, [f.format]: v }))}
                busy={trigger.isPending}
                onConvert={() => trigger.mutate({ format: f.format, q: quant[f.format] ?? "Q4_K_M" })}
                onDownload={() => onDownload(f.format)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FormatRow({
  f, quant, onQuant, busy, onConvert, onDownload,
}: {
  f: FormatStatus;
  quant: string;
  onQuant: (v: string) => void;
  busy: boolean;
  onConvert: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{CONVERT_LABELS[f.format]}</span>
          {!f.available && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
              <AlertTriangle className="h-3 w-3" /> 도구 미설치
            </Badge>
          )}
          {f.state === "done" && <Badge variant="secondary">변환 완료</Badge>}
          {f.state === "running" && <Badge variant="secondary">변환 중...</Badge>}
          {f.state === "error" && <Badge variant="destructive">실패</Badge>}
        </div>
        {!f.available && f.hint && (
          <p className="text-xs text-muted-foreground mt-1">{f.hint}</p>
        )}
        {f.state === "error" && f.error && (
          <p className="text-xs text-destructive mt-1 truncate">{f.error}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {f.format === "gguf" && f.available && f.state !== "done" && (
          <select
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={quant}
            onChange={(e) => onQuant(e.target.value)}
            disabled={f.state === "running" || busy}
          >
            {GGUF_QUANTS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        )}

        {f.state === "done" ? (
          <Button size="sm" className="gap-2" onClick={onDownload}>
            <Download className="h-4 w-4" /> 다운로드
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onConvert}
            disabled={!f.available || f.state === "running" || busy}
          >
            {f.state === "running" ? "변환 중..." : f.state === "error" ? "재시도" : "변환"}
          </Button>
        )}
      </div>
    </div>
  );
}
