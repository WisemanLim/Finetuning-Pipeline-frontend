# Finetuning-Pipeline-frontend 비교/QA 리포트 (Eden 기준 역이식)

- 작성일: 2026-06-02
- 방향: **Eden = 기준(정답·최신), 워크스페이스 = 수정 대상(구버전)**
- 기준(REF): `/Users/wise/Developer/Web(Node,Script)/Eden-FP-frontend`
- 대상(TGT): `/Users/wise/Developer/Web(Node,Script)/Finetuning-Pipeline-frontend`
- 스택: Next.js(App Router) · TypeScript · pnpm · Tailwind

## 1. 비교 개요

Eden의 **기능적 개선만** 워크스페이스로 이식. 브랜딩/카피 차이는 미이식. 역매핑 규칙 준수: Worktro→Wise, Eden-FP-*→Finetuning-Pipeline-*, `fp_worker`→`wfp_worker`. 대상은 자신의 브랜딩(WFP, Wise) 유지.

- 변경 파일: **5** · 이식 기능: **5종** · 수정 버그: **0** · tsc: exit0→exit0 · lint: clean→clean

## 2. 반영한 변경 목록 (파일 / 기능)

- `lib/api.ts` — admin 객체에 메서드 5개 추가: `modelDownload`, `catalogDownload`, `envHfTokenStatus`, `catalogTogglePublic`, `catalogUploadModel`(multipart). `deleteHfToken`/`saveHfToken`은 대상에 이미 존재 → 미추가.
- `types/api.ts` — `CatalogItem`에 OPTIONAL 필드 추가: `downloaded?`, `downloading?`, `source?`, `is_public?`, `local_path?`, `owner_user_id?` (하위호환).
- `app/(admin)/admin/catalog/page.tsx` — 모델 다운로드 트리거, 공개/비공개 토글, `UploadDialog` 업로드 UI, `refetchInterval: 5000`, 모델 상태 셀 반영.
- `app/(app)/settings/page.tsx` — admin 전용 HF 토큰 상태 카드(`envHfTokenStatus` + effective_source Badge), `deleteHfToken` UI, 저장/삭제 시 invalidate, 카드 전체 `isAdmin` 게이트.
- `components/admin/notifications-card.tsx` — `kind === "model_download"` 처리: status 분기 mutation, 다운로드 승인 버튼, HF 라이선스 안내, NotifRow 신규 props.

## 3. 스킵한 리브랜딩 항목

- `app/(app)/jobs/[id]/page.tsx`: diff 전부 `FP-*`→`WFP-*` 에러코드 리브랜딩. 대상은 이미 `WFP-*`. **변경 없음.**
- `types/api.ts` 주석 `fp_worker`→대상 `wfp_worker` 유지(역매핑).
- `notifications-card.tsx`의 `workerCwd` 폴백 `Eden-FP-worker`→`Finetuning-Pipeline-worker` 유지(역매핑), 헤더 주석 `WFP-030x` 유지.
- `lib/store.ts`: 기능 차이 없음(주석 1줄) — 미수정.

## 4. 발견·수정한 버그

- 잠복 버그 없음. 본 작업은 기능 추가분 이식이며 대상 기존 로직 결함 없음.
- Dangling reference 사전 점검: 신규 UI가 호출하는 `catalogDownload`/`catalogTogglePublic`/`catalogUploadModel`/`envHfTokenStatus`/`modelDownload` 모두 `lib/api.ts`에 존재. `CatalogItem` 신규 필드로 `m.downloaded`/`m.source`/`m.is_public` 등 참조 타입 안전. `Badge`의 `success` variant가 대상 `components/ui/badge.tsx`에 이미 존재 확인.

## 5. 테스트 결과 (before → after)

| 검증 | before | after |
|------|--------|-------|
| `npx tsc --noEmit` | exit 0 | exit 0 (오류 0) |
| `pnpm lint` (next lint) | ✔ clean | ✔ clean |

이식으로 인한 신규 타입/린트 오류 없음.

## 6. 미해결 / 주의 항목

- **백엔드 의존**: 이식 메서드는 대상 백엔드가 엔드포인트(`/admin/jobs/{id}/model-download`, `/admin/catalog/models/{id}/download`, `/toggle-public`, `/upload`, `/admin/env/hf-token-status`) 제공해야 동작. 정적 검사 통과, 런타임 통합은 백엔드 연동 환경에서 별도 확인 필요. (worker 측에 동일 기능 이식 완료 — worker .compare 참조)
- 브랜딩 스캔: 변경 5파일 `Eden|Worktro|fp_worker|Eden-FP` 유출 없음.
- catalog 페이지는 구조 동일하여 전체 교체 방식 사용(diff 순수 additive·브랜딩 토큰 부재 확인). 향후 두 레포 catalog 비기능 영역이 갈라지면 재검토.
