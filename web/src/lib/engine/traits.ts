// 공고 인재상 키워드 ↔ 성향 5축 비교(조직 적합형 진단·추천)
import type { Traits } from "@/lib/types";

export type TraitAxis = keyof Traits;

export const TRAIT_LABELS: Record<TraitAxis, [string, string]> = {
  pace: ["속도", "신중"],
  lead: ["주도", "협력"],
  change: ["변화", "안정"],
  scope: ["큰 그림", "디테일"],
  work: ["독립", "팀"],
};

/** 인재상 키워드가 가리키는 성향(-2 ~ +2). 실서비스에서는 생성형 AI가 공고 본문에서 추출 */
const TALENT_TRAITS: Record<string, Partial<Traits>> = {
  도전: { change: -2 },
  "빠른 실행": { pace: -2 },
  주도적: { lead: -2 },
  열정: { pace: -1, change: -1 },
  혁신: { change: -2 },
  성장: { change: -1 },
  정확성: { scope: 2, pace: 1 },
  체계적: { scope: 1, change: 1 },
  꼼꼼함: { scope: 2 },
  "품질 중시": { scope: 1, pace: 1 },
  협업: { work: 2, lead: 1 },
  성실: { change: 1 },
};

/** 공고 인재상 키워드 목록 → 축별 평균 성향(언급된 축만) */
export function talentTraits(talent: string[]): Partial<Traits> {
  const sum: Partial<Record<TraitAxis, number>> = {};
  const cnt: Partial<Record<TraitAxis, number>> = {};
  for (const word of talent) {
    const t = TALENT_TRAITS[word];
    if (!t) continue;
    for (const [axis, v] of Object.entries(t) as [TraitAxis, number][]) {
      sum[axis] = (sum[axis] ?? 0) + v;
      cnt[axis] = (cnt[axis] ?? 0) + 1;
    }
  }
  const out: Partial<Traits> = {};
  for (const axis of Object.keys(sum) as TraitAxis[]) out[axis] = sum[axis]! / cnt[axis]!;
  return out;
}

/** 성향 궁합(0~100). 비교할 축이 없으면 중립값 70 */
export function traitFit(user: Traits | undefined, talent: string[]): number {
  const company = talentTraits(talent);
  const axes = Object.keys(company) as TraitAxis[];
  if (!user || axes.length === 0) return 70;
  const diff = axes.reduce((s, a) => s + Math.abs(user[a] - company[a]!), 0) / axes.length;
  return Math.round(100 - (diff / 4) * 100);
}

export interface TraitGap {
  axis: TraitAxis;
  user: number;
  company: number;
}

/** 여러 공고의 인재상과 사용자 성향의 차이가 큰 축(차이 2 이상) */
export function traitGaps(user: Traits | undefined, talents: string[][]): TraitGap[] {
  if (!user) return [];
  const merged = talentTraits(talents.flat());
  return (Object.keys(merged) as TraitAxis[])
    .map((axis) => ({ axis, user: user[axis], company: Math.round(merged[axis]! * 10) / 10 }))
    .filter((g) => Math.abs(g.user - g.company) >= 2)
    .sort((a, b) => Math.abs(b.user - b.company) - Math.abs(a.user - a.company));
}
