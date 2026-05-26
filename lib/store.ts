/**
 * Zustand 전역 상태.
 *
 * - WizardStore: 5-step 잡 생성 위자드 진행 중 데이터 보관.
 * - 실제 잡 상태(서버 권한)는 TanStack Query 캐시에서 관리.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DataSourceMode, JobStatus, TaskType } from "@/types/api";

export interface WizardState {
  // Step 1
  ksicSection: string;
  ksicDivision: string;
  taskType: TaskType;
  description: string;
  language: string;

  // Step 2
  modelHfRepo: string;
  modelAuto: boolean;

  // Step 3
  dataSourceMode: DataSourceMode;
  dataSourcePath: string;
  keywords: string[];

  // Step 4 (고급 사용자 오버라이드)
  trainOverride: {
    num_epochs?: number;
    learning_rate?: number;
    batch_size?: number;
  };
  useAdvanced: boolean;

  // 액션
  set: (patch: Partial<Omit<WizardState, "set" | "reset" | "loadFromJob">>) => void;
  reset: () => void;
  /** failed/cancelled 잡의 spec을 위자드 store로 복원 — 재실행 시 사용. */
  loadFromJob: (job: JobStatus) => void;
}

const initial: Omit<WizardState, "set" | "reset" | "loadFromJob"> = {
  ksicSection: "",
  ksicDivision: "",
  taskType: "chat",
  description: "",
  language: "ko",
  modelHfRepo: "",
  modelAuto: true,
  dataSourceMode: "upload",
  dataSourcePath: "",
  keywords: [],
  trainOverride: {},
  useAdvanced: false,
};

export const useWizard = create<WizardState>()(
  persist(
    (set) => ({
      ...initial,
      set: (patch) => set(patch),
      reset: () => set(initial),
      loadFromJob: (job) => {
        const override = (job.train_override ?? {}) as Record<string, number | undefined>;
        const trainOverride = {
          num_epochs: typeof override.num_epochs === "number" ? override.num_epochs : undefined,
          learning_rate: typeof override.learning_rate === "number" ? override.learning_rate : undefined,
          batch_size: typeof override.batch_size === "number" ? override.batch_size : undefined,
        };
        const useAdvanced = Object.values(trainOverride).some((v) => v !== undefined);
        set({
          ksicSection: job.ksic_section ?? "",
          ksicDivision: job.ksic_division ?? "",
          taskType: (job.task_type as TaskType) ?? "chat",
          description: job.description ?? "",
          language: job.language ?? "ko",
          modelHfRepo: job.model_hf_repo ?? "",
          modelAuto: !job.model_hf_repo,
          dataSourceMode: (job.data_source_mode as DataSourceMode) ?? "upload",
          dataSourcePath: job.data_source_path ?? "",
          keywords: job.keywords ?? [],
          trainOverride,
          useAdvanced,
        });
      },
    }),
    { name: "wfp-wizard" },
  ),
);
