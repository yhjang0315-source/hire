import { describe, expect, it } from "vitest";
import { getMockDataset, getPersonas } from "@/data";
import { STRUCTURE, templateInterviewCoach as coach } from "./mockInterview";

const data = getMockDataset();
const posting = (id: string) => data.postings.find((p) => p.id === id)!;
const traitsB = getPersonas().find((p) => p.profile.id === "P-B07")!.profile.traits;

describe("AI 모의면접", () => {
  it("자기소개 → 인재상별 질문 → 직무 질문 순서로 최대 5개를 만든다", () => {
    const qs = coach.questions(posting("MOCK-B01")); // 인재상: 도전·빠른 실행·주도적
    expect(qs[0].id).toBe("intro");
    expect(qs.map((q) => q.talent).filter(Boolean)).toEqual(["도전", "빠른 실행", "주도적"]);
    expect(qs.at(-1)!.id).toBe("duty");
    expect(qs.length).toBeLessThanOrEqual(5);
  });

  it("같은 질문은 한 번만 낸다(정확성·꼼꼼함)", () => {
    const texts = coach.questions(posting("MOCK-Q01")).map((q) => q.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("과정부터 말하는 답변에는 결론 먼저·수치·성향 강점화를 권한다(기획안 그림 8 예시)", () => {
    const p = posting("MOCK-B01");
    const q = coach.questions(p).find((x) => x.talent === "빠른 실행")!;
    const f = coach.feedback({
      answer: "먼저 원인을 꼼꼼히 확인하고, 팀원들과 자료를 비교해 본 뒤에 수정안을 정리했습니다.",
      question: q,
      posting: p,
      traits: traitsB,
    });
    expect(f.good).toContain("원인을 분석하는 과정이 잘 드러나요.");
    expect(f.fix.some((x) => x.includes("첫 문장에 먼저"))).toBe(true);
    expect(f.fix.some((x) => x.includes("숫자"))).toBe(true);
    expect(f.fix.some((x) => x.includes("'빠른 실행'을 중시하는 회사예요") && x.includes("신중 성향이 강점"))).toBe(true);
    expect(f.structure).toBe(STRUCTURE);
  });

  it("결론·근거·수치·인재상이 모두 있으면 만점", () => {
    const p = posting("MOCK-B01");
    const q = coach.questions(p).find((x) => x.talent === "빠른 실행")!;
    const f = coach.feedback({
      answer: "시제품 조립 불량이 나와 바로 도면 공차를 수정하기로 결정했습니다. 불량 부품 20개를 측정해 원인을 확인했고, 수정 후 불량률을 12%에서 2%로 낮췄습니다.",
      question: q,
      posting: p,
    });
    expect(f.score).toBe(100);
    expect(f.fix).toEqual([]);
  });
});
