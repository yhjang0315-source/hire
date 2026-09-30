import { describe, expect, it } from "vitest";
import { getMockDataset, getSeekers, DEMO_TODAY } from "@/data";
import { FORBIDDEN_PHRASES } from "@/lib/card/writer";
import { FOCUS_RULES, getCounselWriter, summarizeSeeker } from "./counsel";

const data = getMockDataset();
const all = getSeekers().map((s) => summarizeSeeker(s, data, DEMO_TODAY));
const of = (id: string) => all.find((s) => s.seeker.id === id)!;

describe("상담사 대시보드", () => {
  it("페르소나와 추가 구직자를 합쳐 다섯 진단 유형이 모두 나온다", () => {
    expect(new Set(all.map((s) => s.rec.diagnosis.type))).toEqual(new Set(["자격격차형", "조직적합형", "서류표현형", "혼합형", "판단보류"]));
  });

  it("탈락 합계 기준으로 집중지원을 표시한다", () => {
    for (const s of all) expect(s.focus).toBe(s.rejections >= FOCUS_RULES.minRejections);
    expect(of("S-D21").focus).toBe(true);
    expect(of("S-F18").focus).toBe(false);
  });

  it("진단 근거 문장: 자격 격차형은 요건 장벽, 조직 적합형은 면접 탈락과 인재상", () => {
    expect(of("P-A12").evidence).toBe("지원 5곳 중 4곳이 관련 경력 요구");
    expect(of("P-B07").evidence).toContain("면접 탈락 4회");
  });

  it("상담 포인트는 2~4개, 금지 표현 없이 만든다", () => {
    for (const s of all) {
      const pts = getCounselWriter().points(s, data);
      expect(pts.length).toBeGreaterThanOrEqual(2);
      expect(pts.length).toBeLessThanOrEqual(4);
      for (const p of pts) for (const bad of FORBIDDEN_PHRASES) expect(p).not.toContain(bad);
    }
  });
});
