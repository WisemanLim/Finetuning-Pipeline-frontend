"use client";

/** GPU·디스크 점유율 + 큐 길이 모니터링 — 실제 GET /admin/resources + /admin/stats. */
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

export default function AdminResourcesPage() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["admin", "resources"],
    queryFn: () => api.admin.resources(),
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.admin.stats(),
    refetchInterval: 5000,
  });

  const fmtSec = (n: number | null | undefined) => {
    if (n == null) return "—";
    if (n < 60) return `${n.toFixed(0)}s`;
    if (n < 3600) return `${(n / 60).toFixed(1)}m`;
    return `${(n / 3600).toFixed(1)}h`;
  };

  return (
    <>
      <Header title="리소스 모니터링" subtitle="GPU · 디스크 · 큐 상태" />
      <div className="p-6 space-y-6">
        {isLoading && <p className="text-sm text-muted-foreground">로딩 중...</p>}

        {/* GPU 카드 */}
        {res && res.gpus.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              GPU 미감지 (CPU 모드). 호스트에 nvidia-smi 인식되는 GPU 없음.
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {res?.gpus.map((g) => (
            <Card key={g.index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{g.name || `GPU-${g.index}`}</CardTitle>
                  <span className="text-xs text-muted-foreground font-mono">#{g.index}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>GPU 사용률</span>
                    <span className="font-medium">{g.utilization_pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={g.utilization_pct} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>VRAM</span>
                    <span className="font-medium">
                      {g.vram_gb > 0 ? `${g.vram_gb.toFixed(1)} GB` : "unified memory"}
                    </span>
                  </div>
                  <Progress value={g.vram_gb > 0 ? Math.min(g.utilization_pct, 100) : 0} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <span className="text-muted-foreground">vendor</span>
                  <span className="font-mono text-xs">{g.vendor}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">온도</span>
                  <span className="font-mono text-xs">{g.temperature_c}°C</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 큐 + 디스크 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">잡 큐 / 디스크</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">대기 중 (PENDING)</p>
              <p className="text-2xl font-bold">{res?.queue_pending ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">실행 중 (RUNNING)</p>
              <p className="text-2xl font-bold">{res?.queue_running ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">평균 대기</p>
              <p className="text-2xl font-bold">{fmtSec(stats?.avg_wait_seconds)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">평균 학습</p>
              <p className="text-2xl font-bold">{fmtSec(stats?.avg_train_seconds)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">디스크 여유</p>
              <p className="text-2xl font-bold">{res?.disk_free_gb?.toFixed(0) ?? "—"} GB</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
