# WFP Frontend (Next.js)

**Wise Fine-tuning Pipeline** — 비기술 사용자용 웹 UI.

Next.js 14 (App Router) + shadcn/ui + TanStack Query + Tailwind + next-intl 기반.
Finetuning-Pipeline-worker(FastAPI)와 통신하여 KSIC 분야 선택 → 5-step 위자드 → 학습 모니터링 →
Gradio Playground 추론 시연 → 아티팩트 다운로드까지 전 흐름을 제공한다.

---

## 빠른 시작

### 1. 의존성 설치

```bash
cd Finetuning-Pipeline-frontend
pnpm install     # 또는 npm install / yarn
```

### 2. 환경 변수

```bash
cp .env.example .env.local
# 필요한 값(WFP_WORKER_URL, NEXTAUTH_SECRET 등) 채우기
```

`.env.local` 핵심 항목:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `WFP_WORKER_URL` | `http://localhost:8000` | Finetuning-Pipeline-worker FastAPI 엔드포인트 |
| `NEXTAUTH_SECRET` | (필수) | `openssl rand -base64 32`로 생성 |
| `NEXTAUTH_URL` | `http://localhost:3000` | 콜백 URL 베이스 |
| `GRADIO_BASE_URL` | `http://localhost:7860` | Playground iframe 출처 |
| `NEXT_PUBLIC_AUTH_DISABLED` | (없음) | 개발용 — `true`면 미들웨어 인증 우회 |

### 3. 개발 서버 실행

```bash
pnpm dev
# → http://localhost:3000
```

### 4. Finetuning-Pipeline-worker 동시 실행

별도 터미널:

```bash
# 권장 — .env 자동 로드 (SUPERVISOR_ID/PASSWORD 포함)
make dev-worker

# 또는 직접
cd ~/Developer/DA\(Python,R,...\)/Finetuning-Pipeline-worker
cp .env.example .env   # 최초 1회, SUPERVISOR_ID/PASSWORD 설정
source .venv/bin/activate
uvicorn wfp_worker.server:app --port 8000 --reload
```

### 5. 빌드 / 타입체크

```bash
pnpm typecheck
pnpm build
pnpm start    # 프로덕션 서버
```

### 6. Docker 통합 실행

워커 + 프론트 + DB/Redis/MinIO를 전체 스택으로 기동하려면 `Finetuning-Pipeline-ops`의 Makefile 사용.

#### 전체 컨테이너 모드

```bash
cd ~/Developer/Web\(Node,Script\)/Finetuning-Pipeline-ops
make docker-dev          # GPU 자동 감지 — 권장
make docker-dev-cpu      # CPU 강제
make docker-dev-gpu      # GPU 강제 (nvidia 런타임 필요)
```

#### 하이브리드 모드 (인프라 docker + web 호스트)

호스트에서 `pnpm dev`(핫리로드) 또는 `pnpm build/start`(prod) 직접 실행. 인프라만 docker. Apple Silicon GPU/MPS, 빠른 HMR, 직접 디버깅에 유리.

```bash
# 호스트 foreground (Ctrl+C 정지)
make dev-web                # pnpm dev (HMR)
make prod-web               # pnpm build → pnpm start

# 하이브리드 — 인프라(docker) + web(호스트 PM2 관리)
make docker-dev-via-host    # = docker-infra + PM2 start wfp-web-dev (+ wfp-worker-dev)
make docker-prod-via-host   # = docker-infra + pnpm build + PM2 start wfp-web-prod (+ wfp-worker-prod)

make host-status            # pm2 list
make host-logs-web          # pm2 logs wfp-web-*
make host-monit             # pm2 monit (실시간)
make host-restart           # pm2 restart 전체
make host-down              # pm2 delete all + pm2 kill + 포트 3000 좀비 정리
```

via-host는 `Finetuning-Pipeline-ops/scripts/ecosystem.config.cjs` 사용 — PM2 ecosystem에 web dev/prod 각각 정의. 자동 재시작, 중앙 로그, 상태 모니터링.

**dev/prod 대칭**: HMR (dev) vs build/start (prod), env-check 강도 차이 외에 모든 인프라/도구 체인 동일.

`make bootstrap`이 pnpm(corepack) + pm2(npm) 자동 설치.

