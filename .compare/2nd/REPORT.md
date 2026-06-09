# frontend 비교/QA 리포트 — 2nd pass

- 작성일: 2026-06-09
- 방향: **Eden-FP-frontend = 기준(정답·최신), 워크스페이스 Finetuning-Pipeline-frontend = 수정 대상**
- 기준(REF): `/Users/wise/Developer/Web(Node,Script)/Eden-FP-frontend`
- 대상(TGT): `/Users/wise/Developer/Web(Node,Script)/Finetuning-Pipeline-frontend`
- 1st 리포트: `.compare/1st/REPORT.md`
- 스택: Next.js(App Router) · TypeScript · pnpm
- 네이밍 규칙: Worktro→Wise, Eden-FP-*→Finetuning-Pipeline-*, FP-→WFP- (리브랜딩 차이는 버그 아님, 미이식)

## 1. 비교 개요 (2nd)

1st에서 카탈로그/HF토큰/알림 기능을 이식함. 2nd는 현재 디스크 상태를 Eden과 재diff하여 잔여 격차 점검. **모델 포맷 변환 UI 격차 발견 → 이식.**

## 2. 1st 대비 잔여 차이 (2nd에서 발견)

Eden에 있고 워크스페이스에 미반영이던 **on-demand 모델 포맷 변환 + 업로드 model_format** UI. 변환 트리거 → 상태 폴링 → 다운로드 흐름.

## 3. 추가 이식/수정 내역 (이번 pass)

| 파일 | 변경 | 내용 |
|------|------|------|
| `app/(app)/jobs/[id]/artifacts/page.tsx` | +176 | 파인튜닝 완료 모델을 gguf/mlx/pytorch/onnx/merged로 on-demand 변환 후 다운로드 UI. `convertArtifact` 트리거 + `convertStatus` 폴링, GGUF 양자화 선택(Q4_K_M/Q5_K_M/Q6_K/q8_0/f16), 포맷 라벨·경고 |
| `app/(admin)/admin/catalog/page.tsx` | +54 | 카탈로그 모델 파일 다운로드(zip) 버튼(source=finetuned/upload), `포맷` 컬럼(model_format Badge + 추론전용 표시), 업로드 다이얼로그에 모델 포맷 select(auto/safetensors/gguf/mlx/pytorch/onnx/other) |
| `lib/api.ts` | +39 | `admin.catalogDownloadFiles(entryId)`, `convertArtifact(jobId,format,quant)`→`POST /jobs/{id}/convert`, `convertStatus(jobId)`→`GET /jobs/{id}/convert/status` |
| `types/api.ts` | +34 | `ConvertFormat`, `FormatStatus`, `ConvertResult`, `ConvertStatusResult`, `CatalogItem.model_format?`/`is_finetunable?` |

리브랜딩 토큰 유출 없음(Wise/WFP/Finetuning-Pipeline 유지).

## 4. 백엔드 정합성 (중요)

2nd 시작 시점에 프론트는 변환 엔드포인트를 호출하나 **worker 백엔드에 변환 구현이 없어 런타임 404 위험**이 있었음. 동일 pass에서 **worker 측 변환 백엔드를 이식 완료**(worker `.compare/2nd/REPORT.md` 참조):
- `POST /jobs/{id}/convert` (ConvertResult) ✓
- `GET /jobs/{id}/convert/status` (ConvertStatusResult) ✓
- 카탈로그 파일 다운로드 + `model_format` 컬럼 ✓

→ 프론트↔워커 계약 정합 확보. 정적 검사 통과, 런타임 통합은 연동 환경에서 최종 확인 권장.

## 5. 스킵한 리브랜딩 항목

- 제품명 Worktro→Wise, `fp_worker`→`wfp_worker` 주석, `Eden-FP-*` 경로 폴백→`Finetuning-Pipeline-*`, 에러코드 `FP-`→`WFP-` 차이 — 미이식.

## 6. 테스트 결과 (before → after)

| 검증 | before | after |
|------|--------|-------|
| `npx tsc --noEmit` | exit 0 | **exit 0** (오류 0) |
| `pnpm lint` | ✔ clean | **✔ No ESLint warnings or errors** |

이식 메서드(`catalogDownloadFiles`/`convertArtifact`/`convertStatus`)·타입(`ConvertResult`/`ConvertStatusResult`/`ConvertFormat`/`FormatStatus`) 모두 정의 존재 확인, dangling reference 0.

## 7. 미해결 / 주의 항목

- 변환 실행은 worker 측 외부 도구(llama.cpp/mlx-lm 등) 설치에 의존 — UI는 미설치 시 worker의 `ToolingMissingError` 응답을 표시하는 경로 확인 권장.
- 런타임 e2e(변환 트리거→폴링→다운로드)는 worker 연동 환경에서 검증 권장.
