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

  // HF 토큰 저장
  const saveHfToken = useMutation({
    mutationFn: () => api.saveHfToken(hfToken),
    onSuccess: () => {
      setMsg("HF 토큰 저장 완료");
      setHfToken("");
    },
    onError: (e) => setMsg(`HF 토큰 저장 실패: ${formatErr(e)}`),
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">HuggingFace 토큰</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                비공개 모델 다운로드에 필요합니다. 서버에 안전하게 저장됩니다.
              </p>
            </div>
            <Button
              onClick={() => saveHfToken.mutate()}
              disabled={saveHfToken.isPending || !hfToken}
            >
              {saveHfToken.isPending ? "저장 중..." : "토큰 저장"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function formatErr(e: unknown): string {
  if (e instanceof ApiError) return (e.payload as { detail?: string })?.detail || e.message;
  return String(e);
}
