// 고용24 Open API 응답(원본) → 서비스 데이터 타입으로 정규화
// 공식 명세 확인 전이라 필드마다 후보 키 목록을 두고 대소문자 구분 없이 찾는다.
// 인증키 발급 후 실제 응답(`npm run collect -- <대상> --raw`)으로 후보 키를 확정한다.
import type {
  CareerRequirement,
  Education,
  EmploymentType,
  LaborStat,
  Occupation,
  Posting,
  SkillMap,
  TrainingCourse,
} from "@/lib/types";

export type Raw = Record<string, unknown>;

/** 후보 키 중 처음 발견되는 값(대소문자·밑줄 무시) */
export function pick(obj: Raw | undefined, keys: string[]): unknown {
  if (!obj) return undefined;
  const norm = (k: string) => k.toLowerCase().replace(/_/g, "");
  const index = new Map(Object.keys(obj).map((k) => [norm(k), k]));
  for (const key of keys) {
    const real = index.get(norm(key));
    if (real !== undefined && obj[real] !== "" && obj[real] != null) return obj[real];
  }
  return undefined;
}

export const str = (v: unknown): string => (v == null ? "" : String(v).trim());
export const num = (v: unknown): number | undefined => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : undefined;
};
/** XML 파서는 항목이 하나면 배열 대신 객체를 준다 */
export const list = <T = Raw>(v: unknown): T[] => (v == null ? [] : Array.isArray(v) ? (v as T[]) : [v as T]);

// ---------------------------------------------------------------- 값 정규화

const REGION_ALIAS: Record<string, string> = { 경기도: "경기", 강원특별자치도: "강원", 전북특별자치도: "전북", 제주특별자치도: "제주" };

export function normRegion(s: string): string {
  const first = str(s).split(/[\s,]+/)[0] ?? "";
  if (REGION_ALIAS[first]) return REGION_ALIAS[first];
  return first.replace(/(특별자치시|특별자치도|특별시|광역시|도)$/, "") || first;
}

/** 급여를 만원/년으로 환산. 원 단위(10만 이상)면 만원으로 바꾼다 */
export function normSalary(type: string, min?: number, max?: number): { min?: number; max?: number } {
  const toManwon = (v?: number) => (v == null ? undefined : v >= 100_000 ? v / 10_000 : v);
  const factor = /월/.test(type) ? 12 : /시/.test(type) ? 209 * 12 : /일/.test(type) ? 21.7 * 12 : 1;
  const conv = (v?: number) => {
    const m = toManwon(v);
    return m == null || m === 0 ? undefined : Math.round(m * factor);
  };
  return { min: conv(min), max: conv(max) };
}

export function normCareer(s: string): { career: CareerRequirement; minCareerYears?: number } {
  const t = str(s);
  if (/관계없음|무관/.test(t) || (/신입/.test(t) && /경력/.test(t))) return { career: "무관" };
  if (/경력/.test(t)) {
    const years = t.match(/(\d+)\s*년/);
    const months = t.match(/(\d+)\s*개월/);
    return { career: "경력", minCareerYears: years ? Number(years[1]) : months ? Number(months[1]) / 12 : 1 };
  }
  return { career: "신입" };
}

export function normEducation(s: string): Education {
  const t = str(s);
  if (/2\s*~\s*3년|초대졸|전문대/.test(t)) return "전문대졸";
  if (/대졸|대학교|학사|석사|박사/.test(t)) return "대졸";
  if (/고졸|고등학교/.test(t)) return "고졸";
  return "무관";
}

export function normEmployment(s: string): EmploymentType {
  const t = str(s);
  if (/인턴/.test(t)) return "인턴";
  if (/정규|기간의 정함이 없는|^1\d?$/.test(t)) return "정규직";
  return "계약직";
}

