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

async function proxy(req: NextRequest, params: { path: string[] }) {
  const target = `${WORKER_URL}/${params.path.join("/")}${req.nextUrl.search}`;

  // 요청 헤더 복사 후 인증 헤더 주입
  const headers = new Headers(req.headers);
  headers.delete("host");
  // TODO: NextAuth 세션에서 user_id 추출하여 헤더로 전달
  // headers.set("X-User-Id", session.user.id);

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
  };

  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
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
