"use client";

/**
 * Gradio Playground iframe 임베드.
 *
 * Stage 9 완료 후 ml-worker가 잡별 Gradio 프로세스를 띄우고
 * /api/playground/{job_id} 프록시로 노출. 본 페이지는 단순 iframe 컨테이너.
 */
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";

export default function PlaygroundPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const gradioUrl = `${process.env.NEXT_PUBLIC_GRADIO_BASE_URL || "http://localhost:7860"}?job_id=${jobId}`;

  return (
    <>
      <Header title="추론 시연" subtitle="학습 완료 모델 즉시 테스트" />
      <div className="p-6 space-y-4">
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <iframe
              src={gradioUrl}
              title={`Gradio playground for job ${jobId}`}
              className="w-full"
              style={{ height: "calc(100vh - 200px)", border: 0 }}
              allow="clipboard-write"
            />
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Playground 프로세스는 60분 유휴 시 자동 종료됩니다. 다시 사용하려면 페이지를 새로고침하세요.
        </p>
      </div>
    </>
  );
}
