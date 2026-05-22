/**
 * KSIC 분류 정의.
 *
 * 대분류 (A~U, 21개) — PRD §3, ml-worker types.py의 VALID_KSIC_SECTIONS 와 동기.
 * 중분류 (Division)는 운영 시 catalog-service API로 조회.
 */

export interface KsicSection {
  code: string;
  koName: string;
  enName: string;
  /** 카테고리 카드 아이콘용 lucide-react 아이콘 이름 */
  icon: string;
  /** PRD §3.2 — 카테고리별 권장 모델 태그 */
  modelTag: "code" | "medical" | "finance" | "general";
  /** UI 카드 배경 색상 클래스 (Tailwind) */
  color: string;
}

export const KSIC_SECTIONS: KsicSection[] = [
  { code: "A", koName: "농업·임업·어업", enName: "Agriculture, Forestry and Fishing", icon: "Sprout", modelTag: "general", color: "bg-green-50 border-green-200" },
  { code: "B", koName: "광업", enName: "Mining and Quarrying", icon: "Pickaxe", modelTag: "general", color: "bg-stone-50 border-stone-200" },
  { code: "C", koName: "제조업", enName: "Manufacturing", icon: "Factory", modelTag: "general", color: "bg-orange-50 border-orange-200" },
  { code: "D", koName: "전기·가스·증기·공기조절", enName: "Electricity, Gas, Steam", icon: "Zap", modelTag: "general", color: "bg-yellow-50 border-yellow-200" },
  { code: "E", koName: "수도·하수·폐기물 처리", enName: "Water Supply, Sewerage, Waste", icon: "Droplets", modelTag: "general", color: "bg-cyan-50 border-cyan-200" },
  { code: "F", koName: "건설업", enName: "Construction", icon: "HardHat", modelTag: "general", color: "bg-amber-50 border-amber-200" },
  { code: "G", koName: "도매·소매업", enName: "Wholesale and Retail Trade", icon: "ShoppingCart", modelTag: "general", color: "bg-pink-50 border-pink-200" },
  { code: "H", koName: "운수·창고업", enName: "Transportation and Storage", icon: "Truck", modelTag: "general", color: "bg-blue-50 border-blue-200" },
  { code: "I", koName: "숙박·음식점업", enName: "Accommodation and Food", icon: "UtensilsCrossed", modelTag: "general", color: "bg-rose-50 border-rose-200" },
  { code: "J", koName: "정보통신업", enName: "Information and Communication", icon: "Code", modelTag: "code", color: "bg-indigo-50 border-indigo-200" },
  { code: "K", koName: "금융·보험업", enName: "Financial and Insurance", icon: "Banknote", modelTag: "finance", color: "bg-emerald-50 border-emerald-200" },
  { code: "L", koName: "부동산업", enName: "Real Estate", icon: "Building2", modelTag: "general", color: "bg-slate-50 border-slate-200" },
  { code: "M", koName: "전문·과학·기술 서비스", enName: "Professional, Scientific, Technical", icon: "FlaskConical", modelTag: "general", color: "bg-purple-50 border-purple-200" },
  { code: "N", koName: "사업시설·관리·임대", enName: "Administrative and Support", icon: "Briefcase", modelTag: "general", color: "bg-gray-50 border-gray-200" },
  { code: "O", koName: "공공행정·국방·사회보장", enName: "Public Administration", icon: "Landmark", modelTag: "general", color: "bg-neutral-50 border-neutral-200" },
  { code: "P", koName: "교육 서비스업", enName: "Education", icon: "GraduationCap", modelTag: "general", color: "bg-sky-50 border-sky-200" },
  { code: "Q", koName: "보건·사회복지 서비스", enName: "Human Health and Social Work", icon: "HeartPulse", modelTag: "medical", color: "bg-red-50 border-red-200" },
  { code: "R", koName: "예술·스포츠·여가", enName: "Arts, Sports, Recreation", icon: "Palette", modelTag: "general", color: "bg-fuchsia-50 border-fuchsia-200" },
  { code: "S", koName: "협회·단체·수리·기타", enName: "Other Service Activities", icon: "Wrench", modelTag: "general", color: "bg-zinc-50 border-zinc-200" },
  { code: "T", koName: "가구 내 고용 활동", enName: "Households as Employers", icon: "Home", modelTag: "general", color: "bg-lime-50 border-lime-200" },
  { code: "U", koName: "국제·외국기관", enName: "International Organizations", icon: "Globe", modelTag: "general", color: "bg-teal-50 border-teal-200" },
];

export const TASK_TYPES = [
  { value: "chat", label: "대화 (Chat)", description: "일반 대화형 어시스턴트" },
  { value: "qa", label: "질의응답 (QA)", description: "도메인 지식 기반 Q&A" },
  { value: "summary", label: "요약 (Summary)", description: "긴 문서 요약" },
  { value: "classification", label: "분류 (Classification)", description: "텍스트 카테고리 분류" },
  { value: "code", label: "코드 생성 (Code)", description: "프로그래밍 코드 작성·완성" },
] as const;

export type TaskType = (typeof TASK_TYPES)[number]["value"];
