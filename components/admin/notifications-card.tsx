"use client";

/**
 * 관리자 대시보드 — 사용자가 보낸 알림 (잡 실패 등) + 처리 액션.
 *
 * - 환경 패키지 미설치 (WFP-030x) → "자동 설치" 버튼 노출
 * - 일반 알림 → 읽음/해결 처리
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type NotificationItem } from "@/lib/api";

export function NotificationsCard({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "notifications", "active"],
    queryFn: () => api.admin.listNotifications({ status: "new" }),
    enabled: isAdmin,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const patch = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "read" | "resolved" }) =>
      api.admin.patchNotification(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "notifications"] }),
  });

  const install = useMutation({
    mutationFn: () => api.admin.envInstall(),
    onSuccess: (res) => {
      alert(`설치 결과: ${res.status}${res.detail ? `\n${res.detail}` : ""}`);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => alert(`설치 실패: ${e.message}`),
  });

  if (!isAdmin || isLoading) return null;
  if (!data || data.length === 0) return null;

  const envMissing = data.some((n) => n.kind === "env_missing");

  return (
    <Card className="border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            📩 사용자 알림 <Badge variant="secondary">{data.length}건</Badge>
          </CardTitle>
          {envMissing && (
            <Button
              size="sm"
              onClick={() => {
                if (confirm("누락 학습 패키지를 자동 설치하시겠습니까? (시간 소요)")) {
                  install.mutate();
                }
              }}
              disabled={install.isPending}
              className="gap-2"
            >
              {install.isPending ? "설치 중..." : "📦 누락 패키지 자동 설치"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
        {data.map((n) => (
          <NotifRow key={n.id} n={n} onPatch={patch.mutate} />
        ))}
      </CardContent>
    </Card>
  );
}

function NotifRow({
  n,
  onPatch,
}: {
  n: NotificationItem;
  onPatch: (p: { id: string; status: "read" | "resolved" }) => void;
}) {
  const ts = new Date(n.created_at).toLocaleString("ko-KR");
  const resolutionCmd = (n.detail?.resolution_cmd as string | null | undefined) || null;
  const workerCwd = (n.detail?.worker_cwd as string | undefined) || "Finetuning-Pipeline-worker";

  const copyCmd = () => {
    if (!resolutionCmd) return;
    const full = `cd ${workerCwd} && ${resolutionCmd}`;
    navigator.clipboard.writeText(full).then(
      () => alert("명령어 복사됨 — 워커 디렉토리에서 실행 후 make host-restart"),
      () => alert("클립보드 접근 실패"),
    );
  };

  return (
    <div className="flex items-start justify-between gap-2 border-b last:border-0 py-2 text-sm">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{n.kind}</Badge>
          {n.error_code && (
            <Badge variant="destructive" className="text-[10px]">{n.error_code}</Badge>
          )}
          <span className="text-xs text-muted-foreground">{n.user_email}</span>
          <span className="text-xs text-muted-foreground">{ts}</span>
        </div>
        <p className="text-xs break-words">{n.message}</p>

        {/* 해결 명령어 (env_missing 등) */}
        {resolutionCmd && (
          <div className="space-y-1 pt-1">
            <p className="text-[10px] text-muted-foreground">실행 명령 (워커 venv):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] bg-muted/60 px-2 py-1 rounded font-mono break-all">
                cd {workerCwd} && {resolutionCmd}
              </code>
              <Button size="sm" variant="outline" onClick={copyCmd} className="shrink-0 text-xs h-7">
                📋 복사
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              설치 후 <code className="bg-muted/60 px-1 rounded">make host-restart</code> (PM2 worker reload)
            </p>
          </div>
        )}

        {n.job_id && (
          <a
            href={`/jobs/${n.job_id}`}
            className="text-xs text-blue-600 underline inline-block"
          >
            잡 상세 →
          </a>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPatch({ id: n.id, status: "read" })}
        >
          읽음
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPatch({ id: n.id, status: "resolved" })}
        >
          해결
        </Button>
      </div>
    </div>
  );
}
