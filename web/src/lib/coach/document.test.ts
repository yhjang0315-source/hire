import { describe, expect, it } from "vitest";
import { getMockDataset, getPersonas } from "@/data";
import { currentFit } from "@/lib/engine";
import { evidenceFor } from "@/lib/interview";
import { situationOf, templateDocCoach } from "./document";

const data = getMockDataset();
const persona = (id: string) => getPersonas().find((p) => p.profile.id === id)!.profile;
const posting = (id: string) => data.postings.find((p) => p.id === id)!;

async function coach(personaId: string, postingId: string) {
  const profile = persona(personaId);
  const p = posting(postingId);
  return templateDocCoach.coach({ profile, posting: p, fit: currentFit(profile, p, data.skillMap), skillMap: data.skillMap });
}

describe("서류 코칭", () => {
  it("갖춘 우대 역량을 공고 표현으로 다시 쓰고, 경험 구절을 근거로 든다(서류 표현형 C33)", async () => {
    const c = await coach("P-C33", "MOCK-C07");
    expect(c.rewrites.map((r) => r.keyword)).toEqual(["React", "JavaScript"]);
    const react = c.rewrites.find((r) => r.keyword === "React")!;
    expect(react.evidence).toContain("React");
    expect(react.sentence).toContain("React로 화면을 컴포넌트 단위로");
    expect(c.gaps).toEqual([]);
  });

  it("다른 이름으로 가진 역량도 찾아 '서류에 안 보인다'고 알려 준다(도면 작성 → 도면 해독)", async () => {
    const c = await coach("P-A12", "MOCK-D01");
    const r = c.rewrites.find((x) => x.keyword === "도면 해독")!;
    expect(r.from).toBe("도면 작성");
    expect(r.expressed).toBe(false);
    expect(c.summary).toContain("서류에 공고의 표현으로 드러나지 않아요");
  });

  it("부족한 우대 조건은 보완 방법을 준다", async () => {
    const c = await coach("P-C33", "MOCK-C01");
    expect(c.gaps.map((g) => g.keyword)).toEqual(["TypeScript"]);
    expect(c.gaps[0].how).toContain("TypeScript");
  });

  it("필수 요건 충족 여부를 그대로 보여 준다", async () => {
    const c = await coach("P-A12", "MOCK-E01");
    expect(c.requirements.find((r) => r.label.includes("관련 경력"))?.passed).toBe(false);
  });

  it("예시 문장은 경험의 상황으로 시작한다", async () => {
    const c = await coach("P-A12", "MOCK-D01");
    expect(c.rewrites.find((x) => x.keyword === "도면 해독")!.sentence).toMatch(/^CAD 수업 팀 프로젝트에서 도면을 읽고/);
    expect(situationOf("학교 팀 프로젝트로 React 기반 동아리 웹 사이트를 만들었고")).toBe("학교 팀 프로젝트");
    expect(situationOf("식품공장 생산 아르바이트를 6개월 했어요")).toBe("식품공장 생산 아르바이트");
  });

  it("경험 서술에서 태그를 뒷받침하는 구절을 찾는다", () => {
    expect(evidenceFor("CAD 수업 팀 프로젝트에서 부품 도면을 작성했고, 식품공장 생산 아르바이트를 6개월 했어요.", "생산 공정 이해")).toBe(
      "식품공장 생산 아르바이트를 6개월 했어요",
    );
  });
});
