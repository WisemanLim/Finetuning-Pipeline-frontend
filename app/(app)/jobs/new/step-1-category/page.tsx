"use client";

/**
 * Step 1 — 분야 선택.
 *
 * KSIC 21개 대분류 카드 그리드 + 태스크 타입 + 설명.
 * 검증: ksic_section, task_type, description(10자 이상) 필수.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { KSIC_SECTIONS, TASK_TYPES, type TaskType } from "@/lib/ksic";
import { CategoryCard } from "@/components/jobs/category-card";
import { useWizard } from "@/lib/store";

export default function Step1CategoryPage() {
  const router = useRouter();
  const wizard = useWizard();
  const [section, setSection] = useState(wizard.ksicSection);
  const [taskType, setTaskType] = useState<TaskType>(wizard.taskType);
  const [description, setDescription] = useState(wizard.description);

  const canProceed = section && description.length >= 10;

  const handleNext = () => {
    wizard.set({ ksicSection: section, taskType, description });
    router.push("/jobs/new/step-2-model");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">분야(업종) 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {KSIC_SECTIONS.map((s) => (
              <CategoryCard
                key={s.code}
                section={s}
                selected={section === s.code}
                onSelect={setSection}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">태스크 및 설명</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>태스크 타입</Label>
            <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label} — <span className="text-muted-foreground">{t.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">모델 용도 설명 (최소 10자)</Label>
            <Textarea
              id="desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 우리 회사 사내 매뉴얼을 학습하여 신입사원 온보딩을 돕는 AI 어시스턴트를 만들고 싶습니다."
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/10자 이상
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!canProceed} className="gap-2">
          다음 <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
