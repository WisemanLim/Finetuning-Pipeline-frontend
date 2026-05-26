/**
 * BFF 프록시 — Finetuning-Pipeline-worker 런타임 전달.
 *
 * next.config.mjs rewrites는 빌드타임 평가라 Docker 환경에서 WFP_WORKER_URL
 * 미반영. 이 핸들러가 런타임에 env 읽어 worker로 전달.
 *
 * /api/proxy/* → ${WFP_WORKER_URL}/*
 */
import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WFP_WORKER_URL || "http://localhost:8000";

// 클라이언트로 전달할 응답 헤더 (특히 파일 다운로드 대응)
const FORWARD_HEADERS = [
  "content-type",
  "content-length",
  "content-disposition",
  "content-encoding",
  "cache-control",
  "etag",
  "last-modified",
  "accept-ranges",
];

async function proxy(req: NextRequest, params: { path: string[] }) {
  const target = `${WORKER_URL}/${params.path.join("/")}${req.nextUrl.search}`;

  // 요청 헤더 복사 후 hop-by-hop 헤더 제거
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  // TODO: NextAuth 세션에서 user_id 추출하여 헤더로 전달

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
    // @ts-expect-error - Node fetch supports duplex for streaming
    duplex: "half",
  };

  try {
    const res = await fetch(target, init);
    // 응답 헤더 화이트리스트 전달 — 바이너리/Content-Disposition 보존
    const outHeaders = new Headers();
    for (const h of FORWARD_HEADERS) {
      const v = res.headers.get(h);
      if (v) outHeaders.set(h, v);
    }
    // body 스트림 그대로 전달 (text() 호출 시 바이너리 깨짐)
    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "worker_unreachable", detail: (err as Error).message },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
