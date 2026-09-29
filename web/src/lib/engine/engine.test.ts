import { describe, expect, it } from "vitest";
import { DEMO_TODAY, getMockDataset, getPersonas } from "@/data";
import type { Persona } from "@/lib/types";
import { coverageFor, currentFit, diagnose, matchTrainings, missingTargetTags, recommend } from "@/lib/engine";

const data = getMockDataset();
const personas = getPersonas();
const byId = (id: string) => personas.find((p) => p.profile.id === id) as Persona;
const run = (p: Persona) => recommend(p.profile, p.applications, data, DEMO_TODAY);

describe("탈락 원인 진단", () => {
  it.each(personas.map((p) => [p.profile.alias, p] as const))("%s — 기대 진단 유형", (_, p) => {
    expect(run(p).diagnosis.type).toBe(p.expected.diagnosis);
  });

  it("자격 격차형: 가장 큰 장벽은 관련 경력(5곳 중 4곳)", () => {
    const d = run(byId("P-A12")).diagnosis;
    expect(d.stats.total).toBe(5);
    expect(d.barriers[0]).toEqual({ key: "career", count: 4 });
  });

  it("조직 적합형: 면접 탈락 공고의 공통 인재상과 성향 차이를 찾는다", () => {
    const d = run(byId("P-B07")).diagnosis;
    expect(d.talentPattern).toContain("도전");
    expect(d.traitGaps.map((g) => g.axis)).toContain("pace");
  });

  it("서류 표현형: 결과 대기 지원은 탈락 비율 계산에서 뺀다", () => {
    const d = run(byId("P-C33")).diagnosis;
    expect(d.stats.total).toBe(6);
    expect(d.stats.decided).toBe(5);
  });

  it("지원 3회 미만이면 판단 보류", () => {
    const p = byId("P-A12");
    expect(diagnose(p.profile, p.applications.slice(0, 2), data.postings, data.skillMap).type).toBe("판단보류");
  });
});

describe("공고 점수", () => {
  it("경력 요구 공고는 경력 요건을 통과하지 못한다", () => {
    const e01 = data.postings.find((p) => p.id === "MOCK-E01")!;
    const fit = currentFit(byId("P-A12").profile, e01, data.skillMap);
    expect(fit.checks.find((c) => c.key === "career")?.passed).toBe(false);
    expect(fit.score).toBeLessThan(60);
  });

  it("사용자 태그가 우대 태그의 항목을 모두 포함하면 충족으로 본다(도면 작성 → 도면 해독)", () => {
    const d01 = data.postings.find((p) => p.id === "MOCK-D01")!;
    const fit = currentFit(byId("P-A12").profile, d01, data.skillMap);
    expect(fit.matched).toContain("도면 해독");
  });
});

describe("추천", () => {
  it.each(personas.filter((p) => p.expected.bestPostingId).map((p) => [p.profile.alias, p] as const))(
    "%s — 지금 지원 1순위",
    (_, p) => {
      expect(run(p).best?.posting.id).toBe(p.expected.bestPostingId);
    },
  );

  it("자격 격차형: 사다리 단계 분류가 설계와 일치한다", () => {
    const p = byId("P-A12");
    const rec = run(p);
    for (const [tier, ids] of Object.entries(p.expected.tiers ?? {})) {
      const got = rec.tiers[tier as keyof typeof rec.tiers].map((s) => s.posting.id);
      for (const id of ids) expect(got, `${tier}에 ${id}`).toContain(id);
    }
    expect(rec.tracks).toEqual(["ladder"]);
  });

  it("서류 표현형·조직 적합형은 방향 전환 트랙으로 목표 직종 공고를 다시 추천한다", () => {
    for (const id of ["P-B07", "P-C33"]) {
      const rec = run(byId(id));
      expect(rec.tracks).toEqual(["redirect"]);
      expect(rec.redirect.length).toBeGreaterThan(0);
      expect(rec.redirect.every((s) => s.tier === "target")).toBe(true);
    }
  });

  it("조직 적합형: 인재상 궁합이 맞는 공고가 앞선다", () => {
    const ids = run(byId("P-B07")).redirect.map((s) => s.posting.id);
    expect(ids.indexOf("MOCK-Q01")).toBeLessThan(ids.indexOf("MOCK-V01"));
  });

  it("합격 가능성이 낮은 목표 공고(F < 80)는 1순위가 되지 않는다", () => {
    for (const p of personas) {
      const best = run(p).best;
      if (best?.tier === "target") expect(best.fit.score).toBeGreaterThanOrEqual(80);
    }
  });

  it("이미 지원한 회사와 마감된 공고는 추천하지 않는다", () => {
    for (const p of personas) {
      const rec = run(p);
      const applied = new Set(
        data.postings.filter((x) => p.applications.some((a) => a.postingId === x.id)).map((x) => x.company),
      );
      for (const sp of Object.values(rec.tiers).flat()) {
        expect(applied.has(sp.posting.company)).toBe(false);
        expect(sp.daysLeft).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("역량 충족도·훈련", () => {
  it("추천 공고에서 1년 일하면 목표 역량 충족도가 오른다", () => {
    const p = byId("P-A12");
    const rec = run(p);
    const cov = coverageFor(p.profile, rec, rec.best, data)!;
    expect(cov.afterYear!).toBeGreaterThan(cov.now);
  });

  it("목표 공고에서 부족한 우대 역량(3D CAD)을 채우는 훈련과정을 먼저 추천하고, 무관한 과정은 뺀다", () => {
    const p = byId("P-A12");
    const rec = run(p);
    const cov = coverageFor(p.profile, rec, rec.best, data)!;
    const ids = matchTrainings({ items: cov.missing, tags: missingTargetTags(rec) }, p.profile, data).map((t) => t.id);
    expect(ids[0]).toBe("MOCK-T01");
    expect(ids).not.toContain("MOCK-T05");
  });
});
