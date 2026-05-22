"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", confirm: "", name: "" });
  const [err, setErr] = useState<string>("");

  const mutation = useMutation({
    mutationFn: () => api.signup(form.email, form.password, form.name || undefined),
    onSuccess: (data) => {
      alert(`회원가입이 완료되었습니다.\n환영합니다, ${data.user.name || data.user.email}님!`);
      router.push("/dashboard");
    },
    onError: (e) => {
      const msg = e instanceof ApiError
        ? (e.payload as { detail?: string })?.detail || e.message
        : String(e);
      setErr(msg);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (form.password !== form.confirm) {
      setErr("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email" type="email" required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">이름 (선택)</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password" type="password" required minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">비밀번호 확인</Label>
            <Input
              id="confirm" type="password" required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>

          {err && (
            <p className="text-sm text-destructive">{err}</p>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "처리 중..." : "가입하기"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-4">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary hover:underline">로그인</Link>
        </p>
      </CardContent>
    </Card>
  );
}
