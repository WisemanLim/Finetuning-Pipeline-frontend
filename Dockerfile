# =============================================================================
# WFP Frontend — Next.js 14 (App Router) — standalone 빌드
# Multi-stage: deps → builder → runner. 최종 이미지 ~150MB.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — deps: 의존성만 설치 (pnpm 캐시 최대 활용)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

# 빌드 의존성 (sharp 이미지 처리, native modules)
RUN apk add --no-cache libc6-compat

RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

WORKDIR /app
# pnpm v11 설정 파일도 함께 복사 (allowBuilds, .npmrc)
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml .npmrc* ./
RUN CI=true pnpm install --frozen-lockfile || CI=true pnpm install

# -----------------------------------------------------------------------------
# Stage 2 — builder: Next.js standalone 출력
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# public/ 디렉토리 보장 — 빈 디렉토리는 git이 추적하지 않음
RUN mkdir -p public

# Next.js standalone — node_modules 자동 추적 + 최소 산출물
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# next.config.mjs에 output: 'standalone' 추가 권장
RUN pnpm build

# -----------------------------------------------------------------------------
# Stage 3 — runner: 슬림 런타임
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 비루트 유저 (보안)
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# Next.js standalone 출력 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# 헬스체크 — 루트 페이지 응답 확인
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
