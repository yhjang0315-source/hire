// 목표 직종 비교(P2): 직종 2~3개를 같은 기준으로 나란히 본다.
// 역량 충족도 · 필요 자격증 · 내 지역 공고(신입 가능·가장 잘 맞는 공고) · 구인배수 · 성향 궁합
import type { Dataset } from "@/data";
import type { Occupation, Posting, Profile } from "@/lib/types";
import { coverage, type Coverage } from "./competency";
import { currentFit, daysLeft } from "./scores";
import { traitFit } from "./traits";
import type { Recommendation } from "./recommend";

export const COMPARE_MAX = 3;

export interface OccupationCompare {
  occupation: Occupation;
  isTarget: boolean;
  coverage: Coverage;
  certificates: { name: string; have: boolean }[];
  openings: number; // 내 지역 모집 중 공고
  entryOpenings: number; // 그중 신입·경력무관
  best: { posting: Posting; fit: number } | null; // 현재 적합도가 가장 높은 공고
  demandRatio: number | null; // 내 지역 중분류 구인배수
  traitFit: number | null; // 공고 인재상과의 평균 성향 궁합
}

export function compareOccupations(profile: Profile, occupations: Occupation[], data: Dataset, today: string): OccupationCompare[] {
  const month = data.laborStats.map((s) => s.month).sort().at(-1);
  return occupations.slice(0, COMPARE_MAX).map((occ) => {
    const open = data.postings.filter((p) => p.occupationCode === occ.code && p.region === profile.region && daysLeft(p.closeDate, today) >= 0);
    const fits = open.map((posting) => ({ posting, fit: currentFit(profile, posting, data.skillMap).score })).sort((a, b) => b.fit - a.fit);
    const stat = data.laborStats.find((s) => s.middleClass === occ.classCode.middle && s.region === profile.region && s.month === month);
    const traits = profile.traits && open.length ? Math.round(open.reduce((n, p) => n + traitFit(profile.traits, p.talent), 0) / open.length) : null;
    return {
      occupation: occ,
      isTarget: profile.targetOccupationCodes.includes(occ.code),
      coverage: coverage(profile.competencies, occ, data.skillMap),
      certificates: occ.certificates.map((name) => ({ name, have: profile.certificates.includes(name) })),
      openings: open.length,
      entryOpenings: open.filter((p) => p.career !== "경력").length,
      best: fits[0] ?? null,
      demandRatio: stat && stat.newSeekers > 0 ? Math.round((stat.newOpenings / stat.newSeekers) * 100) / 100 : null,
      traitFit: traits,
    };
  });
}

/** 기본 비교 대상: 목표 직종 + 지금 지원 1순위·경력 발판 공고의 직종(최대 3개) */
export function defaultCompareCodes(profile: Profile, rec: Recommendation): string[] {
  const codes = [
    ...profile.targetOccupationCodes,
    rec.best?.occupation.code,
    ...rec.tiers.stepping.map((sp) => sp.occupation.code),
    ...rec.tiers.growing.map((sp) => sp.occupation.code),
    ...rec.tiers.immediate.map((sp) => sp.occupation.code),
  ].filter((c): c is string => !!c);
  return [...new Set(codes)].slice(0, COMPARE_MAX);
}

/** 지표별로 가장 나은 직종 — 동률이면 표시하지 않는다(표의 ▲ 표시와 요약 문장에 쓴다) */
export function compareHighlights(rows: OccupationCompare[]) {
  const top = (value: (r: OccupationCompare) => number | null | undefined) => {
    const vals = rows.map((r) => ({ code: r.occupation.code, v: value(r) })).filter((x): x is { code: string; v: number } => typeof x.v === "number");
    const max = Math.max(...vals.map((x) => x.v));
    const winners = vals.filter((x) => x.v === max);
    return winners.length === 1 ? winners[0].code : null;
  };
  return {
    coverage: top((r) => r.coverage.now),
    fit: top((r) => r.best?.fit),
    entry: top((r) => r.entryOpenings || null),
    demand: top((r) => r.demandRatio),
    traitFit: top((r) => r.traitFit),
  };
}
