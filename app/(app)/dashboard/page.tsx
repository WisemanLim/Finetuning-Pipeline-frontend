"use client";

/**
 * 사용자 대시보드.
 * - HW 현황 카드
 * - 최근 잡 리스트
 * - 새 잡 생성 진입점
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/utils";
import { KSIC_SECTIONS } from "@/lib/ksic";
import { EnvStatusCard } from "@/components/admin/env-status-card";
import { NotificationsCard } from "@/components/admin/notifications-card";

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success"> = {
  PENDING: "secondary",
  RUNNING: "default",
  EVAL: "default",
  DONE: "success",
  FAILED: "destructive",
  CANCELLED: "secondary",
};

export default function DashboardPage() {
  // 현재 사용자 — ADMIN 여부 판단 (env-status 카드 조건부 렌더)
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  });
  const isAdmin = user?.role === "ADMIN";

  // 최근 잡 — 5초 폴링으로 실행 중 잡 상태 추적
  const { data: jobs } = useQuery({
    queryKey: ["jobs", "dashboard"],
    queryFn: () => api.listJobs(),
    refetchInterval: 5000,
    retry: false,
  });
  const recentJobs = jobs?.slice(0, 5) ?? [];
  const runningCount = jobs?.filter((j) =>
    ["PENDING", "RUNNING", "EVAL"].includes(j.state),
  ).length ?? 0;

  // ml-worker /hw/caps 폴링
  const { data: caps, isLoading } = useQuery({
    queryKey: ["hwCaps"],
    queryFn: api.hwCaps,
    staleTime: 60_000,
  });

  return (
    <>
      <Header title="대시보드" subtitle="잡 현황 및 시스템 리소스" />

      <div className="p-6 space-y-6">
        {/* ADMIN — 사용자 알림 (잡 실패 등) */}
        <NotificationsCard isAdmin={isAdmin} />

        {/* ADMIN — 학습 환경 진단 카드 (누락 패키지 있을 때만 노출) */}
        <EnvStatusCard isAdmin={isAdmin} />

        {/* HW 현황 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4" /> CPU / GPU
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">로딩 중...</p>
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {caps?.gpus.length || 0} GPU
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {caps?.cpu.brand || "Unknown"} · {caps?.cpu.cores_logical} threads
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MemoryStick className="h-4 w-4" /> VRAM / RAM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{caps?.max_vram_gb.toFixed(1) || "0"} GB</p>
              <p className="text-xs text-muted-foreground">
                System RAM {caps?.ram_gb.toFixed(1) || "0"} GB
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" /> 디스크 여유
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{caps?.disk_free_gb.toFixed(0) || "0"} GB</p>
              <p className="text-xs text-muted-foreground">
                OS: {caps?.os || "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                최근 잡
                {runningCount > 0 && (
                  <Badge variant="default" className="ml-2">
                    실행 중 {runningCount}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Link href="/jobs">
                  <Button size="sm" variant="outline">전체 보기</Button>
                </Link>
                <Link href="/jobs/new/step-1-category">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> 새 잡 생성
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <p>아직 생성된 잡이 없습니다.</p>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <span>위의</span>
                  <Badge variant="secondary">새 잡 생성</Badge>
                  <span>버튼으로 시작하세요.</span>
                </div>
              </div>
            )}
            {recentJobs.length > 0 && (
              <ul className="divide-y">
                {recentJobs.map((j) => {
                  const section = KSIC_SECTIONS.find((s) => s.code === j.ksic_section);
                  const isRunning = ["PENDING", "RUNNING", "EVAL"].includes(j.state);
                  return (
                    <li key={j.job_id} className="py-3 flex items-center gap-3">
                      <Badge variant={STATE_VARIANT[j.state] || "secondary"}>
                        {j.state}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/jobs/${j.job_id}`}
                            className="font-mono text-xs hover:underline"
                          >
                            {j.job_id.slice(0, 8)}
                          </Link>
                          <Badge variant="outline" className="font-mono">{j.ksic_section}</Badge>
                          <span className="text-sm text-muted-foreground truncate">
                            {section?.koName}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                          <span>Stage {j.current_stage}/9</span>
                          <span>{j.created_at ? relativeTime(j.created_at) : "-"}</span>
                          {isRunning && (
                            <span className="text-primary font-medium">● 진행 중</span>
                          )}
                          {j.error_code && (
                            <span className="text-destructive">{j.error_code}</span>
                          )}
                        </div>
                      </div>
                      <Link href={`/jobs/${j.job_id}`}>
                        <Button size="sm" variant="ghost">상세</Button>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
