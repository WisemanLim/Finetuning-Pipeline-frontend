"use client";

/**
 * 잡 아티팩트 다운로드 페이지.
 *
 * Stage 9 패키징 결과(adapter / model_card / zip / gguf 등)를 표시.
 * URI는 서버에서 presigned URL로 제공해야 한다 (현재 데모는 직접 경로).
 */
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { formatBytes, relativeTime } from "@/lib/utils";

const KIND_LABELS: Record<string, string> = {
  adapter: "LoRA 어댑터",
  merged: "병합 weights",
  gguf: "GGUF (llama.cpp)",
  zip: "전체 ZIP",
  model_card: "Model Card (.md)",
};

export default function ArtifactsPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const { data: job, isLoading } = useQuery({
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
      <Header title="아티팩트" subtitle="학습 완료 모델 다운로드" />

      <div className="p-6 max-w-5xl">
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
      </div>
    </>
  );
}
