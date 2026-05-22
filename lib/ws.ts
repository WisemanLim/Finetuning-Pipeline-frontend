/**
 * WebSocket 진행 스트림 클라이언트.
 *
 * ml-worker의 `/ws/{job_id}` 엔드포인트 연결.
 * 자동 재연결 + ping/pong 처리 + onmessage 콜백.
 */

import type { ProgressEvent } from "@/types/api";

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
    // Next.js dev에서는 ml-worker 직접 (rewrites는 HTTP만 적용됨)
    const base =
      typeof window !== "undefined" && window.location.host.includes("localhost")
        ? "ws://localhost:8000"
        : "wss://" + (typeof window !== "undefined" ? window.location.host : "");

    this.ws = new WebSocket(`${base}/ws/${this.jobId}`);

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
