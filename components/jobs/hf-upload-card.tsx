"use client";

/**
 * 파인튜닝 완료 모델을 HuggingFace Hub로 업로드.
 *
 * 토큰 우선순위:
 *   1. 입력한 hf_token (1회용)
 *   2. 설정 페이지에 저장된 user.hf_token_encrypted (기본)
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function HFUploadCard({ jobId }: { jobId: string }) {
  const [repoId, setRepoId] = useState("");
  const [artifactKind, setArtifactKind] = useState<"adapter" | "merged">("adapter");
  const [isPrivate, setIsPrivate] = useState(true);
  const [token, setToken] = useState("");

  const upload = useMutation({
    mutationFn: () =>
      api.uploadHF(jobId, {
        repo_id: repoId.trim(),
        artifact_kind: artifactKind,
        private: isPrivate,
        hf_token: token.trim() || undefined,
      }),
    onSuccess: (res) => {
      alert(`업로드 성공!\n${res.repo_url}`);
      setToken("");  // 1회용 토큰 입력 초기화
    },
    onError: (e: Error) => alert(`업로드 실패: ${e.message}`),
  });

  const canSubmit = repoId.trim().includes("/") && !upload.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          🤗 HuggingFace Hub 업로드
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          학습된 모델을 HF Hub로 푸시. 토큰 미입력 시 설정 페이지의 저장된 토큰 사용.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="hf-repo">저장소 ID (`username/repo-name`)</Label>
          <Input
            id="hf-repo"
            placeholder="myname/wfp-finetune-J-chat"
            value={repoId}
            onChange={(e) => setRepoId(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">
            없는 저장소면 자동 생성 (`exist_ok=True`).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>아티팩트 종류</Label>
            <select
              className="w-full text-sm border rounded-md px-3 py-2 bg-background"
              value={artifactKind}
              onChange={(e) => setArtifactKind(e.target.value as "adapter" | "merged")}
            >
              <option value="adapter">adapter (LoRA, 작음)</option>
              <option value="merged">merged (full weights, 큼)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>공개 여부</Label>
            <select
              className="w-full text-sm border rounded-md px-3 py-2 bg-background"
              value={isPrivate ? "private" : "public"}
              onChange={(e) => setIsPrivate(e.target.value === "private")}
            >
              <option value="private">Private (비공개)</option>
              <option value="public">Public (공개)</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hf-token">HF 토큰 (선택 — 비우면 저장된 토큰 사용)</Label>
          <Input
            id="hf-token"
            type="password"
            placeholder="hf_xxxxx... (저장된 토큰 사용 시 비워두기)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            onClick={() => upload.mutate()}
            disabled={!canSubmit}
            className="gap-2"
          >
            {upload.isPending ? "업로드 중..." : "🤗 HF Hub에 업로드"}
          </Button>
        </div>

        {upload.data && (
          <p className="text-sm">
            ✓ <a href={upload.data.repo_url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 underline">{upload.data.repo_url}</a>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
