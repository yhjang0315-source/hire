// 채용 수요 비교: 같은 지역의 직종(중분류)별 구인배수 = 신규구인인원 ÷ 신규구직건수
import type { LaborStat } from "@/lib/types";

export interface DemandRow {
  middleClass: string;
  name: string;
  ratio: number; // 구인배수(소수 둘째 자리)
  openings: number;
  seekers: number;
  isPosting: boolean; // 이 공고의 직종
  isTarget: boolean; // 목표 직종
}

/** 가장 최근 달 기준, 구인배수 높은 순 */
export function demandComparison(
  stats: LaborStat[],
  region: string,
  postingClass: string,
  targetClasses: string[],
): { month: string; rows: DemandRow[] } {
  const inRegion = stats.filter((s) => s.region === region);
  const month = inRegion.map((s) => s.month).sort().at(-1) ?? "";
  const rows = inRegion
    .filter((s) => s.month === month && s.newSeekers > 0)
    .map((s) => ({
      middleClass: s.middleClass,
      name: s.className ?? `직종 ${s.middleClass}`,
      ratio: Math.round((s.newOpenings / s.newSeekers) * 100) / 100,
      openings: s.newOpenings,
      seekers: s.newSeekers,
      isPosting: s.middleClass === postingClass,
      isTarget: targetClasses.includes(s.middleClass),
    }))
    .sort((a, b) => b.ratio - a.ratio);
  return { month, rows };
}
