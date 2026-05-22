"use client";

/** 모델/카테고리/프리셋 카탈로그 관리. */
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AdminCatalogPage() {
  return (
    <>
      <Header title="카탈로그 관리" subtitle="모델 / 카테고리 / 데이터 소스 화이트리스트" />
      <div className="p-6">
        <Tabs defaultValue="models">
          <TabsList>
            <TabsTrigger value="models">모델</TabsTrigger>
            <TabsTrigger value="categories">카테고리 프리셋</TabsTrigger>
            <TabsTrigger value="whitelist">도메인 화이트리스트</TabsTrigger>
          </TabsList>

          <TabsContent value="models">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">등록 모델</CardTitle>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> 모델 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HF Repo</TableHead>
                      <TableHead>Params (B)</TableHead>
                      <TableHead>License</TableHead>
                      <TableHead>HW Min VRAM</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-xs">Qwen/Qwen2.5-Coder-7B-Instruct</TableCell>
                      <TableCell>7</TableCell>
                      <TableCell>apache-2.0</TableCell>
                      <TableCell>6 GB</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">편집</Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                KSIC 21개 섹션별 프리셋 (추천 모델 / 데이터 소스 / 전략). 운영 시 DB의 `category_preset` 테이블과 연동.
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whitelist">
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                인터넷 수집 허용 도메인 목록. ml-worker `_WHITELIST_DOMAINS` 와 동기화.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
