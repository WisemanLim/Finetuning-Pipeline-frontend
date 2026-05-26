"use client";

/**
 * 추론 시연 (Playground) — 학습 완료 모델 즉시 테스트.
 *
 * 구현 옵션:
 *   1. 외부 Gradio 프로세스 (NEXT_PUBLIC_GRADIO_BASE_URL — 별도 spawn 필요)
 *   2. 인라인 추론 — 워커 API 통해 텍스트 in/out (간단, 의존성 없음)
 *
 * Gradio 미기동 시 fallback으로 안내 + 다운로드 페이지 링크.
 */
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PlaygroundPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const gradioBase = process.env.NEXT_PUBLIC_GRADIO_BASE_URL || "";
  const gradioUrl = gradioBase ? `${gradioBase}?job_id=${jobId}` : "";

  const [gradioOk, setGradioOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!gradioUrl) {
      setGradioOk(false);
      return;
    }
    // HEAD 요청으로 Gradio 살아있는지 확인 (CORS 영향 받음 — opaque OK)
    fetch(gradioUrl, { method: "HEAD", mode: "no-cors" })
      .then(() => setGradioOk(true))
      .catch(() => setGradioOk(false));
  }, [gradioUrl]);

  if (gradioOk === null) {
    return (
      <>
        <Header title="추론 시연" subtitle="Playground 연결 확인 중..." />
        <div className="p-6">
          <p className="text-sm text-muted-foreground">Gradio 서비스 확인 중...</p>
        </div>
      </>
    );
  }

  if (gradioOk && gradioUrl) {
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
        </div>
      </>
    );
  }

  // Fallback — Gradio 미기동
  return (
    <>
      <Header title="추론 시연" subtitle="Gradio Playground 미기동" />
      <div className="p-6 max-w-3xl">
        <Card className="border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10">
          <CardHeader>
            <CardTitle className="text-base">⚠ Playground 사용 불가</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Gradio Playground 서비스가 실행되고 있지 않습니다. 학습된 모델은 정상이며,
              다운로드 후 직접 추론하거나 HuggingFace Hub에 업로드하여 사용 가능합니다.
            </p>
            <div className="space-y-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-md font-mono">
              <p># 직접 추론 (워커 venv)</p>
              <p>cd Finetuning-Pipeline-worker</p>
              <p>.venv/bin/python -c &quot;
{`\n  from peft import PeftModel\n  from transformers import AutoModelForCausalLM, AutoTokenizer\n  base = '<원본 model_hf_repo>'\n  adapter = '~/.wfp/jobs/${jobId}/adapter'\n  m = PeftModel.from_pretrained(AutoModelForCausalLM.from_pretrained(base), adapter)\n  tok = AutoTokenizer.from_pretrained(base)\n  # tok/m로 generate 사용`}
&quot;</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Link href={`/jobs/${jobId}/artifacts`}>
                <Button size="sm" variant="outline">⬇ 모델 다운로드</Button>
              </Link>
              <Link href={`/jobs/${jobId}`}>
                <Button size="sm" variant="outline">잡 상세로 돌아가기</Button>
              </Link>
            </div>
            <p className="text-[10px] text-muted-foreground pt-2 border-t">
              Gradio 자동 spawn 기능은 PRD §11 향후 작업. 임시로 다운로드 → HF 업로드 →
              HF Inference Endpoint 사용 권장.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
