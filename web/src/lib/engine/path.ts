// 커리어 경로(S11): 지금 → 1순위 공고 → 경력 발판 → 목표 공고, 단계별 예상 역량 충족도
import type { Dataset } from "@/data";
import type { Profile } from "@/lib/types";
import { coverage, coverageAfter } from "./competency";
import type { Recommendation, ScoredPosting } from "./recommend";

export interface PathStage {
  key: "now" | "first" | "stepping" | "prepare" | "target";
  when: string;
  title: string;
  posting?: ScoredPosting;
  coverage: number; // 목표 역량 충족도(예상, %)
  note: string;
}

export function careerPath(profile: Profile, rec: Recommendation, data: Dataset): PathStage[] {
  const target = rec.targets[0];
  if (!target) return [];
  const now = coverage(profile.competencies, target, data.skillMap);
  const stages: PathStage[] = [
    { key: "now", when: "지금", title: "지금의 나", coverage: now.now, note: now.missing.length ? `부족: ${now.missing.slice(0, 3).join("·")}` : "핵심 역량을 고루 갖췄어요" },
  ];
  const best = rec.best;
  const targetPosting = rec.tiers.target.find((sp) => sp.posting.id !== best?.posting.id) ?? rec.tiers.target[0];

  // 방향 전환 트랙: 역량보다 표현·궁합이 과제
  if (!best || best.tier === "target") {
    const fit = rec.diagnosis.type === "조직적합형";
    stages.push({
      key: "prepare",
      when: "2주",
      title: fit ? "면접 보완" : "서류 보완",
      coverage: now.now,
      note: fit ? "AI 모의면접으로 내 성향을 강점으로 말하는 연습" : "서류 코칭으로 갖춘 역량을 공고의 언어로 보여 주기",
    });
    if (best)
      stages.push({
        key: "target",
        when: "1개월 안",
        title: `${best.posting.company} ${best.posting.title}`,
        posting: best,
        coverage: now.now,
        note: fit ? "인재상이 잘 맞는 회사에 재도전" : "다듬은 서류로 목표 공고 재도전",
      });
    return stages;
  }

  const worked = [best.occupation];
  stages.push({
    key: "first",
    when: "지금 ~ 1년",
    title: `${best.posting.company} ${best.posting.title}`,
    posting: best,
    coverage: coverageAfter(profile.competencies, target, data.skillMap, worked),
    note: "일하면서 목표 직무 역량 쌓기",
  });
  const stepping = rec.tiers.stepping.find((sp) => sp.posting.id !== best.posting.id);
  if (stepping) {
    worked.push(stepping.occupation);
    stages.push({
      key: "stepping",
      when: "1~2년",
      title: `${stepping.posting.company} ${stepping.posting.title}`,
      posting: stepping,
      coverage: coverageAfter(profile.competencies, target, data.skillMap, worked),
      note: "목표 직종의 관련 경력으로 인정받기 좋은 곳",
    });
  }
  const last = stages[stages.length - 1].coverage;
  stages.push({
    key: "target",
    when: stepping ? "2년 이후" : "1년 이후",
    title: targetPosting ? `${targetPosting.posting.company} ${targetPosting.posting.title}` : target.name,
    posting: targetPosting,
    coverage: last,
    note: remainingNote(targetPosting),
  });
  return stages;
}

/** 목표 공고에서 아직 남은 필수 요건(경력 요건은 앞 단계로 채운다고 본다) */
function remainingNote(sp: ScoredPosting | undefined): string {
  const left = sp?.fit.checks.filter((c) => !c.passed && c.key !== "career").map((c) => c.label) ?? [];
  return left.length ? `관련 경력으로 재도전 · 남은 요건: ${left.join(", ")}` : "관련 경력과 채운 역량으로 목표 공고 재도전";
}
