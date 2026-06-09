/**
 * ml-worker REST API 클라이언트.
 *
 * BFF 패턴 — Next.js rewrite `/api/worker/*` → FastAPI `http://localhost:8000/*`.
 * TanStack Query에서 호출되는 fetcher 함수들의 단일 진입점.
 *
 * JWT 토큰은 localStorage에 저장 (간단한 데모 — 운영은 httpOnly 쿠키 권장).
 */

import type {
  CatalogCreatePayload,
  CatalogItem,
  ConvertResult,
  ConvertStatusResult,
  DataSourceCreatePayload,
  DataSourceItem,
  HWCaps,
  HfSearchResult,
  JobCreateRequest,
  JobStatus,
  ModelCard,
  PresetCreatePayload,
  PresetItem,
} from "@/types/api";

const BASE = "/api/proxy";
const TOKEN_KEY = "wfp_access_token";

// ─────────────────────────────────────────
// 토큰 관리
// ─────────────────────────────────────────

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  },
};

class ApiError extends Error {
  constructor(public status: number, public payload: unknown, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = tokenStore.get();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const raw = await res.text();
    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = raw;
    }
    // 401 → 토큰 제거 + 로그인 리다이렉트.
    // 미로그인(토큰 없음) 상태에서 보호 API 직접 호출한 경우에도 강제 리다이렉트.
    if (res.status === 401) {
      tokenStore.clear();
      if (typeof window !== "undefined") {
        // 로그인 페이지 자체 / 공개 페이지에서는 리다이렉트 생략 (무한 루프 방지)
        const path = window.location.pathname;
        const isPublic =
          path.startsWith("/login") ||
          path.startsWith("/signup") ||
          path === "/" ||
          path.startsWith("/marketing");
        if (!isPublic) {
          const cb = encodeURIComponent(path + window.location.search);
          window.location.href = `/login?callbackUrl=${cb}`;
        }
      }
    }
    throw new ApiError(
      res.status,
      payload,
      `API ${res.status}: ${JSON.stringify(payload).slice(0, 200)}`,
    );
  }

  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────
// 응답 타입 (간이 — 백엔드 Pydantic과 1:1)
// ─────────────────────────────────────────

export interface UserPublic {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserPublic;
}

export interface JobListItem {
  job_id: string;
  state: string;
  current_stage: number;
  ksic_section: string;
  task_type: string;
  model_hf_repo: string;
  created_at: string | null;
  error_code: string;
}

// ─────────────────────────────────────────
// API 메서드
// ─────────────────────────────────────────

