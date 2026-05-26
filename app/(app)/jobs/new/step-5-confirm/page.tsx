"use client";

/**
 * Step 5 — 실행 확인.
 *
 * 위자드 전체 데이터 요약 후 POST /api/worker/jobs.
 * 성공 시 모니터링 페이지로 이동.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Rocket, AlertTriangle } from "lucide-react";
import { useWizard } from "@/lib/store";
import { api } from "@/lib/api";
import { KSIC_SECTIONS } from "@/lib/ksic";

export default function Step5ConfirmPage() {
  const router = useRouter();
  const wizard = useWizard();
  const sectionInfo = KSIC_SECTIONS.find((s) => s.code === wizard.ksicSection);

  const mutation = useMutation({
    mutationFn: () =>
      api.createJob({
        ksic_section: wizard.ksicSection,
        ksic_division: wizard.ksicDivision,
        task_type: wizard.taskType,
        description: wizard.description,
        language: wizard.language,
        model_hf_repo: wizard.modelAuto ? "" : wizard.modelHfRepo,
        data_source_mode: wizard.dataSourceMode,
        data_source_path: wizard.dataSourcePath,
        keywords: wizard.keywords,
        train_override: wizard.useAdvanced ? wizard.trainOverride : {},
        allow_force_plan: wizard.allowForcePlan,
      }),
    onSuccess: (data) => {
      wizard.reset();
      router.push(`/jobs/${data.job_id}`);
    },
  });

  return (
    <div className="space-y-6">
      {wizard.allowForcePlan && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-destructive">⚠ 강제 진행 모드</p>
            <p className="text-xs text-muted-foreground mt-1">
              HW 규칙 매칭 실패로 fallback plan(보수적 QLoRA + int4) 적용. 학습 결과 보장 안 됨.
              표준 진행을 원하면 이전 단계로 돌아가 설정을 조정하거나 해당 모드를 끄세요.
            </p>
            <button
              type="button"
              className="text-xs underline text-muted-foreground mt-2"
              onClick={() => wizard.set({ allowForcePlan: false })}
            >
              강제 진행 모드 끄기
            </button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">최종 확인</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">분야</dt>
              <dd className="font-medium">
                <Badge variant="outline" className="font-mono mr-2">{wizard.ksicSection}</Badge>
                {sectionInfo?.koName}
              </dd>
            </div>
            <div className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">태스크</dt>
              <dd className="font-medium">{wizard.taskType}</dd>
            </div>
            <div className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">언어</dt>
              <dd className="font-medium">{wizard.language}</dd>
            </div>
            <div className="border-b pb-2">
              <dt className="text-muted-foreground mb-1">설명</dt>
              <dd className="text-sm">{wizard.description}</dd>
            </div>
            <div className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">모델</dt>
              <dd className="font-medium font-mono text-xs">
                {wizard.modelAuto ? "자동 선택" : wizard.modelHfRepo}
              </dd>
            </div>
            <div className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">데이터</dt>
              <dd className="font-medium">
                {wizard.dataSourceMode}
                {wizard.dataSourcePath && <span className="text-xs text-muted-foreground ml-2">({wizard.dataSourcePath})</span>}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">학습 설정</dt>
              <dd className="font-medium">{wizard.useAdvanced ? "사용자 오버라이드" : "권장값"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {mutation.isError && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">잡 생성 실패</p>
                <p className="text-muted-foreground mt-1">
                  {(mutation.error as Error).message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Link href="/jobs/new/step-4-config">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> 이전
          </Button>
        </Link>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          size="lg"
          className="gap-2"
        >
          <Rocket className="h-4 w-4" />
          {mutation.isPending ? "잡 생성 중..." : "파인튜닝 시작"}
        </Button>
      </div>
    </div>
  );
}
