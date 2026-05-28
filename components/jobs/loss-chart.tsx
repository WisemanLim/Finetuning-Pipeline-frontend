"use client";

/** Recharts 기반 학습 손실 그래프 (Step 7 진행 중 표시). */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  step: number;
  loss?: number;
  eval_loss?: number;
}

export function LossChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
        손실 데이터 대기 중...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={170}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="step" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: 6,
          }}
        />
        <Line type="monotone" dataKey="loss" stroke="#3b82f6" strokeWidth={2} dot={false} name="train_loss" />
        <Line type="monotone" dataKey="eval_loss" stroke="#ef4444" strokeWidth={2} dot={false} name="eval_loss" />
      </LineChart>
    </ResponsiveContainer>
  );
}