상세: [`../Finetuning-Pipeline-ops/docker/README.md`](../Finetuning-Pipeline-ops/docker/README.md)

#### 단독 이미지 빌드

```bash
docker build -t wfp-frontend:latest .
docker run -p 3000:3000 -e WFP_WORKER_URL=http://host.docker.internal:8000 wfp-frontend:latest
```

`public/` 디렉토리는 빈 상태여도 무방 — Dockerfile builder 단계에서 자동 생성 (`mkdir -p public`). `.gitkeep`이 디렉토리 트래킹용.

---

## 기술 스택

| 영역 | 도구 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | RSC + Server Actions |
| UI 컴포넌트 | shadcn/ui (Radix UI) | 소스 소유, MIT |
| 스타일 | Tailwind CSS v3.4 | HSL CSS 변수 토큰 |
| 데이터 페칭 | TanStack Query v5 | 잡 폴링 + 캐시 |
| WebSocket | native WebSocket | `JobProgressWS` 래퍼 |
| 폼 | react-hook-form + zod | 향후 적용 (현재 controlled state) |
| 차트 | Recharts | 학습 손실 그래프 |
| 상태 | Zustand (위자드 흐름) | persist 미들웨어 |
| 인증 | NextAuth (Auth.js) | Credentials + OAuth |
| i18n | next-intl | 한/영 (메시지 카탈로그 추가 예정) |
| 아이콘 | lucide-react | KSIC 카테고리 아이콘 |

---

## 페이지 구조

```
app/
├── (marketing)/        # 공개 영역
│   ├── page.tsx        # 랜딩
│   └── pricing/        # 요금
├── (auth)/             # 인증 영역
│   ├── login/
│   ├── signup/
│   └── callback/
├── (app)/              # 사용자 영역 (사이드바 layout)
│   ├── dashboard/      # 잡 현황 + HW
│   ├── jobs/
│   │   ├── new/        # 5-step 위자드 (Zustand persist)
│   │   │   ├── step-1-category/    # KSIC 21개 카드
│   │   │   ├── step-2-model/       # 모델 카드 + HW 적합도
│   │   │   ├── step-3-data/        # 4 모드 탭
│   │   │   ├── step-4-config/      # 권장값 + 고급
│   │   │   └── step-5-confirm/     # 요약 + 잡 생성 POST
│   │   ├── [id]/                   # 모니터링 (WS + 손실 그래프)
│   │   │   ├── playground/         # Gradio iframe
│   │   │   └── artifacts/          # 다운로드 리스트
│   │   └── page.tsx                # 잡 이력
│   └── settings/
├── (admin)/            # ADMIN 권한
│   ├── users/
│   ├── jobs/           # 전체 잡 + 강제 취소
│   ├── resources/      # GPU·디스크
│   ├── catalog/        # 모델/카테고리 CRUD
│   └── audit/
└── api/
    ├── auth/[...nextauth]/   # NextAuth handler
    └── proxy/[...path]/      # BFF 프록시 (대체 경로)
```

### 라우팅 그룹

- `(marketing)`: 미인증 접근 허용. 랜딩, 요금 등.
- `(auth)`: 미인증 전용. 로그인/회원가입.
- `(app)`: 인증 필요. 사이드바 layout.
- `(admin)`: ADMIN 권한 필요. 별도 admin 사이드바.

각 그룹은 layout.tsx로 독립 layout을 가진다.

---

## Finetuning-Pipeline-worker 통신

### REST

`lib/api.ts`의 단일 진입점 사용.

```ts
import { api } from "@/lib/api";

const caps = await api.hwCaps();
const { job_id } = await api.createJob({ ksic_section: "J", ... });
const status = await api.getJob(job_id);
```

경로: `/api/worker/*` → `next.config.mjs`의 rewrites가
`${WFP_WORKER_URL}/*`로 전달.

### WebSocket

`lib/ws.ts`의 `JobProgressWS` 사용.

```tsx
const ws = new JobProgressWS(jobId, {
  onMessage: (ev) => console.log(ev),
  reconnectMs: 3000,
});
ws.connect();
```

dev 환경에서는 직접 `ws://localhost:8000/ws/{id}`로 연결.
운영 환경에서는 NestJS gateway에 WS 프록시 라우트 추가 필요.

---

