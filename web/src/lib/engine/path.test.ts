import { describe, expect, it } from "vitest";
import { DEMO_TODAY, getMockDataset, getPersonas } from "@/data";
import { careerPath, recommend } from "@/lib/engine";

const data = getMockDataset();
const pathOf = (id: string) => {
  const p = getPersonas().find((x) => x.profile.id === id)!;
  return careerPath(p.profile, recommend(p.profile, p.applications, data, DEMO_TODAY), data);
};

describe("커리어 경로", () => {
  it("자격 격차형: 지금 → 1순위(역량 키우기) → 경력 발판 → 목표, 충족도는 줄지 않는다", () => {
    const stages = pathOf("P-A12");
    expect(stages.map((s) => s.key)).toEqual(["now", "first", "stepping", "target"]);
    expect(stages[1].posting?.posting.id).toBe("MOCK-D01");
    expect(stages[2].posting?.posting.id).toBe("MOCK-F01");
    for (let i = 1; i < stages.length; i++) expect(stages[i].coverage).toBeGreaterThanOrEqual(stages[i - 1].coverage);
    expect(stages[1].coverage).toBeGreaterThan(stages[0].coverage);
    expect(stages[3].note).toContain("일반기계기사");
  });

  it("방향 전환 트랙: 역량보다 서류·면접 보완이 다음 단계", () => {
    const b = pathOf("P-B07");
    expect(b.map((s) => s.key)).toEqual(["now", "prepare", "target"]);
    expect(b[1].title).toBe("면접 보완");
    expect(pathOf("P-C33")[1].title).toBe("서류 보완");
  });
});
