"use client";

/**
 * 관리자 대시보드 — 사용자가 보낸 알림 (잡 실패 등) + 처리 액션.
 *
 * - 환경 패키지 미설치 (WFP-030x) → "자동 설치" 버튼 노출
 * - 모델 다운로드 승인 (kind=model_download) → "다운로드 승인" 버튼 노출
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

  // 모델 다운로드 승인 — HF 토큰/라이선스 사전 검증 + Stage 4 재시작.
  const modelDownload = useMutation({
    mutationFn: (jobId: string) => api.admin.modelDownload(jobId),
    onSuccess: (res) => {
      const head = res.accessible
        ? (res.job_restarted ? "✅ 다운로드 시작" : "⚠ 접근 OK 그러나 재시작 실패")
        : "⛔ 액세스 불가";
      let tail = "";
      switch (res.status) {
        case "gated":
          tail = `\n\nHF 페이지: ${res.hf_url}\n→ Access repository → 라이선스 동의 후 본 버튼 재클릭`;
          break;
        case "token_missing":
          tail = "\n\n관리자 설정(설정 화면) 에서 HF Token 저장하거나 docker/.env 의 HF_TOKEN 설정 후 worker 재시작.";
          break;
        case "token_invalid":
          tail = "\n\ndocker/.env 의 HF_TOKEN 또는 관리자 DB 저장 토큰이 무효. 새 토큰으로 갱신.";
          break;
        case "not_found":
          tail = "\n\n해당 모델은 HF 에서 미지원 — 카탈로그 항목을 '사용불가' 로 자동 변경.";
          break;
      }
      alert(`${head}\n\n[${res.status}] ${res.detail}${tail}`);
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      qc.invalidateQueries({ queryKey: ["adminCatalog"] });
    },
    onError: (e: Error) => alert(`다운로드 요청 실패: ${e.message}`),
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
          <NotifRow
            key={n.id}
            n={n}
            onPatch={patch.mutate}
            onModelDownload={modelDownload.mutate}
            modelDownloadPending={modelDownload.isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function NotifRow({
  n,
  onPatch,
  onModelDownload,
  modelDownloadPending,
}: {
  n: NotificationItem;
  onPatch: (p: { id: string; status: "read" | "resolved" }) => void;
  onModelDownload: (jobId: string) => void;
  modelDownloadPending: boolean;
}) {
  const ts = new Date(n.created_at).toLocaleString("ko-KR");
  const resolutionCmd = (n.detail?.resolution_cmd as string | null | undefined) || null;
  const workerCwd = (n.detail?.worker_cwd as string | undefined) || "Finetuning-Pipeline-worker";
  const isModelDownload = n.kind === "model_download";
  const repoId = (n.detail?.repo_id as string | undefined) || "";
  const hfUrl = (n.detail?.hf_url as string | undefined) || (repoId ? `https://huggingface.co/${repoId}` : "");

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

        {/* 모델 다운로드 승인 상세 */}
        {isModelDownload && (
          <div className="space-y-1 pt-1">
            {repoId && (
              <p className="text-[10px] text-muted-foreground">
                모델: <code className="bg-muted/60 px-1 rounded">{repoId}</code>
              </p>
            )}
            {hfUrl && (
              <p className="text-[10px]">
                <a href={hfUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  HF 페이지에서 라이선스 동의 →
                </a>
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              순서: HF 페이지에서 Access repository → 라이선스 동의 → 승인 대기 →
              본 행의 "다운로드 승인" 클릭. 이미 동의 완료면 클릭 즉시 다운로드.
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
      <div className="flex flex-col gap-1 shrink-0">
        {isModelDownload && n.job_id && (
          <Button
            size="sm"
            onClick={() => onModelDownload(n.job_id!)}
            disabled={modelDownloadPending}
            className="text-xs h-7"
          >
            {modelDownloadPending ? "검증 중..." : "📥 다운로드 승인"}
          </Button>
        )}
        <div className="flex gap-1">
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
    </div>
  );
}