/** 문자열 안의 마지막 날짜(yy-mm-dd, yyyy-mm-dd, yyyymmdd)를 YYYY-MM-DD로. 없으면 fallback */
export function normDate(s: string, fallback = "2099-12-31"): string {
  const t = str(s);
  const dashed = [...t.matchAll(/(\d{2,4})[-./](\d{1,2})[-./](\d{1,2})/g)].pop();
  const compact = t.match(/\b(\d{4})(\d{2})(\d{2})\b/);
  const m = dashed ?? compact;
  if (!m) return fallback;
  const y = m[1].length === 2 ? `20${m[1]}` : m[1];
  return `${y}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** 기준년월(YYYYMM, YYYY-MM, YYYY.MM) → YYYY-MM */
export function normMonth(s: string): string {
  const d = str(s).replace(/\D/g, "");
  return d.length >= 6 ? `${d.slice(0, 4)}-${d.slice(4, 6)}` : "";
}

/** 쉼표·줄바꿈 등으로 나열된 텍스트를 키워드 목록으로 */
export function splitKeywords(s: string): string[] {
  return str(s)
    .split(/[,/·\n|]+/)
    .map((x) => x.trim())
    .filter((x) => x && x !== "-" && x !== "없음" && x !== "관계없음");
}

/** 텍스트에 등장하는 역량 태그(역량 사전 기준). 실서비스에서는 생성형 AI 추출로 대체 */
export function tagsInText(text: string, skillMap: SkillMap): string[] {
  const t = str(text).toLowerCase();
  return Object.keys(skillMap).filter((tag) => t.includes(tag.toLowerCase()));
}

// ---------------------------------------------------------------- 레코드 정규화

/** 채용목록 한 건(+ 채용상세) → Posting */
export function postingFromRaw(
  item: Raw,
  detail: { corp?: Raw; wanted?: Raw } | undefined,
  occupationMap: Record<string, string>,
  skillMap: SkillMap,
): Posting {
  const w = detail?.wanted;
  const jobsCd = str(pick(item, ["jobsCd", "jobsCode"]) ?? pick(w, ["jobsCd"]));
  const sal = normSalary(
    str(pick(item, ["salTpNm"]) ?? pick(w, ["salTpNm"])),
    num(pick(item, ["minSal"])),
    num(pick(item, ["maxSal"])),
  );
  const career = normCareer(str(pick(item, ["career"]) ?? pick(w, ["enterTpNm"])));
  const prefText = [pick(w, ["pfCond"]), pick(w, ["etcPfCond"]), pick(w, ["compAbl"])].map(str).join(",");
  const duties = str(pick(w, ["jobCont"]));
  return {
    id: str(pick(item, ["wantedAuthNo"])),
    company: str(pick(item, ["company", "corpNm"]) ?? pick(detail?.corp, ["corpNm"])),
    companySize: str(pick(detail?.corp, ["busiSize", "totPsncnt"])) || undefined,
    title: str(pick(item, ["title", "wantedTitle"]) ?? pick(w, ["wantedTitle"])),
    occupationCode: occupationMap[jobsCd] ?? jobsCd,
    region: normRegion(str(pick(item, ["region", "basicAddr"]) ?? pick(w, ["workRegion"]))),
    salaryMin: sal.min,
    salaryMax: sal.max,
    career: career.career,
    minCareerYears: career.minCareerYears,
    education: normEducation(str(pick(item, ["minEdubg"]) ?? pick(w, ["eduNm"]))),
    majors: splitKeywords(str(pick(w, ["major"]))),
    requiredCertificates: splitKeywords(str(pick(w, ["certificate"]))),
    preferred: [...new Set([...tagsInText(prefText + "," + duties, skillMap), ...splitKeywords(prefText)])],
    duties,
    talent: [], // 인재상은 생성형 AI로 공고 본문에서 추출해 채운다
    employmentType: normEmployment(str(pick(item, ["empTpNm", "empTpCd"]) ?? pick(w, ["empTpNm"]))),
    closeDate: normDate(str(pick(item, ["closeDt"]) ?? pick(w, ["receiptCloseDt"]))),
  };
}

/** 국민내일배움카드 훈련과정 한 건 → TrainingCourse */
export function trainingFromRaw(item: Raw, skillMap: SkillMap): TrainingCourse {
  const title = str(pick(item, ["title", "trprNm"]));
  return {
    id: [str(pick(item, ["trprId"])), str(pick(item, ["trprDegr"]))].filter(Boolean).join("-"),
    title,
    institution: str(pick(item, ["subTitle", "trainstNm"])),
    competencies: tagsInText(title, skillMap),
    region: normRegion(str(pick(item, ["address", "trngAreaNm"]))),
    startDate: normDate(str(pick(item, ["traStartDate", "trStaDt"]))),
    endDate: normDate(str(pick(item, ["traEndDate", "trEndDt"]))),
    cost: num(pick(item, ["courseMan"])) ?? 0,
    realCost: num(pick(item, ["realMan"])) ?? 0,
    employmentRate6: num(pick(item, ["eiEmplRate6"])),
    satisfaction: num(pick(item, ["stdgScor"])),
  };
}

/** 직업정보(요약 + 능력·지식 목록) → Occupation */
export function occupationFromRaw(summary: Raw, abilities: Raw[], knowledge: Raw[]): Occupation {
  const cls = str(pick(summary, ["jobClcd", "jobClCd", "jobClassCd"])).replace(/\D/g, "");
  const toMap = (rows: Raw[], nameKeys: string[], valueKeys: string[]) =>
    Object.fromEntries(
      rows
        .map((r) => [str(pick(r, nameKeys)), num(pick(r, valueKeys))] as const)
        .filter(([k, v]) => k && v != null),
    ) as Record<string, number>;
  return {
    code: str(pick(summary, ["jobCd", "jobCode"])),
    name: str(pick(summary, ["jobNm", "jobSmclNm"])),
    classCode: { major: cls.slice(0, 1), middle: cls.slice(0, 2), minor: cls.slice(0, 3) },
    abilities: toMap(abilities, ["jobAblNm", "ablNm"], ["jobAblStatus", "ablStatus", "importance"]),
    knowledge: toMap(knowledge, ["knwldgNm", "knowNm"], ["knwldgStatus", "knowStatus", "importance"]),
    relatedJobs: splitKeywords(str(pick(summary, ["relJobNm", "relJobs"]))),
    certificates: splitKeywords(str(pick(summary, ["relCertNm", "certificate"]))),
  };
}

/** 고용행정통계 한 행 → LaborStat (항목명은 명세 확인 후 확정) */
export function laborStatFromRaw(row: Raw): LaborStat {
  return {
    middleClass: str(pick(row, ["jobClcd", "occpClcd", "middleClass"])).replace(/\D/g, "").slice(0, 2),
    region: normRegion(str(pick(row, ["regionNm", "areaNm", "region"]))),
    month: normMonth(str(pick(row, ["baseYm", "stdrYm", "month"]))),
    newOpenings: num(pick(row, ["newRcrtCnt", "newOpenings", "rcrtPsncnt"])) ?? 0,
    newSeekers: num(pick(row, ["newSeekCnt", "newSeekers", "seekCnt"])) ?? 0,
  };
}
