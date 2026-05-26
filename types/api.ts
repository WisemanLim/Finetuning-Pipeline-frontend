/**
 * ml-worker(FastAPI) API 타입 정의.
 *
 * 백엔드 wfp_worker.common.types Pydantic 모델과 1:1 대응.
 * 변경 시 양쪽 동기화 필요.
 */

export type JobState = "PENDING" | "RUNNING" | "EVAL" | "DONE" | "FAILED" | "CANCELLED";

export type TaskType = "chat" | "qa" | "summary" | "classification" | "code";

export type DataSourceMode = "upload" | "dir" | "web" | "synth";

export type TrainStrategy = "full_ft" | "lora" | "qlora" | "dpo" | "orpo";

export type Quantization = "none" | "int8" | "int4";

export type ArtifactKind = "adapter" | "merged" | "gguf" | "zip" | "model_card";

export interface GPUInfo {
  index: number;
  name: string;
  vendor: string;
  vram_gb: number;
  compute_capability: string;
  utilization_pct: number;
  temperature_c: number;
}

export interface HWCaps {
  os: string;
  cpu: { brand: string; cores_physical: number; cores_logical: number; has_avx2: boolean; has_avx512: boolean };
  gpus: GPUInfo[];
  ram_gb: number;
  disk_free_gb: number;
  network_mbps: number;
  max_vram_gb: number;
  unified_memory_gb: number;
  cuda_available: boolean;
  mps_available: boolean;
}

export interface RecommendedPlan {
  rule_id: string;
  max_model_params_b: number;
  strategies: TrainStrategy[];
  quantization: Quantization[];
  recommended_strategy: TrainStrategy | null;
  recommended_quant: Quantization;
  backend: string;
  max_seq_length: number;
  batch_size: number;
  gradient_accumulation: number;
  warning: string;
}

export interface Artifact {
  kind: ArtifactKind;
  uri: string;
  size_bytes: number;
  sha256: string;
  created_at: string;
}

export interface JobStatus {
  job_id: string;
  state: JobState;
  current_stage: number;
  error_code: string;
  error_message: string;
  artifacts: Artifact[];
  // 재실행 prefill용 spec 필드 (백엔드 _to_detail에서 채움)
  ksic_section?: string;
  ksic_division?: string;
  task_type?: TaskType;
  description?: string;
  language?: string;
  model_hf_repo?: string;
  data_source_mode?: DataSourceMode;
  data_source_path?: string;
  keywords?: string[];
  train_override?: Record<string, unknown>;
  /** 과거 이벤트 — WS 미연결 (FAILED/완료) 상태에서 진행 로그 확인용 */
  events?: string[];
}

export interface JobCreateRequest {
  user_id?: string;
  ksic_section: string;
  ksic_division?: string;
  task_type: TaskType;
  description: string;
  language?: string;
  model_hf_repo?: string;
  data_source_mode?: DataSourceMode;
  data_source_path?: string;
  keywords?: string[];
  train_override?: Record<string, unknown>;
  /** HW 규칙 매칭 실패에도 fallback plan으로 강제 진행 (PRD §8). 사용자 confirm 후 true. */
  allow_force_plan?: boolean;
}

export interface ProgressEvent {
  job_id: string;
  msg: string;
  extra: {
    stage?: number;
    state?: string;
    step?: number;
    total_steps?: number;
    /** 0~1 — 현재 stage 안에서의 sub-progress (Stage 7 학습 등) */
    stage_progress?: number;
    loss?: number;
    eval_loss?: number;
    epoch?: number;
    [key: string]: unknown;
  };
}

/** 모델 카탈로그 카드 (ml-worker model_catalog.ModelEntry와 대응) */
export interface ModelCard {
  hf_repo: string;
  params_b: number;
  language: string[];
  license: string;
  hw_min_vram_gb: number;
  tags: string[];
}
