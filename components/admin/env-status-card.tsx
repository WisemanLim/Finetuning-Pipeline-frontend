"use client";

/**
 * 환경 진단 카드 — 대시보드 ADMIN 전용.
 *
 * 현재 환경(OS/GPU)을 자동 감지하고 누락된 학습 패키지를 표시.
 * 누락 있으면 "설치" 버튼 노출. 클릭 시 subprocess 설치.
 * 정상이면 카드 자체 비표시.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Download, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

export function EnvStatusCard({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();

  const { data: env, isLoading, error } = useQuery({
    queryKey: ["admin", "env-status"],
    queryFn: () => api.admin.envStatus(),
    enabled: isAdmin,
    retry: false,
    staleTime: 30_000,
  });

  const install = useMutation({
    mutationFn: () => api.admin.envInstall(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "env-status"] });
    },
  });

  // 비ADMIN, 로딩 중, 오류, ready 상태 → 카드 비표시
  if (!isAdmin || isLoading || error || !env) return null;
  if (env.is_ready && !env.warning) return null;

  const ready = env.is_ready;

  return (
    <Card className={ready ? "border-amber-300 bg-amber-50/40" : "border-destructive bg-destructive/5"}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {ready ? (
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
          학습 환경 진단
          <Badge variant="outline">{env.profile_label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">OS / GPU</p>
            <p className="font-medium">
              {env.os} · {env.gpu_name}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CUDA / MPS</p>
            <p className="font-medium">
              {env.cuda_available ? "CUDA ✓" : env.mps_available ? "MPS ✓" : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Python</p>
            <p className="font-medium">{env.python_version}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">패키지</p>
            <p className="font-medium">
              {env.installed_packages.length} / {env.required_packages.length}
            </p>
          </div>
        </div>

        {env.warning && (
          <p className="text-xs text-amber-700">⚠ {env.warning}</p>
        )}

        {!ready && (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-1">누락 패키지:</p>
              <div className="flex flex-wrap gap-1">
                {env.missing_packages.map((p) => (
                  <Badge key={p} variant="destructive" className="font-mono">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-md bg-muted p-2 font-mono text-xs">
              {env.install_cmd}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => install.mutate()}
                disabled={install.isPending}
                className="gap-2"
              >
                {install.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    설치 중... (수 분 소요)
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> 자동 설치
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                설치 후 워커 컨테이너 재시작 권장 (Python 모듈 reload 한계)
              </p>
            </div>

            {install.data && (
              <div className="rounded-md border p-3 text-xs space-y-1">
                <p>
                  결과:{" "}
                  <Badge variant={install.data.status === "ok" ? "success" : "destructive"}>
                    {install.data.status}
                  </Badge>
                </p>
                {install.data.detail && <p>{install.data.detail}</p>}
                {install.data.still_missing && install.data.still_missing.length > 0 && (
                  <p className="text-destructive">
                    여전히 누락: {install.data.still_missing.join(", ")}
                  </p>
                )}
                {install.data.stderr && (
                  <details>
                    <summary className="cursor-pointer text-muted-foreground">stderr 보기</summary>
                    <pre className="mt-2 whitespace-pre-wrap bg-muted p-2 rounded">
                      {install.data.stderr}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
