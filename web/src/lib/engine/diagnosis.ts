// 탈락 원인 진단 — 지원 공고의 요건 충족도 평균 × 서류/면접 탈락 비율
import type { Application, DiagnosisType, Posting, Profile, SkillMap } from "@/lib/types";
import { currentFit, type RequirementCheck } from "./scores";
import { traitGaps, type TraitGap } from "./traits";

export interface Diagnosis {
  type: DiagnosisType;
  stats: {
    total: number;
    decided: number; // 결과가 나온 지원(대기 제외)
    docFail: number;
    interviewFail: number;
    avgFit: number;
  };
  /** 지원 공고에서 충족하지 못한 필수 요건 — 예: 5곳 중 4곳이 관련 경력 요구 */
  barriers: { key: RequirementCheck["key"]; count: number }[];
  /** 면접 탈락 공고들의 공통 인재상 키워드 */
  talentPattern: string[];
  traitGaps: TraitGap[];
}

export const THRESHOLDS = { minApplications: 3, lowFit: 60, highFit: 80, failRate: 0.6 };

export function diagnose(
  profile: Profile,
  applications: Application[],
  postings: Posting[],
  skillMap: SkillMap,
): Diagnosis {
  const byId = new Map(postings.map((p) => [p.id, p]));
  const rows = applications
    .map((a) => ({ a, p: byId.get(a.postingId) }))
    .filter((r): r is { a: Application; p: Posting } => !!r.p)
    .map((r) => ({ ...r, fit: currentFit(profile, r.p, skillMap) }));

  const decided = rows.filter((r) => r.a.result !== "대기");
  const docFail = decided.filter((r) => r.a.result === "서류탈락").length;
  const interviewFail = decided.filter((r) => r.a.result === "면접탈락").length;
  const avgFit = rows.length ? Math.round(rows.reduce((s, r) => s + r.fit.score, 0) / rows.length) : 0;

  const barrierCount = new Map<RequirementCheck["key"], number>();
  for (const r of rows) for (const c of r.fit.checks) if (!c.passed) barrierCount.set(c.key, (barrierCount.get(c.key) ?? 0) + 1);
  const barriers = [...barrierCount.entries()].map(([key, count]) => ({ key, count })).sort((x, y) => y.count - x.count);

  const interviewed = rows.filter((r) => r.a.result === "면접탈락").map((r) => r.p.talent);
  const wordCount = new Map<string, number>();
  for (const t of interviewed) for (const w of new Set(t)) wordCount.set(w, (wordCount.get(w) ?? 0) + 1);
  const talentPattern = [...wordCount.entries()].filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1]).map(([w]) => w);

  const n = decided.length || 1;
  const docRate = docFail / n;
  const intRate = interviewFail / n;
  const { minApplications, lowFit, highFit, failRate } = THRESHOLDS;

  let type: DiagnosisType;
  if (rows.length < minApplications) type = "판단보류";
  else if (avgFit < lowFit && docRate >= failRate) type = "자격격차형";
  else if (avgFit >= highFit && docRate >= failRate) type = "서류표현형";
  else if (avgFit >= highFit && intRate >= failRate) type = "조직적합형";
  else type = "혼합형";

  return {
    type,
    stats: { total: rows.length, decided: decided.length, docFail, interviewFail, avgFit },
    barriers,
    talentPattern,
    traitGaps: type === "조직적합형" ? traitGaps(profile.traits, interviewed) : [],
  };
}
