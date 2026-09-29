// 추천: 공고별 점수 → 사다리 단계 분류 → 지금 지원 1순위
import type { Application, DiagnosisType, Occupation, Posting, Profile, Tier, TrainingCourse } from "@/lib/types";
import type { Dataset } from "@/data";
import { coverage, itemsOf, type Coverage } from "./competency";
import { diagnose, type Diagnosis } from "./diagnosis";
import {
  careerRecognition,
  conditionFit,
  currentFit,
  daysLeft,
  meanVector,
  targetContribution,
  urgency,
  type FitResult,
} from "./scores";
import { traitFit } from "./traits";

export interface ScoredPosting {
  posting: Posting;
  occupation: Occupation;
  fit: FitResult; // F
  contribution: number; // T
  recognition: number; // C
  condition: number;
  urgency: number;
  daysLeft: number;
  traitFit: number;
  jobsPerSeeker?: number; // 구인배수
  tier: Tier | null;
  score: number; // S
}

export type Track = "ladder" | "redirect";

export interface Recommendation {
  diagnosis: Diagnosis;
  tracks: Track[];
  tiers: Record<Tier, ScoredPosting[]>;
  /** 방향 전환 트랙: 목표 직종 안에서 다시 도전할 공고 */
  redirect: ScoredPosting[];
  best: ScoredPosting | null;
  targets: Occupation[];
}

export const TIER_RULES = { stepping: { minC: 70, minF: 60 }, growing: { minT: 50, maxC: 70, minF: 60 }, immediate: { minF: 80 } };
export const BEST_RULES = { minF: 60, minTargetF: 80 };
const PER_TIER = 5;

function weights(type: DiagnosisType, searchMonths: Profile["searchMonths"]) {
  const w =
    type === "조직적합형"
      ? { F: 0.3, T: 0.15, cond: 0.1, urg: 0.05, trait: 0.4 }
      : { F: 0.45, T: 0.3, cond: 0.15, urg: 0.1, trait: 0 };
  if (searchMonths === 1) {
    w.F += 0.1;
    w.T -= 0.1;
  }
  return w;
}

function classify(sp: Omit<ScoredPosting, "tier" | "score">, targets: Occupation[]): Tier | null {
  const F = sp.fit.score;
  if (targets.some((t) => t.code === sp.occupation.code)) return "target";
  if (sp.recognition >= TIER_RULES.stepping.minC && sp.posting.career !== "경력" && F >= TIER_RULES.stepping.minF) return "stepping";
  if (sp.contribution >= TIER_RULES.growing.minT && sp.recognition < TIER_RULES.growing.maxC && F >= TIER_RULES.growing.minF) return "growing";
  if (F >= TIER_RULES.immediate.minF) return "immediate";
  return null;
}

export function recommend(
  profile: Profile,
  applications: Application[],
  data: Dataset,
  today: string,
): Recommendation {
  const occByCode = new Map(data.occupations.map((o) => [o.code, o]));
  const targets = profile.targetOccupationCodes.map((c) => occByCode.get(c)).filter((o): o is Occupation => !!o);
  const mean = meanVector(data.occupations);
  const diagnosis = diagnose(profile, applications, data.postings, data.skillMap);
  const w = weights(diagnosis.type, profile.searchMonths);

  const appliedIds = new Set(applications.map((a) => a.postingId));
  const appliedCompanies = new Set(data.postings.filter((p) => appliedIds.has(p.id)).map((p) => p.company));

  const scored: ScoredPosting[] = [];
  for (const posting of data.postings) {
    const occupation = occByCode.get(posting.occupationCode);
    if (!occupation || appliedIds.has(posting.id) || appliedCompanies.has(posting.company)) continue;
    const left = daysLeft(posting.closeDate, today);
    if (left < 0) continue;
    const stat = data.laborStats.find((s) => s.middleClass === occupation.classCode.middle && s.region === posting.region);
    const base = {
      posting,
      occupation,
      fit: currentFit(profile, posting, data.skillMap),
      contribution: targetContribution(posting, occupation, targets, mean, data.skillMap),
      recognition: careerRecognition(occupation, targets),
      condition: conditionFit(profile, posting),
      urgency: urgency(left),
      daysLeft: left,
      traitFit: traitFit(profile.traits, posting.talent),
      jobsPerSeeker: stat ? Math.round((stat.newOpenings / stat.newSeekers) * 100) / 100 : undefined,
    };
    const score = Math.round(
      w.F * base.fit.score + w.T * base.contribution + w.cond * base.condition + w.urg * base.urgency + w.trait * base.traitFit,
    );
    scored.push({ ...base, tier: classify(base, targets), score });
  }

  const byScore = (a: ScoredPosting, b: ScoredPosting) => b.score - a.score;
  const tiers: Record<Tier, ScoredPosting[]> = { target: [], stepping: [], growing: [], immediate: [] };
  for (const sp of scored) if (sp.tier) tiers[sp.tier].push(sp);
  for (const t of Object.keys(tiers) as Tier[]) tiers[t] = tiers[t].sort(byScore).slice(0, PER_TIER);

  const tracks: Track[] =
    diagnosis.type === "서류표현형" || diagnosis.type === "조직적합형"
      ? ["redirect"]
      : diagnosis.type === "혼합형"
        ? ["ladder", "redirect"]
        : ["ladder"];

  const redirect = tracks.includes("redirect")
    ? tiers.target.filter((sp) => sp.fit.score >= BEST_RULES.minF).sort(byScore)
    : [];

  const eligible = (tracks.includes("ladder") ? Object.values(tiers).flat() : redirect).filter(
    (sp) => sp.fit.score >= BEST_RULES.minF && !(sp.tier === "target" && sp.fit.score < BEST_RULES.minTargetF),
  );
  const best = eligible.sort(byScore)[0] ?? null;

  return { diagnosis, tracks, tiers, redirect, best, targets };
}

/** 목표 직업 대비 역량 충족도(지금 → 추천 공고에서 1년 후 예상) */
export function coverageFor(profile: Profile, rec: Recommendation, sp: ScoredPosting | null, data: Dataset): Coverage | null {
  const target = rec.targets[0];
  if (!target) return null;
  return coverage(profile.competencies, target, data.skillMap, sp?.occupation);
}

/** 부족 항목을 채워주는 훈련과정(지역 우선, 6개월 취업률 순) */
export function matchTrainings(missingItems: string[], profile: Profile, data: Dataset, limit = 3): TrainingCourse[] {
  const missing = new Set(missingItems);
  return data.trainings
    .map((t) => ({ t, hit: [...itemsOf(t.competencies, data.skillMap)].filter((i) => missing.has(i)).length }))
    .filter((x) => x.hit > 0)
    .sort(
      (a, b) =>
        b.hit - a.hit ||
        Number(b.t.region === profile.region) - Number(a.t.region === profile.region) ||
        (b.t.employmentRate6 ?? 0) - (a.t.employmentRate6 ?? 0),
    )
    .slice(0, limit)
    .map((x) => x.t);
}
