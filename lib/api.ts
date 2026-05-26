/**
 * ml-worker REST API 클라이언트.
 *
 * BFF 패턴 — Next.js rewrite `/api/worker/*` → FastAPI `http://localhost:8000/*`.
 * TanStack Query에서 호출되는 fetcher 함수들의 단일 진입점.
 *
 * JWT 토큰은 localStorage에 저장 (간단한 데모 — 운영은 httpOnly 쿠키 권장).
 */

import type {
  HWCaps,
  JobCreateRequest,
  JobStatus,
  ModelCard,
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
    // 401 → 토큰 제거 + 로그인 리다이렉트 (세션 만료 시)
    if (res.status === 401) {
      const hadToken = !!tokenStore.get();
      tokenStore.clear();
      if (hadToken && typeof window !== "undefined") {
        window.location.href = "/login";
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
    listCatalog: () => request<Array<Record<string, unknown>>>("/admin/catalog/models"),
    createCatalog: (body: Record<string, unknown>) =>
      request("/admin/catalog/models", { method: "POST", body: JSON.stringify(body) }),
    patchCatalog: (id: string, body: Record<string, unknown>) =>
      request(`/admin/catalog/models/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteCatalog: (id: string) =>
      request(`/admin/catalog/models/${id}`, { method: "DELETE" }),
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
  },

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
