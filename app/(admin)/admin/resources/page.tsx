"use client";

/** GPU·디스크 점유율 + 큐 길이 모니터링. */
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const MOCK_GPUS = [
  { uuid: "gpu-0", name: "RTX 4090", util: 87, vram: 22.1, vramMax: 24, job: "abc123" },
  { uuid: "gpu-1", name: "RTX 4090", util: 12, vram: 1.2, vramMax: 24, job: null },
];

export default function AdminResourcesPage() {
  return (
    <>
      <Header title="리소스 모니터링" subtitle="GPU · 디스크 · 큐 상태" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_GPUS.map((g) => (
            <Card key={g.uuid}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <span className="text-xs text-muted-foreground font-mono">{g.uuid}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>GPU 사용률</span>
                    <span className="font-medium">{g.util}%</span>
                  </div>
                  <Progress value={g.util} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>VRAM</span>
                    <span className="font-medium">{g.vram} / {g.vramMax} GB</span>
                  </div>
                  <Progress value={(g.vram / g.vramMax) * 100} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {g.job ? `점유 잡: ${g.job}` : "유휴"}
                  </span>
                  {g.job && (
                    <Button size="sm" variant="outline" className="gap-2">
                      <Trash2 className="h-3 w-3" /> 회수
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">잡 큐 / Reaper</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">대기 중</p>
              <p className="text-2xl font-bold">3</p>
            </div>
            <div>
              <p className="text-muted-foreground">평균 대기</p>
              <p className="text-2xl font-bold">12s</p>
            </div>
            <div>
              <p className="text-muted-foreground">평균 학습</p>
              <p className="text-2xl font-bold">1.4h</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
