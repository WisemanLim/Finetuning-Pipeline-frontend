/**
 * 랜딩 페이지 — 공개 영역.
 * KSIC 분야 선택 → 1-click 파인튜닝 가치 제안 노출.
 */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Zap, Layers, Shield } from "lucide-react";
import { MarketingNav } from "@/components/layout/marketing-nav";

const FEATURES = [
  {
    icon: Zap,
    title: "1-Click 자동화",
    desc: "분야 선택만으로 데이터 수집→정제→학습→평가→배포까지 자동 수행.",
  },
  {
    icon: Layers,
    title: "도메인 우선",
    desc: "KSIC 21개 대분류 기반 분야별 추천 모델 + 데이터 소스 프리셋.",
  },
  {
    icon: Shield,
    title: "HW 적응",
    desc: "GPU·CPU·Apple Silicon 자동 감지. 최적 학습 전략 자동 결정.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="container py-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">WFP</h1>
        <nav className="flex items-center gap-4">
          <MarketingNav />
        </nav>
      </header>

      <section className="container py-24 text-center max-w-3xl">
        <h2 className="text-5xl font-bold tracking-tight mb-6">
          분야 선택만으로<br />도메인 특화 LLM
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Wise Fine-tuning Pipeline. 데이터 수집·정제·학습·평가·패키징 전 과정을
          자동화하는 무코드 파인튜닝 플랫폼.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              무료로 시작 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/jobs/new/step-1-category">
            <Button size="lg" variant="outline">데모 보기</Button>
          </Link>
        </div>
      </section>

      <section className="container py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title}>
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <footer className="container py-10 border-t mt-20 text-sm text-muted-foreground">
        © 2026 Wise. Apache-2.0 / MIT licensed components.
      </footer>
    </div>
  );
}
