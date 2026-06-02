"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [hfToken, setHfToken] = useState("");
  const [msg, setMsg] = useState("");

  // /auth/me 로 현재 사용자 조회
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  // 로드 후 폼 초기화
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  // 프로필 저장
  const saveProfile = useMutation({
    mutationFn: () => api.updateProfile({ name }),
    onSuccess: () => {
      setMsg("프로필 저장 완료");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => setMsg(`프로필 저장 실패: ${formatErr(e)}`),
  });

  const isAdmin = user?.role === "ADMIN";

  // HF 토큰 현재 가용 상태 (env / admin DB) — admin role 일 때만 조회.
  const { data: hfStatus } = useQuery({
    queryKey: ["admin", "hf-token-status"],
    queryFn: () => api.admin.envHfTokenStatus(),
    enabled: isAdmin,
    refetchOnWindowFocus: false,
  });

  // HF 토큰 저장 — admin 만 호출 가능.
  const saveHfToken = useMutation({
    mutationFn: () => api.saveHfToken(hfToken),
    onSuccess: () => {
      setMsg("HF 토큰 저장 완료");
      setHfToken("");
      qc.invalidateQueries({ queryKey: ["admin", "hf-token-status"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => setMsg(`HF 토큰 저장 실패: ${formatErr(e)}`),
  });

  const deleteHfToken = useMutation({
    mutationFn: () => api.deleteHfToken(),
    onSuccess: () => {
      setMsg("HF 토큰 삭제 완료");
      qc.invalidateQueries({ queryKey: ["admin", "hf-token-status"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => setMsg(`HF 토큰 삭제 실패: ${formatErr(e)}`),
  });

  if (error) {
    return (
      <>
        <Header title="설정" subtitle="계정 및 환경 설정" />
        <div className="p-6">
          <p className="text-sm text-destructive">
            사용자 정보를 불러오지 못했습니다. 다시 로그인하세요.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="설정" subtitle="계정 및 환경 설정" />

      <div className="p-6 space-y-6 max-w-2xl">
        {msg && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-6 text-sm">{msg}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">프로필</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={user?.email ?? ""}
                placeholder={isLoading ? "로딩 중..." : "you@example.com"}
                disabled
                readOnly
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>권한:</span>
                <Badge variant={user?.role === "ADMIN" ? "default" : "secondary"}>
                  {user?.role || "-"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Wiseman"
              />
            </div>

            <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "저장 중..." : "저장"}
            </Button>
          </CardContent>
        </Card>

        {/* HF Token Card — admin role 만 노출. 백엔드 endpoint 도 admin 검증. */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">HuggingFace 토큰 (관리자)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 현재 토큰 가용 상태 */}
              {hfStatus && (
                <div className="text-xs space-y-1 rounded-md border bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">현재 사용 토큰:</span>
                    <Badge
                      variant={
                        hfStatus.effective_source === "none" ? "destructive" : "success"
                      }
                    >
                      {hfStatus.effective_source === "env"
                        ? "환경 변수 (docker/.env)"
                        : hfStatus.effective_source === "admin_db"
                          ? "관리자 DB 저장값"
                          : "없음"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    우선순위: docker/.env 의 HF_TOKEN &gt; 아래 입력 저장값.
                    env 가 있으면 그대로 사용 — 별도 저장 불필요.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="hf-token">HF Token</Label>
                <Input
                  id="hf-token"
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_xxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">
                  비공개/Gated 모델 다운로드에 사용. env HF_TOKEN 미설정 또는
                  env 값 override 가 필요할 때만 저장.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => saveHfToken.mutate()}
                  disabled={saveHfToken.isPending || !hfToken}
                >
                  {saveHfToken.isPending ? "저장 중..." : "토큰 저장"}
                </Button>
                {hfStatus?.has_admin_db_token && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("관리자 DB 토큰을 삭제합니다. 진행?")) {
                        deleteHfToken.mutate();
                      }
                    }}
                    disabled={deleteHfToken.isPending}
                  >
                    {deleteHfToken.isPending ? "삭제 중..." : "DB 토큰 삭제"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function formatErr(e: unknown): string {
  if (e instanceof ApiError) return (e.payload as { detail?: string })?.detail || e.message;
  return String(e);
}
