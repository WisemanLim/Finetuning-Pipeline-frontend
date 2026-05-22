"use client";

/**
 * Step 3 — 데이터 선택.
 *
 * 4 모드 탭: A 업로드 | B 디렉토리 | C 인터넷 검색 | D 합성.
 * 미리보기 100건은 운영 시 별도 엔드포인트로 호출 (현재는 placeholder).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Upload, FolderOpen, Globe, Sparkles } from "lucide-react";
import { useWizard } from "@/lib/store";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import type { DataSourceMode } from "@/types/api";

export default function Step3DataPage() {
  const router = useRouter();
  const wizard = useWizard();
  const [mode, setMode] = useState<DataSourceMode>(wizard.dataSourceMode);
  const [path, setPath] = useState(wizard.dataSourcePath);
  const [keywordsText, setKeywordsText] = useState(wizard.keywords.join(", "));
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<{ filename: string; size_bytes: number } | null>(null);
  const [uploadErr, setUploadErr] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    setUploadInfo(null);
    try {
      const res = await api.uploadData(file);
      setPath(res.path);
      setUploadInfo({ filename: res.filename, size_bytes: res.size_bytes });
    } catch (err) {
      setUploadErr(String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    wizard.set({
      dataSourceMode: mode,
      dataSourcePath: path,
      keywords: keywordsText.split(",").map((k) => k.trim()).filter(Boolean),
    });
    router.push("/jobs/new/step-4-config");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">데이터 소스</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as DataSourceMode)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" /> 업로드</TabsTrigger>
              <TabsTrigger value="dir" className="gap-2"><FolderOpen className="h-4 w-4" /> 디렉토리</TabsTrigger>
              <TabsTrigger value="web" className="gap-2"><Globe className="h-4 w-4" /> 인터넷</TabsTrigger>
              <TabsTrigger value="synth" className="gap-2"><Sparkles className="h-4 w-4" /> 합성</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-3 mt-4">
              <Label htmlFor="upload-path">파일 업로드</Label>
              <Input
                id="upload-path"
                type="file"
                accept=".jsonl,.json,.csv,.parquet,.txt,.md,.html,.htm,.pdf,.docx"
                onChange={handleFileChange}
                disabled={uploading}
              />

              {uploading && (
                <p className="text-sm text-primary">업로드 중...</p>
              )}
              {uploadInfo && (
                <div className="text-sm flex items-center gap-2">
                  <Badge variant="success">업로드 완료</Badge>
                  <span className="font-mono text-xs">{uploadInfo.filename}</span>
                  <span className="text-muted-foreground">({formatBytes(uploadInfo.size_bytes)})</span>
                </div>
              )}
              {uploadErr && (
                <p className="text-sm text-destructive">{uploadErr}</p>
              )}

              <Label htmlFor="manual-path" className="pt-2">서버 측 경로 (개발용 — 직접 입력)</Label>
              <Input
                id="manual-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/home/wfp/.wfp/uploads/.../data.csv"
              />
              <p className="text-xs text-muted-foreground">
                지원: JSONL, JSON, CSV, Parquet, TXT, MD, HTML, PDF, DOCX (최대 1GB)
              </p>
            </TabsContent>

            <TabsContent value="dir" className="space-y-3 mt-4">
              <Label htmlFor="dir-path">로컬 디렉토리 경로</Label>
              <Input
                id="dir-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/Users/me/docs/"
              />
              <p className="text-xs text-muted-foreground">
                PDF / DOCX / HTML / MD / TXT 파일을 재귀 스캔하여 텍스트 추출.
              </p>
            </TabsContent>

            <TabsContent value="web" className="space-y-3 mt-4">
              <Label htmlFor="keywords">검색 키워드 (쉼표 구분)</Label>
              <Textarea
                id="keywords"
                rows={3}
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="예: 파이썬, 머신러닝, 트랜스포머"
              />
              <p className="text-xs text-muted-foreground">
                화이트리스트 도메인(위키, AIHub 등)에서만 수집. robots.txt 준수.
              </p>
            </TabsContent>

            <TabsContent value="synth" className="space-y-3 mt-4">
              <p className="text-sm">
                Self-Instruct 기반 합성 데이터 생성. 시드 데이터가 필요한 경우 위 모드 중 하나도 함께 선택하세요.
              </p>
              <p className="text-xs text-muted-foreground">
                Teacher 모델(GPT-4o 또는 강한 로컬 모델)로 instruction-response 쌍 자동 생성.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">정제 파이프라인 (자동)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1 text-muted-foreground">
          <p>1. 중복 제거 (MinHash)</p>
          <p>2. 언어 필터 (학습 언어만 통과)</p>
          <p>3. 품질 필터 (길이·공백 비율)</p>
          <p>4. PII 마스킹 (이메일·전화·주민번호·카드)</p>
          <p>5. Instruction 포맷 변환</p>
          <p>6. Train / Val / Test 분할 (8:1:1)</p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Link href="/jobs/new/step-2-model">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> 이전
          </Button>
        </Link>
        <Button onClick={handleNext} className="gap-2">
          다음 <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
