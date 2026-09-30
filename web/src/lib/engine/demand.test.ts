import { describe, expect, it } from "vitest";
import { getMockDataset } from "@/data";
import { demandComparison } from "@/lib/engine";

const stats = getMockDataset().laborStats;

describe("채용 수요 비교", () => {
  it("같은 지역·최근 달의 직종별 구인배수를 높은 순으로, 이 공고·목표 직종을 표시한다", () => {
    const { month, rows } = demandComparison(stats, "경기", "81", ["15"]);
    expect(month).toBe("2026-10");
    expect(rows.map((r) => r.middleClass)).toEqual(["81", "82", "13", "15"]);
    expect(rows[0]).toMatchObject({ ratio: 1.63, isPosting: true, isTarget: false });
    expect(rows.at(-1)).toMatchObject({ ratio: 0.4, isTarget: true });
  });

  it("다른 지역 통계는 섞지 않는다", () => {
    expect(demandComparison(stats, "서울", "13", []).rows.every((r) => r.openings !== 2410)).toBe(true);
  });
});
