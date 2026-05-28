"use client";

/**
 * 카탈로그 관리 — 3 탭.
 *  - 모델: 등록 모델 CRUD + HF Hub 검색 자동완성
 *  - 카테고리 프리셋: KSIC 별 추천 모델 / 기본 설정 CRUD
 *  - 도메인 화이트리스트: 데이터 소스 도메인 CRUD
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Sparkles, RefreshCw } from "lucide-react";

import { api } from "@/lib/api";
import type {
  CatalogCreatePayload,
  CatalogItem,
  DataSourceCreatePayload,
  DataSourceItem,
  HfSearchResult,
  PresetCreatePayload,
  PresetItem,
} from "@/types/api";

export default function AdminCatalogPage() {
  const qc = useQueryClient();
  const seed = useMutation({
    mutationFn: () => api.admin.seedDefaults(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["adminCatalog"] });
      qc.invalidateQueries({ queryKey: ["adminPresets"] });
      qc.invalidateQueries({ queryKey: ["adminDataSources"] });
      alert(
        `기본값 시드 완료\n` +
        `모델 +${r.models_added} (기존 ${r.models_existing})\n` +
        `프리셋 +${r.presets_added} (기존 ${r.presets_existing})\n` +
        `화이트리스트 +${r.whitelist_added} (기존 ${r.whitelist_existing})`,
      );
    },
    onError: (e: Error) => alert(`시드 실패: ${e.message}`),
  });

  const autoRefresh = useMutation({
    mutationFn: () => api.admin.autoRefreshCatalog(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["adminCatalog"] });
      qc.invalidateQueries({ queryKey: ["adminPresets"] });
      alert(
        `자동 갱신 완료\n` +
        `모델 +${r.models_added} (skip ${r.models_skipped})\n` +
        `프리셋 +${r.presets_added} / 갱신 ${r.presets_updated} / 변경없음 ${r.presets_unchanged}\n` +
        `HF 검색 ${r.queries_run}회 (오류 ${r.hf_search_errors})`,
      );
    },
    onError: (e: Error) => alert(`자동 갱신 실패: ${e.message}`),
  });

  const handleSeed = () => {
    if (
      !confirm(
        "기본값을 시드합니다.\n\n" +
        "• 시드 모델 (Qwen, Llama-3, CodeLlama 등 14건) → 카탈로그\n" +
        "• KSIC 별 프리셋 9건 → 카테고리 프리셋\n" +
        "• 'allow-all' 화이트리스트 1건 → 도메인 화이트리스트\n\n" +
        "이미 존재하는 항목은 skip. 비활성(soft-deleted) 항목은 유지.",
      )
    )
      return;
    seed.mutate();
  };

  const handleAutoRefresh = () => {
    if (
      !confirm(
        "HF Hub trending 기반 자동 갱신을 실행합니다.\n\n" +
        "• 카테고리별 키워드로 HF Hub 검색\n" +
        "• 라이선스 safelist + 다운로드 임계 통과한 신규 모델만 카탈로그에 추가\n" +
        "• 기존 모델 행은 보존 (운영자 편집 우선)\n" +
        "• 활성 카탈로그를 바탕으로 KSIC 프리셋의 추천 모델 재계산\n\n" +
        "수십 초 소요될 수 있습니다.",
      )
    )
      return;
    autoRefresh.mutate();
  };

  return (
    <>
      <Header
        title="카탈로그 관리"
        subtitle="모델 / 카테고리 프리셋 / 도메인 화이트리스트"
      />
      <div className="p-6 space-y-4">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoRefresh}
            disabled={autoRefresh.isPending}
            className="gap-2"
            title="HF Hub trending + KSIC 매핑으로 모델/프리셋 자동 추가·갱신"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh.isPending ? "animate-spin" : ""}`} />
            {autoRefresh.isPending ? "자동 갱신 중..." : "자동 갱신"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seed.isPending}
            className="gap-2"
            title="빈 항목을 코드 내 시드 데이터로 채움 (중복 skip)"
          >
            <Sparkles className="h-4 w-4" />
            {seed.isPending ? "시드 중..." : "기본값 가져오기"}
          </Button>
        </div>
        <Tabs defaultValue="models">
          <TabsList>
            <TabsTrigger value="models">모델</TabsTrigger>
            <TabsTrigger value="presets">카테고리 프리셋</TabsTrigger>
            <TabsTrigger value="whitelist">도메인 화이트리스트</TabsTrigger>
          </TabsList>

          <TabsContent value="models">
            <ModelsTab />
          </TabsContent>
          <TabsContent value="presets">
            <PresetsTab />
          </TabsContent>
          <TabsContent value="whitelist">
            <WhitelistTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ─────────────────────────────────────────
// 모델 탭
// ─────────────────────────────────────────

function ModelsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["adminCatalog"],
    queryFn: () => api.admin.listCatalog(),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);

  const create = useMutation({
    mutationFn: (body: CatalogCreatePayload) => api.admin.createCatalog(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminCatalog"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => alert(`추가 실패: ${e.message}`),
  });

  const patch = useMutation({
    mutationFn: (body: { id: string; payload: Partial<CatalogCreatePayload> }) =>
      api.admin.patchCatalog(body.id, body.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminCatalog"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => alert(`수정 실패: ${e.message}`),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.admin.deleteCatalog(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminCatalog"] }),
    onError: (e: Error) => alert(`삭제 실패: ${e.message}`),
  });

  const handleDelete = (item: CatalogItem) => {
    if (!confirm(`'${item.hf_repo}' 비활성화? (soft delete)`)) return;
    del.mutate(item.id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">등록 모델</CardTitle>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> 모델 추가
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">불러오는 중...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HF Repo</TableHead>
                <TableHead>Params (B)</TableHead>
                <TableHead>License</TableHead>
                <TableHead>HW Min VRAM</TableHead>
                <TableHead>언어</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>활성</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((m) => (
                <TableRow key={m.id} className={m.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-mono text-xs">{m.hf_repo}</TableCell>
                  <TableCell>{m.params_b}</TableCell>
                  <TableCell>{m.license}</TableCell>
                  <TableCell>{m.hw_min_vram_gb} GB</TableCell>
                  <TableCell>{m.language.join(", ")}</TableCell>
                  <TableCell>{m.priority}</TableCell>
                  <TableCell>
                    {m.is_active ? (
                      <Badge variant="success">활성</Badge>
                    ) : (
                      <Badge variant="secondary">비활성</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(m);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(m)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!data?.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    등록된 모델 없음
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {dialogOpen && (
        <ModelDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          initial={editing}
          onSubmit={(payload) => {
            if (editing) patch.mutate({ id: editing.id, payload });
            else create.mutate(payload);
          }}
          submitting={create.isPending || patch.isPending}
        />
      )}
    </Card>
  );
}

function ModelDialog({
  open,
  onClose,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  initial: CatalogItem | null;
  onSubmit: (payload: CatalogCreatePayload) => void;
  submitting: boolean;
}) {
  const [hfRepo, setHfRepo] = useState(initial?.hf_repo ?? "");
  const [paramsB, setParamsB] = useState(initial?.params_b?.toString() ?? "");
  const [license, setLicense] = useState(initial?.license ?? "apache-2.0");
  const [vram, setVram] = useState(initial?.hw_min_vram_gb?.toString() ?? "6");
  const [language, setLanguage] = useState((initial?.language ?? ["ko", "en"]).join(", "));
  const [tags, setTags] = useState((initial?.tags ?? ["general"]).join(", "));
  const [priority, setPriority] = useState(initial?.priority?.toString() ?? "5");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: hfResults, isFetching: hfFetching } = useQuery({
    queryKey: ["hfSearch", searchQuery],
    queryFn: () => api.admin.hfSearch(searchQuery),
    enabled: searchQuery.trim().length >= 2,
  });

  const applyHf = (r: HfSearchResult) => {
    setHfRepo(r.hf_repo);
    if (r.params_b) setParamsB(String(r.params_b));
    if (r.tags?.length) setTags(r.tags.slice(0, 5).join(", "));
    setSearchQuery("");
  };

  const handleSubmit = () => {
    if (!hfRepo.trim()) return alert("hf_repo 필수");
    const p = parseFloat(paramsB);
    if (!Number.isFinite(p) || p <= 0) return alert("params_b 는 양수");
    const v = parseFloat(vram);
    if (!Number.isFinite(v) || v < 0) return alert("hw_min_vram_gb 는 0 이상");
    onSubmit({
      hf_repo: hfRepo.trim(),
      params_b: p,
      license: license.trim() || "apache-2.0",
      hw_min_vram_gb: v,
      language: language.split(",").map((s) => s.trim()).filter(Boolean),
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      priority: parseInt(priority, 10) || 5,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "모델 편집" : "모델 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <Label>HF Repo *</Label>
            <Input
              value={hfRepo}
              onChange={(e) => setHfRepo(e.target.value)}
              placeholder="Qwen/Qwen2.5-7B-Instruct"
              className="font-mono text-xs"
            />
          </div>

          {/* HF Hub 검색 */}
          <div className="rounded border bg-muted/30 p-2 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="HF Hub 검색 (2자 이상) — 예: qwen, llama-3-8b"
                className="text-xs h-8"
              />
            </div>
            {searchQuery.trim().length >= 2 && (
              <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                {hfFetching && <p className="text-muted-foreground">검색 중...</p>}
                {!hfFetching && (!hfResults || hfResults.length === 0) && (
                  <p className="text-muted-foreground">결과 없음</p>
                )}
                {hfResults?.map((r) => (
                  <button
                    key={r.hf_repo}
                    type="button"
                    onClick={() => applyHf(r)}
                    className="block w-full text-left px-2 py-1 rounded hover:bg-accent"
                  >
                    <span className="font-mono">{r.hf_repo}</span>
                    <span className="ml-2 text-muted-foreground">
                      ↓{r.downloads.toLocaleString()} · ♥{r.likes}
                      {r.params_b ? ` · ${r.params_b}B` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Params (B) *</Label>
              <Input
                type="number"
                step="0.1"
                value={paramsB}
                onChange={(e) => setParamsB(e.target.value)}
              />
            </div>
            <div>
              <Label>HW Min VRAM (GB) *</Label>
              <Input
                type="number"
                step="0.5"
                value={vram}
                onChange={(e) => setVram(e.target.value)}
              />
            </div>
            <div>
              <Label>License</Label>
              <Input value={license} onChange={(e) => setLicense(e.target.value)} />
            </div>
            <div>
              <Label>Priority (낮을수록 우선)</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label>언어 (콤마 구분)</Label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>태그 (콤마 구분)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────
// 프리셋 탭
// ─────────────────────────────────────────

function PresetsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["adminPresets"],
    queryFn: () => api.admin.listPresets(),
  });
  // 추천 모델 선택 위해 카탈로그도 로드
  const { data: catalog } = useQuery({
    queryKey: ["adminCatalog"],
    queryFn: () => api.admin.listCatalog(),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PresetItem | null>(null);

  const create = useMutation({
    mutationFn: (body: PresetCreatePayload) => api.admin.createPreset(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminPresets"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => alert(`추가 실패: ${e.message}`),
  });
  const patch = useMutation({
    mutationFn: (b: { id: string; payload: Partial<PresetCreatePayload> }) =>
      api.admin.patchPreset(b.id, b.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminPresets"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => alert(`수정 실패: ${e.message}`),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.admin.deletePreset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminPresets"] }),
    onError: (e: Error) => alert(`삭제 실패: ${e.message}`),
  });

  const handleDelete = (p: PresetItem) => {
    if (!confirm(`프리셋 '${p.name}' 비활성화?`)) return;
    del.mutate(p.id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">카테고리 프리셋 (KSIC 별)</CardTitle>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> 프리셋 추가
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">불러오는 중...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>KSIC</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>추천 모델 수</TableHead>
                <TableHead>활성</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((p) => (
                <TableRow key={p.id} className={p.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.ksic_section}</TableCell>
                  <TableCell>{p.task_type}</TableCell>
                  <TableCell>{p.recommended_models.length}</TableCell>
                  <TableCell>
                    {p.is_active ? (
                      <Badge variant="success">활성</Badge>
                    ) : (
                      <Badge variant="secondary">비활성</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(p);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(p)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!data?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    등록된 프리셋 없음
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {dialogOpen && (
        <PresetDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          initial={editing}
          catalog={catalog ?? []}
          onSubmit={(payload) => {
            if (editing) patch.mutate({ id: editing.id, payload });
            else create.mutate(payload);
          }}
          submitting={create.isPending || patch.isPending}
        />
      )}
    </Card>
  );
}

function PresetDialog({
  open,
  onClose,
  initial,
  catalog,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  initial: PresetItem | null;
  catalog: CatalogItem[];
  onSubmit: (payload: PresetCreatePayload) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [ksic, setKsic] = useState(initial?.ksic_section ?? "");
  const [taskType, setTaskType] = useState(initial?.task_type ?? "chat");
  const [models, setModels] = useState<string[]>(initial?.recommended_models ?? []);
  const [configJson, setConfigJson] = useState(
    JSON.stringify(initial?.default_config ?? {}, null, 2),
  );
  const [description, setDescription] = useState(initial?.description ?? "");

  const toggleModel = (repo: string) => {
    setModels((prev) =>
      prev.includes(repo) ? prev.filter((r) => r !== repo) : [...prev, repo],
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return alert("이름 필수");
    if (!ksic.trim()) return alert("KSIC section 필수 (A~U)");
    let cfg: Record<string, unknown> = {};
    try {
      cfg = configJson.trim() ? JSON.parse(configJson) : {};
    } catch {
      return alert("default_config JSON 파싱 실패");
    }
    onSubmit({
      name: name.trim(),
      ksic_section: ksic.trim().toUpperCase().slice(0, 2),
      task_type: taskType.trim() || "chat",
      recommended_models: models,
      default_config: cfg,
      description: description.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? "프리셋 편집" : "프리셋 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>이름 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>KSIC Section (A~U) *</Label>
              <Input
                value={ksic}
                maxLength={2}
                onChange={(e) => setKsic(e.target.value.toUpperCase())}
                placeholder="J"
              />
            </div>
            <div>
              <Label>Task Type</Label>
              <Input
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                placeholder="chat | qa | summary | code | classification"
              />
            </div>
            <div>
              <Label>설명 (선택)</Label>
              <Input
                value={description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>추천 모델 (체크박스로 선택 · {models.length}개)</Label>
            <div className="border rounded-md p-2 max-h-44 overflow-y-auto space-y-1 mt-1">
              {catalog.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  카탈로그가 비어있음. 먼저 '모델' 탭에서 추가하세요.
                </p>
              )}
              {catalog.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent rounded px-1"
                >
                  <input
                    type="checkbox"
                    checked={models.includes(m.hf_repo)}
                    onChange={() => toggleModel(m.hf_repo)}
                  />
                  <span className="font-mono">{m.hf_repo}</span>
                  <span className="text-muted-foreground">
                    ({m.params_b}B · {m.license})
                  </span>
                </label>
              ))}
            </div>
            {/* 수동 입력 (카탈로그 외 모델 추가) */}
            <ManualModelAdd onAdd={(repo) => !models.includes(repo) && setModels([...models, repo])} />
          </div>

          <div>
            <Label>default_config (JSON)</Label>
            <Textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="font-mono text-xs"
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualModelAdd({ onAdd }: { onAdd: (repo: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2 mt-2">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="카탈로그 외 hf_repo 직접 추가"
        className="text-xs h-8"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (val.trim()) {
            onAdd(val.trim());
            setVal("");
          }
        }}
      >
        + 추가
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────
// 화이트리스트 탭
// ─────────────────────────────────────────

function WhitelistTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["adminDataSources"],
    queryFn: () => api.admin.listDataSources(),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DataSourceItem | null>(null);

  const create = useMutation({
    mutationFn: (body: DataSourceCreatePayload) => api.admin.createDataSource(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminDataSources"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => alert(`추가 실패: ${e.message}`),
  });
  const patch = useMutation({
    mutationFn: (b: { id: string; payload: Partial<DataSourceCreatePayload> }) =>
      api.admin.patchDataSource(b.id, b.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminDataSources"] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => alert(`수정 실패: ${e.message}`),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.admin.deleteDataSource(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminDataSources"] }),
    onError: (e: Error) => alert(`삭제 실패: ${e.message}`),
  });

  const handleDelete = (d: DataSourceItem) => {
    if (!confirm(`'${d.name}' 비활성화?`)) return;
    del.mutate(d.id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">도메인 화이트리스트</CardTitle>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> 항목 추가
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">불러오는 중...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>타입</TableHead>
                <TableHead>URL 패턴</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>활성</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((d) => (
                <TableRow key={d.id} className={d.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{d.source_type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{d.url_pattern}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.description}
                  </TableCell>
                  <TableCell>
                    {d.is_active ? (
                      <Badge variant="success">활성</Badge>
                    ) : (
                      <Badge variant="secondary">비활성</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(d);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(d)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!data?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    등록된 화이트리스트 없음
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {dialogOpen && (
        <WhitelistDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          initial={editing}
          onSubmit={(payload) => {
            if (editing) patch.mutate({ id: editing.id, payload });
            else create.mutate(payload);
          }}
          submitting={create.isPending || patch.isPending}
        />
      )}
    </Card>
  );
}

function WhitelistDialog({
  open,
  onClose,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  initial: DataSourceItem | null;
  onSubmit: (payload: DataSourceCreatePayload) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sourceType, setSourceType] = useState<DataSourceCreatePayload["source_type"]>(
    (initial?.source_type as DataSourceCreatePayload["source_type"]) ?? "url",
  );
  const [urlPattern, setUrlPattern] = useState(initial?.url_pattern ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const handleSubmit = () => {
    if (!name.trim()) return alert("이름 필수");
    if (!urlPattern.trim()) return alert("URL 패턴 필수");
    onSubmit({
      name: name.trim(),
      source_type: sourceType,
      url_pattern: urlPattern.trim(),
      description: description?.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "화이트리스트 편집" : "화이트리스트 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>이름 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>소스 타입</Label>
            <select
              value={sourceType}
              onChange={(e) =>
                setSourceType(e.target.value as DataSourceCreatePayload["source_type"])
              }
              className="w-full border rounded-md h-9 px-2 text-sm bg-background"
            >
              <option value="url">url</option>
              <option value="hf_datasets">hf_datasets</option>
              <option value="api">api</option>
              <option value="upload">upload</option>
            </select>
          </div>
          <div>
            <Label>URL 패턴 *</Label>
            <Input
              value={urlPattern}
              onChange={(e) => setUrlPattern(e.target.value)}
              placeholder="https://*.example.com/* 또는 dataset id"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label>설명 (선택)</Label>
            <Textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
