/**
 * WebSocket 진행 스트림 클라이언트.
 *
 * ml-worker의 `/ws/{job_id}` 엔드포인트 연결.
 * 자동 재연결 + ping/pong 처리 + onmessage 콜백.
 */

import type { ProgressEvent } from "@/types/api";

/**
 * WS base URL 결정.
 *
 * 우선순위:
 *  1. `NEXT_PUBLIC_WS_BASE` — 전체 URL 명시 (예: `wss://wfp.example.com`).
 *     리버스 프록시로 `/ws/*` 가 worker 로 라우팅되는 운영 환경에서 사용.
 *  2. 로컬 dev (host = localhost / 127.x) → `ws://<host>:8000`.
 *  3. 운영 기본 — 페이지 호스트 + `NEXT_PUBLIC_WORKER_WS_PORT` (기본 8000).
 *     scheme 은 페이지 protocol 에서 유도 (http→ws / https→wss).
 *
 * 운영 노출 주의: worker 포트(기본 8000) 가 브라우저에서 접근 가능해야 함.
 *  - docker-compose 운영 — `ports: ["8000:8000"]` 추가 또는 Traefik/nginx 로
 *    `/ws/*` 만 worker 로 프록시 후 `NEXT_PUBLIC_WS_BASE` 명시.
 */
function resolveWsBase(): string {
  const envBase = process.env.NEXT_PUBLIC_WS_BASE;
  if (envBase) return envBase.replace(/\/$/, "");

  if (typeof window === "undefined") return "ws://localhost:8000";

  const host = window.location.hostname;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";

  if (host === "localhost" || host.startsWith("127.")) {
    return `${proto}://${host}:8000`;
  }

  const port = process.env.NEXT_PUBLIC_WORKER_WS_PORT || "8000";
  return `${proto}://${host}:${port}`;
}

export interface WsOptions {
  onMessage: (ev: ProgressEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
  /** 자동 재연결 간격 (ms). 0이면 비활성. */
  reconnectMs?: number;
}

export class JobProgressWS {
  private ws: WebSocket | null = null;
  private closedByUser = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private jobId: string, private opts: WsOptions) {}

  connect(): void {
    this.ws = new WebSocket(`${resolveWsBase()}/ws/${this.jobId}`);

    this.ws.onopen = () => this.opts.onOpen?.();
    this.ws.onclose = () => {
      this.opts.onClose?.();
      if (!this.closedByUser && this.opts.reconnectMs && this.opts.reconnectMs > 0) {
        this.reconnectTimer = setTimeout(() => this.connect(), this.opts.reconnectMs);
      }
    };
    this.ws.onerror = (e) => this.opts.onError?.(e);
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.ping) return; // 서버 keep-alive
        this.opts.onMessage(data as ProgressEvent);
      } catch (err) {
        console.error("WS 메시지 파싱 실패:", err);
      }
    };
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
