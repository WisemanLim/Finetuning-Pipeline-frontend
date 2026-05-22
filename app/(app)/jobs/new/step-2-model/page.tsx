"use client";

/**
 * Step 2 — 모델 선택.
 *
 * 자동 / 수동 모드 전환.
 * 카탈로그는 ml-worker에 별도 엔드포인트 추가 필요 (현재는 클라이언트 더미).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Sparkles, Hand } from "lucide-react";
import { ModelCard } from "@/components/jobs/model-card";
import { useWizard } from "@/lib/store";
import { api } from "@/lib/api";
import type { ModelCard as ModelCardType } from "@/types/api";

/** 데모용 후보 — 운영 시 GET /api/worker/models?section=J 로 대체 */
const FALLBACK_MODELS: ModelCardType[] = [
  { hf_repo: "Qwen/Qwen2.5-Coder-7B-Instruct", params_b: 7.0, language: ["ko", "en", "zh"], license: "apache-2.0", hw_min_vram_gb: 6.0, tags: ["code", "ko"] },
  { hf_repo: "Qwen/Qwen2-7B-Instruct", params_b: 7.0, language: ["ko", "en", "zh"], license: "apache-2.0", hw_min_vram_gb: 6.0, tags: ["general", "ko"] },
  { hf_repo: "meta-llama/Llama-3-8B-Instruct", params_b: 8.0, language: ["ko", "en"], license: "llama3", hw_min_vram_gb: 6.0, tags: ["general"] },
  { hf_repo: "google/gemma-2-9b-it", params_b: 9.0, language: ["en"], license: "gemma", hw_min_vram_gb: 8.0, tags: ["general"] },
  { hf_repo: "Qwen/Qwen2-1.5B-Instruct", params_b: 1.5, language: ["ko", "en", "zh"], license: "apache-2.0", hw_min_vram_gb: 2.0, tags: ["small", "ko"] },
];

export default function Step2ModelPage() {
  const router = useRouter();
  const wizard = useWizard();
  const [auto, setAuto] = useState(wizard.modelAuto);
  const [manualRepo, setManualRepo] = useState(wizard.modelHfRepo);
  const [selectedRepo, setSelectedRepo] = useState(wizard.modelHfRepo);

  const { data: caps } = useQuery({ queryKey: ["hwCaps"], queryFn: api.hwCaps });

  const candidates = FALLBACK_MODELS.filter(
    (m) => !caps || caps.max_vram_gb === 0 || m.hw_min_vram_gb <= caps.max_vram_gb,
  );

  const handleNext = () => {
    wizard.set({
      modelAuto: auto,
      modelHfRepo: auto ? candidates[0]?.hf_repo || "" : (selectedRepo || manualRepo),
    });
    router.push("/jobs/new/step-3-data");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">모델 선택 방식</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button
            variant={auto ? "default" : "outline"}
            onClick={() => setAuto(true)}
            className="h-auto p-4 flex-col items-start gap-1"
          >
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" /> 자동 선택
            </div>
            <p className="text-xs opacity-80">HW + 카테고리 기반 1순위 모델 자동 채택</p>
          </Button>
          <Button
            variant={!auto ? "default" : "outline"}
            onClick={() => setAuto(false)}
            className="h-auto p-4 flex-col items-start gap-1"
          >
            <div className="flex items-center gap-2 font-semibold">
              <Hand className="h-4 w-4" /> 수동 선택
            </div>
            <p className="text-xs opacity-80">후보 중 직접 선택 또는 HF repo 직접 입력</p>
          </Button>
        </CardContent>
      </Card>

      {!auto && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">후보 모델 (HW 적합도 순)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {candidates.map((m) => (
                <ModelCard
                  key={m.hf_repo}
                  model={m}
                  selected={selectedRepo === m.hf_repo}
                  maxVramGb={caps?.max_vram_gb}
                  onSelect={(repo) => {
                    setSelectedRepo(repo);
                    setManualRepo("");
                  }}
                />
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="manual">또는 HuggingFace repo 직접 입력</Label>
              <Input
                id="manual"
                value={manualRepo}
                onChange={(e) => {
                  setManualRepo(e.target.value);
                  setSelectedRepo("");
                }}
                placeholder="예: meta-llama/Llama-3-8B-Instruct"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {auto && candidates[0] && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">자동 선택 결과 (1순위)</CardTitle>
          </CardHeader>
          <CardContent>
            <ModelCard model={candidates[0]} selected maxVramGb={caps?.max_vram_gb} />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Link href="/jobs/new/step-1-category">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> 이전
          </Button>
        </Link>
        <Button onClick={handleNext} className="gap-2">
          다음 <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
