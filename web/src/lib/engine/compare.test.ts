import { describe, expect, it } from "vitest";
import { getMockDataset, getPersonas, DEMO_TODAY } from "@/data";
import { compareHighlights, compareOccupations, defaultCompareCodes, recommend } from "@/lib/engine";

const data = getMockDataset();
const persona = (id: string) => getPersonas().find((x) => x.profile.id === id)!;
const occ = (codes: string[]) => codes.map((c) => data.occupations.find((o) => o.code === c)!);

describe("compareOccupations", () => {
  const p = persona("P-A12");
  const rows = compareOccupations(p.profile, occ(["1511", "8111", "1521"]), data, DEMO_TODAY);

  it("목표 직종 표시와 내 지역 모집 중 공고만 센다", () => {
    expect(rows.map((r) => r.isTarget)).toEqual([true, false, false]);
    for (const r of rows) {
      expect(r.entryOpenings).toBeLessThanOrEqual(r.openings);
      if (r.best) expect(r.best.posting.region).toBe(p.profile.region);
    }
  });

  it("품질관리는 지금 잘 맞는 공고(D사)와 1 이상의 구인배수를 보여 준다", () => {
    const qc = rows[1];
    expect(qc.best?.posting.id).toBe("MOCK-D01");
    expect(qc.demandRatio).toBeGreaterThan(1);
    expect(rows[0].demandRatio).toBeLessThan(1);
  });

  it("지표별 최고 직종: 지금 적합도·구인배수는 품질관리", () => {
    const hi = compareHighlights(rows);
    expect(hi.fit).toBe("8111");
    expect(hi.demand).toBe("8111");
  });

  it("동률이면 최고 표시를 하지 않는다", () => {
    const c = persona("P-C33");
    const tie = compareOccupations(c.profile, occ(["1331", "1332"]), data, DEMO_TODAY);
    expect(tie[0].demandRatio).toBe(tie[1].demandRatio);
    expect(compareHighlights(tie).demand).toBeNull();
  });

  it("최대 3개까지만 비교한다", () => {
    expect(compareOccupations(p.profile, data.occupations, data, DEMO_TODAY)).toHaveLength(3);
  });
});

describe("defaultCompareCodes", () => {
  it("목표 직종을 먼저, 이어서 추천 공고 직종을 중복 없이 담는다", () => {
    const p = persona("P-A12");
    const codes = defaultCompareCodes(p.profile, recommend(p.profile, p.applications, data, DEMO_TODAY));
    expect(codes[0]).toBe("1511");
    expect(codes).toContain("8111");
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBeLessThanOrEqual(3);
  });
});
