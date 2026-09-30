// 공고 점수: F 현재 적합도 · T 목표 기여도 · C 경력 인정 가능성 · 조건 적합 · 마감 임박
// 기준값은 설계 문서(docs/service_design.md 7장)의 초기값이며 시연 데이터로 조정한다.
import type { Education, Occupation, Posting, Profile, SkillMap } from "@/lib/types";
import { coversTag, itemsOf, occupationVector } from "./competency";

const EDU_RANK: Record<Education, number> = { 무관: 0, 고졸: 1, 전문대졸: 2, 대졸: 3 };

export interface RequirementCheck {
  key: "education" | "major" | "career" | "certificate";
  label: string;
  passed: boolean;
}

export interface FitResult {
  score: number; // 0~100
  checks: RequirementCheck[];
  matched: string[];
  missing: string[];
}

/** F 현재 적합도 = 필수 요건 충족률 × 0.6 + 우대 태그 충족률 × 0.4 */
export function currentFit(profile: Profile, posting: Posting, skillMap: SkillMap): FitResult {
  const checks: RequirementCheck[] = [
    {
      key: "education",
      label: `학력 ${posting.education}`,
      passed: EDU_RANK[profile.education] >= EDU_RANK[posting.education],
    },
  ];
  if (posting.majors?.length) {
    checks.push({
      key: "major",
      label: `전공 ${posting.majors.join("·")}`,
      passed: posting.majors.includes(profile.major),
    });
  }
  checks.push({
    key: "career",
    label: posting.career === "경력" ? `관련 경력 ${posting.minCareerYears ?? 1}년 이상` : `경력 ${posting.career}`,
    passed: posting.career !== "경력" || profile.careerYears >= (posting.minCareerYears ?? 1),
  });
  if (posting.requiredCertificates?.length) {
    checks.push({
      key: "certificate",
      label: `자격 ${posting.requiredCertificates.join("·")}`,
      passed: posting.requiredCertificates.every((c) => profile.certificates.includes(c)),
    });
  }
  const req = checks.filter((c) => c.passed).length / checks.length;
  const matched = posting.preferred.filter((t) => coversTag(profile.competencies, t, skillMap));
  const missing = posting.preferred.filter((t) => !matched.includes(t));
  const pref = posting.preferred.length ? matched.length / posting.preferred.length : 1;
  return { score: Math.round(100 * (0.6 * req + 0.4 * pref)), checks, matched, missing };
}

/** 전체 직업의 항목별 평균(중심화용) */
export function meanVector(occupations: Occupation[]): Record<string, number> {
  const sum: Record<string, number> = {};
  for (const o of occupations) for (const [k, v] of Object.entries(occupationVector(o))) sum[k] = (sum[k] ?? 0) + v;
  const mean: Record<string, number> = {};
  for (const k of Object.keys(sum)) mean[k] = sum[k] / occupations.length;
  return mean;
}

/** 평균을 뺀 벡터의 코사인 유사도(0~100, 음수는 0) */
export function occupationSimilarity(a: Occupation, b: Occupation, mean: Record<string, number>): number {
  const va = occupationVector(a);
  const vb = occupationVector(b);
  let dot = 0, na = 0, nb = 0;
  for (const k of Object.keys(mean)) {
    const x = (va[k] ?? 0) - mean[k];
    const y = (vb[k] ?? 0) - mean[k];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return Math.max(0, Math.round((dot / Math.sqrt(na * nb)) * 100));
}

/** T 목표 기여도 = 직업 유사도 × 0.85 + 공고 우대 태그의 목표 핵심 항목 비율 × 0.15 */
export function targetContribution(
  posting: Posting,
  postingOcc: Occupation,
  targets: Occupation[],
  mean: Record<string, number>,
  skillMap: SkillMap,
): number {
  let best = 0;
  for (const target of targets) {
    const sim = occupationSimilarity(postingOcc, target, mean);
    const tv = occupationVector(target);
    const items = [...itemsOf(posting.preferred, skillMap)];
    const relevant = items.length ? items.filter((i) => (tv[i] ?? 0) >= 70).length / items.length : 0;
    best = Math.max(best, Math.round(0.85 * sim + 15 * relevant));
  }
  return best;
}

/** C 경력 인정 가능성 — 직업분류 계층 거리 */
export function careerRecognition(postingOcc: Occupation, targets: Occupation[]): number {
  let best = 10;
  for (const t of targets) {
    const a = postingOcc.classCode, b = t.classCode;
    if (a.minor === b.minor) best = Math.max(best, 100);
    else if (a.middle === b.middle) best = Math.max(best, 70);
    else if (a.major === b.major) best = Math.max(best, 40);
  }
  return best;
}

/** 조건 적합(지역·희망 임금) */
export function conditionFit(profile: Profile, posting: Posting): number {
  const region = posting.region === profile.region ? 1 : 0.3;
  let salary = 0.7;
  if (profile.minSalary && posting.salaryMax) salary = posting.salaryMax >= profile.minSalary ? 1 : 0.5;
  return Math.round(100 * (0.6 * region + 0.4 * salary));
}

/** 남은 날짜(마감일 포함) */
export function daysLeft(closeDate: string, today: string): number {
  const ms = Date.parse(closeDate) - Date.parse(today);
  return Math.round(ms / 86_400_000);
}

/** 마감 임박도 */
export function urgency(days: number): number {
  if (days <= 7) return 100;
  if (days <= 14) return 60;
  return 30;
}
