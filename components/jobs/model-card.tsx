"use client";

/**
 * 모델 후보 카드 — Step 2에서 사용.
 *
 * HW 적합도 (max_vram_gb) + 라이선스 + 태그 표시.
 * 클릭 시 store.modelHfRepo 설정.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Cpu, Languages, FileText } from "lucide-react";
import type { ModelCard as ModelCardType } from "@/types/api";

interface Props {
  model: ModelCardType;
  selected?: boolean;
  maxVramGb?: number;
  onSelect?: (repo: string) => void;
}

export function ModelCard({ model, selected, maxVramGb, onSelect }: Props) {
  // HW 적합도 — 사용자 VRAM 대비 모델 최소 VRAM 비율
  const hwFit = maxVramGb && maxVramGb > 0
    ? Math.min(100, Math.round((maxVramGb / model.hw_min_vram_gb) * 50))
    : 50;

  return (
    <Card
      onClick={() => onSelect?.(model.hf_repo)}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary border-primary",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{model.hf_repo}</h3>
            <p className="text-xs text-muted-foreground mt-1">{model.params_b}B parameters</p>
          </div>
          <Badge variant="outline" className="ml-2 text-xs">
            {model.license}
          </Badge>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" />
            VRAM ≥ {model.hw_min_vram_gb}GB
            <span className={cn("font-medium", hwFit >= 80 ? "text-green-600" : hwFit >= 50 ? "text-amber-600" : "text-red-600")}>
              ({hwFit}% 적합)
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Languages className="h-3.5 w-3.5" />
            {model.language.join(", ")}
          </div>
          {model.tags.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <div className="flex gap-1 flex-wrap">
                {model.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
