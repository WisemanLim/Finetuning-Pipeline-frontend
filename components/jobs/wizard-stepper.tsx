"use client";

/**
 * 5-step 위자드 진행 표시기.
 * 각 step은 클릭 가능하며 (이전 step만), 현재 step은 강조.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { num: 1, label: "분야 선택", href: "/jobs/new/step-1-category" },
  { num: 2, label: "모델 선택", href: "/jobs/new/step-2-model" },
  { num: 3, label: "데이터 선택", href: "/jobs/new/step-3-data" },
  { num: 4, label: "학습 설정", href: "/jobs/new/step-4-config" },
  { num: 5, label: "실행 확인", href: "/jobs/new/step-5-confirm" },
];

export function WizardStepper() {
  const pathname = usePathname();
  const currentStep = STEPS.findIndex((s) => pathname?.includes(s.href.split("/").pop() || ""));

  return (
    <nav className="border rounded-lg p-4 bg-card">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isPast = idx < currentStep;
          const isCurrent = idx === currentStep;
          const clickable = isPast || isCurrent;

          return (
            <li key={step.num} className="flex items-center flex-1">
              <Link
                href={clickable ? step.href : "#"}
                className={cn(
                  "flex items-center gap-2 group",
                  !clickable && "pointer-events-none opacity-40",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                    isPast && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isPast && !isCurrent && "bg-muted text-muted-foreground",
                  )}
                >
                  {isPast ? <Check className="h-4 w-4" /> : step.num}
                </div>
                <span className={cn("text-sm", isCurrent ? "font-semibold" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </Link>
              {idx < STEPS.length - 1 && (
                <div className={cn("h-px flex-1 mx-3", idx < currentStep ? "bg-primary" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