export const api = {
  // ── 시스템 ──
  health: () => request<{ status: string; jobs: number }>("/health"),
  hwCaps: () => request<HWCaps>("/hw/caps"),

  // ── 인증 ──
  signup: async (email: string, password: string, name?: string) => {
    const res = await request<TokenResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    tokenStore.set(res.access_token);
    return res;
  },
  login: async (email: string, password: string) => {
    const res = await request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    tokenStore.set(res.access_token);
    return res;
  },
  me: () => request<UserPublic>("/auth/me"),
  logout: () => tokenStore.clear(),

  // ── 사용자 ──
  updateProfile: (body: { name?: string | null }) =>
    request<UserPublic>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),
  // HF 토큰 저장/삭제 — 백엔드가 admin role 만 허용. UI 도 admin 일 때만 노출.
  saveHfToken: (hf_token: string) =>
    request<void>("/users/me/hf-token", { method: "POST", body: JSON.stringify({ hf_token }) }),
  deleteHfToken: () => request<void>("/users/me/hf-token", { method: "DELETE" }),

  // ── 데이터 업로드 ──
  uploadData: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const token = tokenStore.get();
    const res = await fetch(`${BASE}/data/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`업로드 실패 ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<{ path: string; filename: string; size_bytes: number }>;
  },

  // ── 모델 카탈로그 ──
  listModels: (params: { section?: string; max_vram_gb?: number; language?: string }) => {
    const qs = new URLSearchParams();
    if (params.section) qs.set("section", params.section);
    if (params.max_vram_gb !== undefined) qs.set("max_vram_gb", String(params.max_vram_gb));
    if (params.language) qs.set("language", params.language);
    return request<ModelCard[]>(`/models/?${qs.toString()}`);
  },

  // ── 잡 ──
  createJob: (body: JobCreateRequest) =>
    request<{ job_id: string; state: string }>("/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listJobs: (state?: string) => {
    const qs = state ? `?state=${state}` : "";
    return request<JobListItem[]>(`/jobs${qs}`);
  },
  getJob: (jobId: string) => request<JobStatus>(`/jobs/${jobId}`),
  cancelJob: (jobId: string) =>
    request<{ job_id: string; state: string }>(`/jobs/${jobId}`, { method: "DELETE" }),
  advanceJob: (jobId: string) =>
    request<{ advanced_from: number; new_start_stage: number | null; restarted: boolean }>(
      `/jobs/${jobId}/advance`,
      { method: "POST" },
    ),
  finalizeJob: (jobId: string) =>
    request<{ finalized_at_stage: number; checkpoint_dir: string | null; state: string }>(
      `/jobs/${jobId}/finalize`,
      { method: "POST" },
    ),
  artifactUrl: (jobId: string, kind: string): string => {
    const token = tokenStore.get();
    const t = token ? `?token=${encodeURIComponent(token)}` : "";
    return `${BASE}/jobs/${jobId}/artifacts/${kind}${t}`;
  },

  // ── 관리자 ──
  admin: {
    listUsers: () =>
      request<Array<{
        id: string; email: string; name: string | null; role: string;
        is_active: boolean; last_login: string | null; created_at: string;
      }>>("/admin/users"),
    patchUser: (id: string, body: { role?: string; is_active?: boolean }) =>
      request(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    listJobs: (state?: string) => {
      const qs = state ? `?state=${state}` : "";
      return request<Array<{
        job_id: string; user_id: string; state: string; current_stage: number;
        ksic_section: string; model_hf_repo: string; created_at: string | null;
      }>>(`/admin/jobs${qs}`);
    },
    cancelJob: (jobId: string) =>
      request<{ job_id: string; state: string }>(`/admin/jobs/${jobId}/cancel`, { method: "POST" }),
    stats: () =>
      request<{
        users_total: number; users_active: number;
        jobs_pending: number; jobs_running: number; jobs_done: number;
        jobs_failed: number; jobs_cancelled: number;
        queue_depth: number;
        avg_wait_seconds: number | null;
        avg_train_seconds: number | null;
        disk_free_gb: number; gpu_count: number;
        gpu_breakdown: Array<{
          index: number; name: string;
          vram_used_mb: number; vram_total_mb: number; util_pct: number;
        }>;
      }>("/admin/stats"),
    resources: () =>
      request<{
        gpus: Array<{
          index: number; name: string; vendor: string; vram_gb: number;
          utilization_pct: number; temperature_c: number;
        }>;
        queue_pending: number; queue_running: number; disk_free_gb: number;
      }>("/admin/resources"),
    // ── 카탈로그: 모델 ──
    listCatalog: () => request<CatalogItem[]>("/admin/catalog/models"),
    createCatalog: (body: CatalogCreatePayload) =>
      request<CatalogItem>("/admin/catalog/models", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    patchCatalog: (id: string, body: Partial<CatalogCreatePayload> & { is_active?: boolean }) =>
      request<CatalogItem>(`/admin/catalog/models/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteCatalog: (id: string) =>
      request<void>(`/admin/catalog/models/${id}`, { method: "DELETE" }),

    // ── 카탈로그: 카테고리 프리셋 ──
    listPresets: () => request<PresetItem[]>("/admin/presets"),
    createPreset: (body: PresetCreatePayload) =>
      request<PresetItem>("/admin/presets", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    patchPreset: (id: string, body: Partial<PresetCreatePayload> & { is_active?: boolean }) =>
      request<PresetItem>(`/admin/presets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deletePreset: (id: string) =>
      request<void>(`/admin/presets/${id}`, { method: "DELETE" }),

    // ── 카탈로그: 도메인 화이트리스트 ──
    listDataSources: () => request<DataSourceItem[]>("/admin/data-sources"),
    createDataSource: (body: DataSourceCreatePayload) =>
      request<DataSourceItem>("/admin/data-sources", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    patchDataSource: (id: string, body: Partial<DataSourceCreatePayload> & { is_active?: boolean }) =>
      request<DataSourceItem>(`/admin/data-sources/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteDataSource: (id: string) =>
      request<void>(`/admin/data-sources/${id}`, { method: "DELETE" }),

    // ── HF Hub 검색 (모델 추가 보조) ──
    hfSearch: (q: string, limit = 10) =>
      request<HfSearchResult[]>(
        `/admin/hf-search?q=${encodeURIComponent(q)}&limit=${limit}`,
      ),

    // ── 카탈로그 기본값 시드 (_ALL_MODELS + PRD 프리셋 + allow-all) ──
    seedDefaults: () =>
      request<{
        models_added: number;
        presets_added: number;
        whitelist_added: number;
        models_existing: number;
        presets_existing: number;
        whitelist_existing: number;
      }>("/admin/catalog/seed-defaults", { method: "POST" }),

    // ── 카탈로그 자동 갱신 (HF Hub trending 기반) ──
    autoRefreshCatalog: () =>
      request<{
        models_added: number;
        models_skipped: number;
        presets_added: number;
        presets_updated: number;
        presets_unchanged: number;
        hf_search_errors: number;
        queries_run: number;
      }>("/admin/catalog/auto-refresh", { method: "POST" }),
    audit: (limit = 100) =>
      request<Array<{
        id: string; ts: string; actor_email: string; action: string;
        target: string | null; detail: string | null;
      }>>(`/admin/audit?limit=${limit}`),

    // 환경 진단 + 자동 설치 (관리자 대시보드 진입 시 사용)
    envStatus: () =>
      request<{
        os: string; gpu_vendor: string; gpu_name: string;
        profile: string; profile_label: string;
        cuda_available: boolean; mps_available: boolean;
        python_version: string;
        required_packages: string[]; installed_packages: string[]; missing_packages: string[];
        install_cmd: string; is_ready: boolean; warning: string;
      }>("/admin/env/status"),
    envInstall: () =>
      request<{
        status: string; returncode?: number; stdout?: string; stderr?: string;
        still_missing?: string[]; restart_required?: boolean; detail?: string;
      }>("/admin/env/install", { method: "POST" }),

    // 사용자 → 관리자 알림 목록
    listNotifications: (params?: { status?: string; kind?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status_filter", params.status);
      if (params?.kind) qs.set("kind", params.kind);
      const q = qs.toString();
      return request<NotificationItem[]>(`/admin/notifications${q ? `?${q}` : ""}`);
    },
    patchNotification: (id: string, status: "new" | "read" | "resolved") =>
      request<NotificationItem>(`/admin/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    // 모델 다운로드 승인 — HF 토큰/라이선스 사전 검증 후 Stage 4 재시작.
    // status: ok / gated / token_invalid / token_missing / not_found / error
    modelDownload: (jobId: string) =>
      request<{
        repo_id: string;
        accessible: boolean;
        status: string;
        detail: string;
        hf_url: string;
        job_restarted: boolean;
      }>(`/admin/jobs/${jobId}/model-download`, { method: "POST" }),

    // 카탈로그 모델 직접 다운로드 — admin 카탈로그 페이지의 '비활성' 클릭.
    // status: ok / gated / token_invalid / token_missing / not_found /
    //          already_downloaded / downloading / error
    catalogDownload: (entryId: string) =>
      request<{
        hf_repo: string;
        status: string;
        detail: string;
        hf_url: string;
      }>(`/admin/catalog/models/${entryId}/download`, { method: "POST" }),

    // HF 토큰 가용 상태 — env / admin DB / none
    envHfTokenStatus: () =>
      request<{
        has_env_token: boolean;
        has_admin_db_token: boolean;
        effective_source: "env" | "admin_db" | "none";
      }>("/admin/env/hf-token-status"),

    // 카탈로그 모델 공개/비공개 토글 — source!="hf" 만 의미.
    catalogTogglePublic: (id: string) =>
      request<{
        id: string;
        hf_repo: string;
        source: string;
        is_public: boolean;
      }>(`/admin/catalog/models/${id}/toggle-public`, { method: "POST" }),

    // 사용자 모델 파일 업로드 — multipart. files 다수 허용.
    catalogUploadModel: async (
      meta: {
        hf_repo: string;
        params_b: number;
        license?: string;
        hw_min_vram_gb?: number;
        language?: string;   // CSV
        tags?: string;       // CSV
        priority?: number;
        is_public?: boolean;
        model_format?: string;   // safetensors/gguf/mlx/pytorch/onnx/auto
      },
      files: File[],
    ): Promise<CatalogItem> => {
      const form = new FormData();
      form.append("hf_repo", meta.hf_repo);
      form.append("params_b", String(meta.params_b));
      if (meta.license !== undefined) form.append("license", meta.license);
      if (meta.hw_min_vram_gb !== undefined)
        form.append("hw_min_vram_gb", String(meta.hw_min_vram_gb));
      if (meta.language !== undefined) form.append("language", meta.language);
      if (meta.tags !== undefined) form.append("tags", meta.tags);
      if (meta.priority !== undefined) form.append("priority", String(meta.priority));
      if (meta.is_public !== undefined) form.append("is_public", String(meta.is_public));
      form.append("model_format", meta.model_format ?? "auto");
      for (const f of files) form.append("files", f, f.name);

      const token = tokenStore.get();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE}/admin/catalog/models/upload`, {
        method: "POST",
        headers,
        body: form,
      });
      if (!res.ok) {
        const raw = await res.text();
        let payload: unknown;
        try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw; }
        throw new ApiError(res.status, payload, `Upload failed: ${res.status}`);
      }
      return (await res.json()) as CatalogItem;
    },

    // 업로드/파인튜닝 카탈로그 모델 파일 다운로드 (local_path → zip). blob 패턴.
    catalogDownloadFiles: async (entryId: string): Promise<void> => {
      const token = tokenStore.get();
      const res = await fetch(`${BASE}/admin/catalog/models/${entryId}/download-files`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`다운로드 실패 ${res.status}: ${text.slice(0, 200)}`);
      }
      const cd = res.headers.get("content-disposition") || "";
      const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const filename = m ? decodeURIComponent(m[1]) : `model_${entryId.slice(0, 8)}.zip`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  },

  // 파인튜닝 완료 모델 포맷 변환 트리거 (비동기). 이후 convertStatus 폴링 → downloadArtifact.
  convertArtifact: (jobId: string, format: string, quant = "Q4_K_M") =>
    request<ConvertResult>(`/jobs/${jobId}/convert`, {
      method: "POST",
      body: JSON.stringify({ format, quant }),
    }),

  // 포맷별 변환 가능 여부 + 진행 상태 + 완료 여부
  convertStatus: (jobId: string) =>
    request<ConvertStatusResult>(`/jobs/${jobId}/convert/status`),

  // 인증된 아티팩트 다운로드 — Bearer 헤더 첨부 필요해서 <a href>로 불가.
  // blob 받아서 Object URL로 트리거. 파일명은 Content-Disposition에서 추출.
  downloadArtifact: async (jobId: string, kind: string): Promise<void> => {
    const token = tokenStore.get();
    const res = await fetch(`${BASE}/jobs/${jobId}/artifacts/${kind}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`다운로드 실패 ${res.status}: ${text.slice(0, 200)}`);
    }
    // Content-Disposition: attachment; filename="model_card.md"
    const cd = res.headers.get("content-disposition") || "";
    const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const fallback = `artifact_${kind}`;
    const filename = m ? decodeURIComponent(m[1]) : fallback;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // Stage 5 수집 원시 JSONL 다운로드. downloadArtifact 와 동일한 blob 패턴.
  downloadRawData: async (jobId: string): Promise<void> => {
    const token = tokenStore.get();
    const res = await fetch(`${BASE}/jobs/${jobId}/data/raw`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`다운로드 실패 ${res.status}: ${text.slice(0, 200)}`);
    }
    const cd = res.headers.get("content-disposition") || "";
    const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const filename = m ? decodeURIComponent(m[1]) : `${jobId.slice(0, 8)}-collected.jsonl`;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // 잡 영구 삭제 (종료된 잡 DONE/FAILED/CANCELLED) — 진행 중 잡은 같은 endpoint가 cancel
  deleteJob: (jobId: string) =>
    request<{ job_id: string; state: string }>(`/jobs/${jobId}`, { method: "DELETE" }),

  // 종료된 잡 일괄 삭제 (본인 잡 + ADMIN은 전체)
  bulkDeleteJobs: (states: string[] = ["FAILED"]) =>
    request<{ deleted: number; job_ids: string[] }>("/jobs/bulk-delete", {
      method: "POST", body: JSON.stringify({ states }),
    }),

  // 잡 모델을 HuggingFace Hub에 업로드 (DONE 상태만)
  uploadHF: (
    jobId: string,
    body: { repo_id: string; artifact_kind?: "adapter" | "merged"; private?: boolean; hf_token?: string },
  ) =>
    request<{ status: string; repo_id: string; repo_url: string; private: boolean }>(
      `/jobs/${jobId}/upload-hf`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  // 사용자 → 관리자 알림 송신 (USER/ADMIN 무관)
  notifyAdmin: (body: {
    job_id?: string;
    kind?: "env_missing" | "hw_mismatch" | "quota" | "other";
    error_code?: string;
    message: string;
    detail?: Record<string, unknown>;
  }) =>
    request<{ id: string; status: string }>("/jobs/notify-admin", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export interface NotificationItem {
  id: string;
  user_id: string;
  user_email: string;
  job_id: string | null;
  kind: string;
  error_code: string | null;
  message: string;
  detail: Record<string, unknown>;
  status: "new" | "read" | "resolved";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export { ApiError };
