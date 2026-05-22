"use client";

/**
 * Step 4 — 학습 설정.
 *
 * 기본: 추천값 표시 + "고급" 토글 시 하이퍼파라미터 수동 입력.
 * 추천값은 ml-worker가 build() 시 자동 결정하므로 미리보기만.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Settings2 } from "lucide-react";
import { useWizard } from "@/lib/store";
import { api } from "@/lib/api";

export default function Step4ConfigPage() {
  const router = useRouter();
  const wizard = useWizard();
  const [useAdvanced, setUseAdvanced] = useState(wizard.useAdvanced);
  const [override, setOverride] = useState({
    num_epochs: wizard.trainOverride.num_epochs ?? 3,
    learning_rate: wizard.trainOverride.learning_rate ?? 2e-4,
    batch_size: wizard.trainOverride.batch_size ?? 1,
  });

  const { data: caps } = useQuery({ queryKey: ["hwCaps"], queryFn: api.hwCaps });

  const handleNext = () => {
    wizard.set({
      useAdvanced,
      trainOverride: useAdvanced ? override : {},
    });
    router.push("/jobs/new/step-5-confirm");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">권장 설정 (자동)</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">전략</dt>
              <dd className="font-medium">{caps && caps.max_vram_gb < 24 ? "QLoRA (4bit)" : "LoRA"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">백엔드</dt>
              <dd className="font-medium">{caps?.cuda_available ? "CUDA" : caps?.mps_available ? "MPS" : "CPU"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">max_seq_length</dt>
              <dd className="font-medium">2048</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">num_epochs</dt>
              <dd className="font-medium">3</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> 고급 사용자 모드
            </CardTitle>
            <Button
              size="sm"
              variant={useAdvanced ? "default" : "outline"}
              onClick={() => setUseAdvanced(!useAdvanced)}
            >
              {useAdvanced ? "활성" : "비활성"}
            </Button>
          </div>
        </CardHeader>
        {useAdvanced && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="epochs">num_epochs</Label>
              <Input
                id="epochs"
                type="number"
                min={1}
                max={20}
                value={override.num_epochs}
                onChange={(e) => setOverride({ ...override, num_epochs: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lr">learning_rate</Label>
              <Input
                id="lr"
                type="number"
                step={0.00001}
                value={override.learning_rate}
                onChange={(e) => setOverride({ ...override, learning_rate: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bs">batch_size</Label>
              <Input
                id="bs"
                type="number"
                min={1}
                max={64}
                value={override.batch_size}
                onChange={(e) => setOverride({ ...override, batch_size: Number(e.target.value) })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              알 수 없는 키는 자동 무시. 자세한 필드는 ml-worker TrainConfig 참고.
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">예상 리소스</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">예상 시간</dt>
              <dd className="font-medium">~1.5시간</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">VRAM 사용</dt>
              <dd className="font-medium">~6GB</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">디스크</dt>
              <dd className="font-medium">~10GB</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground mt-3">
            * 잡 생성 시 실제 추정값으로 갱신됩니다.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Link href="/jobs/new/step-3-data">
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
