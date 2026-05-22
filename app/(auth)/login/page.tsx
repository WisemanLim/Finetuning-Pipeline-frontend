"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.login(email, password),
    onSuccess: () => router.push("/dashboard"),
    onError: (e) => {
      const msg = e instanceof ApiError
        ? (e.payload as { detail?: string })?.detail || e.message
        : String(e);
      setErr(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>WFP 계정으로 로그인하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password" type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <div className="relative my-6">
          <Separator />
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-card px-2 text-xs text-muted-foreground">
            또는
          </span>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full" disabled>Google로 로그인 (미구현)</Button>
          <Button variant="outline" className="w-full" disabled>GitHub로 로그인 (미구현)</Button>
          <Button variant="outline" className="w-full" disabled>Kakao로 로그인 (미구현)</Button>
        </div>

        <p className="text-sm text-center text-muted-foreground mt-6">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-primary hover:underline">가입하기</Link>
        </p>
      </CardContent>
    </Card>
  );
}
