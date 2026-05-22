import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    price: "₩0",
    features: ["월 3개 잡", "최대 7B 모델", "데이터 5MB 제한", "커뮤니티 지원"],
    cta: "시작하기",
    href: "/signup",
  },
  {
    name: "Pro",
    price: "₩49,000/월",
    features: ["월 20개 잡", "13B 모델까지", "데이터 1GB", "이메일 지원", "Gradio Playground"],
    cta: "Pro 시작",
    href: "/signup?plan=pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "문의",
    features: ["무제한 잡", "70B 모델", "전용 GPU", "SLA + 전담 지원", "온프레미스"],
    cta: "문의하기",
    href: "/contact",
  },
];

export default function PricingPage() {
  return (
    <div className="container py-16 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2 text-center">요금</h1>
      <p className="text-center text-muted-foreground mb-12">
        프로젝트 규모에 맞는 플랜을 선택하세요.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((t) => (
          <Card key={t.name} className={t.highlight ? "border-primary ring-2 ring-primary/20" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{t.name}</CardTitle>
                {t.highlight && <Badge>추천</Badge>}
              </div>
              <p className="text-2xl font-bold mt-2">{t.price}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link href={t.href} className="w-full">
                <Button variant={t.highlight ? "default" : "outline"} className="w-full">
                  {t.cta}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
