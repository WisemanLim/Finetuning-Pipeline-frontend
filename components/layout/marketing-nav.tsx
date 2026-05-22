"use client";

/**
 * 마케팅 페이지 우측 nav.
 *
 * localStorage 토큰 존재 시 → "대시보드 이동" 버튼만 노출.
 * 없으면 로그인/시작하기 버튼.
 *
 * SSR hydration 미스매치 회피용으로 mount 후에만 렌더.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { tokenStore } from "@/lib/api";

export function MarketingNav() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(!!tokenStore.get());
  }, []);

  // hydration 안정성 — mount 전에는 동일 트리 렌더
  if (authed === null) {
    return <div className="flex items-center gap-4 h-9" aria-hidden />;
  }

  if (authed) {
    return (
      <>
        <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
          요금
        </Link>
        <Link href="/dashboard">
          <Button size="sm">대시보드</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
        요금
      </Link>
      <Link href="/login">
        <Button variant="ghost" size="sm">로그인</Button>
      </Link>
      <Link href="/signup">
        <Button size="sm">시작하기</Button>
      </Link>
    </>
  );
}
