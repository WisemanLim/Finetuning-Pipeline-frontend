"use client";

/**
 * KSIC 대분류 선택 카드.
 *
 * 21개 섹션을 그리드로 표시. 선택 시 store에 ksicSection 저장.
 */
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { KsicSection } from "@/lib/ksic";

interface Props {
  section: KsicSection;
  selected?: boolean;
  onSelect?: (code: string) => void;
}

export function CategoryCard({ section, selected, onSelect }: Props) {
  // lucide-react 아이콘 동적 참조 (KSIC 정의 시 문자열로 지정)
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    section.icon
  ] || Icons.Folder;

  return (
    <Card
      onClick={() => onSelect?.(section.code)}
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        section.color,
        selected && "ring-2 ring-primary border-primary",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-white/60 backdrop-blur">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs font-mono">
              {section.code}
            </Badge>
            {section.modelTag !== "general" && (
              <Badge variant="secondary" className="text-xs">
                {section.modelTag}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-sm truncate">{section.koName}</h3>
          <p className="text-xs text-muted-foreground truncate">{section.enName}</p>
        </div>
      </div>
    </Card>
  );
}