## 5-step 위자드 흐름

1. **분야 선택** — KSIC 21개 카드 + 태스크 타입 + 설명(10자+)
2. **모델 선택** — 자동(1순위 채택) 또는 수동(카드/HF repo)
3. **데이터 선택** — 업로드 / 디렉토리 / 인터넷 / 합성
4. **학습 설정** — 권장값 표시 + 고급 모드 오버라이드
5. **실행 확인** — 요약 후 POST → 모니터링 페이지로

진행 데이터는 Zustand store (`lib/store.ts`)에 persist되어
새로고침해도 유지. 잡 생성 성공 시 `reset()`.

---

## Gradio Playground 연동

Stage 9 완료 후 Finetuning-Pipeline-worker가 잡별 Gradio 프로세스를 띄우면
`/jobs/{id}/playground`에서 iframe으로 임베드.

CSP 헤더는 `next.config.mjs`에서 `frame-src 'self' http://localhost:7860 https://*.gradio.app`로 설정.

운영 환경에서는 NestJS gateway에 `/api/playground/{job_id}` 프록시 추가하여
JWT 검증 후 Gradio로 전달.

---

## 데스크탑 빌드 (Tauri)

```bash
# 별도 패키지 (예정): Finetuning-Pipeline-frontend/desktop/
# 동일 Next.js 빌드 출력(`out/`)을 Tauri WebView에 임베드
pnpm build && pnpm export
cd desktop && pnpm tauri build
```

PRD §7.5.3 기준 — Electron 대비 메모리 사용량 1/5, 번들 크기 1/10.

---

## i18n (한국어/영어)

`messages/ko.json`, `messages/en.json`에 메시지 카탈로그 추가 후
`next-intl`의 `useTranslations()` 훅으로 참조.
현재 빌드는 한국어 하드코딩 — i18n 적용은 차후 마이그레이션.

---

## 디렉토리 트리

```
Finetuning-Pipeline-frontend/
├── app/                # Next.js App Router
├── components/
│   ├── ui/             # shadcn/ui primitives
│   ├── layout/         # sidebar, header
│   └── jobs/           # wizard-stepper, category-card, ...
├── lib/
│   ├── api.ts          # Finetuning-Pipeline-worker REST 클라이언트
│   ├── ws.ts           # WebSocket 클라이언트
│   ├── ksic.ts         # KSIC 21개 + 태스크 타입
│   ├── store.ts        # Zustand 위자드 store
│   └── utils.ts        # cn, formatBytes, ...
├── types/
│   └── api.ts          # Finetuning-Pipeline-worker Pydantic 모델 1:1 매핑
├── messages/           # next-intl 메시지 카탈로그
├── middleware.ts       # 인증 보호 경로
├── next.config.mjs
├── tailwind.config.ts
├── components.json     # shadcn 설정
└── package.json
```

---

## 개발 팁

- 인증 우회: `.env.local`에 `NEXT_PUBLIC_AUTH_DISABLED=true` 설정 시 미들웨어 통과.
- 세션 만료(401): API 호출 시 기존 토큰이 있으면 자동으로 `/login`으로 리다이렉트. 토큰 만료 기본 7일.
- 모델 카탈로그: 현재 클라이언트 하드코딩(`FALLBACK_MODELS`). 운영 시 Finetuning-Pipeline-worker `/models?section=...` 엔드포인트 추가 필요.
- WebSocket 디버깅: 브라우저 개발자 도구 → Network → WS 탭에서 메시지 확인.
- Zustand persist 초기화: 브라우저 LocalStorage의 `wfp-wizard` 키 삭제.

---

## TODO (향후 작업)

- [ ] NextAuth providers (Google/GitHub/Kakao) 실제 연동
- [ ] `useTranslations` 적용 (현재 메시지 한국어 하드코딩)
- [ ] Finetuning-Pipeline-worker `/models?section=...` 엔드포인트 + 클라이언트 동기화
- [ ] 잡 리스트 GET `/api/worker/jobs?user_id=...`
- [ ] 파일 업로드 멀티파트 폼 처리 (Step 3)
- [ ] 다크 모드 토글 (이미 globals.css에 `.dark` 클래스 정의됨)
- [ ] Tauri 데스크탑 패키징
- [ ] E2E 테스트 (Playwright)
