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
  },
};

export { ApiError };
