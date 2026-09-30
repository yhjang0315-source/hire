import { describe, expect, it } from "vitest";
import { DEMO_TODAY, getMockDataset, getPersonas } from "@/data";
import { coverageFor, matchTrainings, missingTargetTags, recommend } from "@/lib/engine";
import { josa, times } from "@/lib/korean";
import { decodeState, encodeState } from "@/lib/state";
import { interviewTags } from "@/lib/interview";
import { templateWriter, violations } from "./writer";

const data = getMockDataset();

async function bestCard(id: string) {
  const p = getPersonas().find((x) => x.profile.id === id)!;
  const rec = recommend(p.profile, p.applications, data, DEMO_TODAY);
  const sp = rec.best!;
  const coverage = coverageFor(p.profile, rec, sp, data);
  const trainings = matchTrainings({ items: coverage?.missing ?? [], tags: missingTargetTags(rec) }, p.profile, data);
  return templateWriter.write({ profile: p.profile, rec, sp, coverage, trainings, planB: null });
}

describe("설득형 추천 카드", () => {
  it.each(["P-A12", "P-B07", "P-C33"])("%s — 한마디·근거·계획이 있고 금지 표현이 없다", async (id) => {
    const card = await bestCard(id);
    expect(card.headline.length).toBeGreaterThan(10);
    expect(card.reasons.length).toBeGreaterThanOrEqual(2);
    expect(card.plan.length).toBeGreaterThanOrEqual(3);
    expect(violations(card)).toEqual([]);
  });

  it("자격 격차형 한마디: 탈락 횟수를 말로 세고 목표 직종을 부른다", async () => {
    const card = await bestCard("P-A12");
    expect(card.headline).toContain("다섯 번의 도전");
    expect(card.headline).toContain("기계설계 엔지니어에 가장 빨리");
    expect(card.reasons[0].text).toContain("5곳 중 4곳이 '관련 경력'을 요구");
    expect(card.plan.some((s) => s.what.includes("3D CAD"))).toBe(true);
  });

  it("조직 적합형 근거: 탈락 원인을 가능성으로 말한다", async () => {
    const card = await bestCard("P-B07");
    expect(card.reasons.some((r) => r.text.includes("가능성이에요"))).toBe(true);
  });
});

describe("보조 도구", () => {
  it("조사", () => {
    expect(josa("관련 경력", "을를")).toBe("관련 경력을");
    expect(josa("D사 품질관리(QC)", "은는")).toBe("D사 품질관리(QC)는");
    expect(josa("3D CAD", "을를")).toBe("3D CAD를");
    expect(josa("기계설계 엔지니어", "으로")).toBe("기계설계 엔지니어로");
    expect(times(5)).toBe("다섯 번");
  });

  it("입력 상태 인코딩은 한글을 보존한다", () => {
    const p = getPersonas()[0];
    const state = { profile: p.profile, applications: p.applications };
    expect(decodeState(encodeState(state))).toEqual(state);
    expect(decodeState("깨진값")).toBeNull();
  });

  it("경력 인터뷰(시연 규칙)가 경험 서술에서 역량을 뽑는다", () => {
    expect(interviewTags("CAD 수업에서 부품 도면을 그렸고, 식품공장에서 6개월 일했어요.")).toEqual(
      expect.arrayContaining(["도면 작성", "생산 공정 이해"]),
    );
  });
});
