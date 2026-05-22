/**
 * 잡 생성 위자드 공통 layout.
 * 상단 stepper + 본문 + 좌우 네비 버튼은 각 step 페이지에서 처리.
 */
import { Header } from "@/components/layout/header";
import { WizardStepper } from "@/components/jobs/wizard-stepper";

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header title="새 잡 생성" subtitle="5단계 위자드를 따라 파인튜닝 설정 완료" />

      <div className="p-6 space-y-6 max-w-5xl">
        <WizardStepper />
        <div>{children}</div>
      </div>
    </>
  );
}
