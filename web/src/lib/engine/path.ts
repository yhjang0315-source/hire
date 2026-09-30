// 커리어 경로(S11): 지금 → 1순위 공고 → 경력 발판 → 목표 공고
// 단계마다 예상 역량 충족도와 새로 채우는 역량을, 경력 발판은 역량 대신 경력 인정 가능성을 보여 준다.
import type { Dataset } from "@/data";
import type { Occupation, Profile } from "@/lib/types";
import { coverage, itemsOf, keyItems } from "./competency";
import type { Recommendation, ScoredPosting } from "./recommend";

export interface PathStage {
  key: "now" | "first" | "stepping" | "prepare" | "target";
  when: string;
  title: string;
  posting?: ScoredPosting;
  coverage: number; // 목표 역량 충족도(예상, %)
  gained?: string[]; // 이 단계에서 새로 채우는 목표 핵심 역량
  recognition?: number; // 경력 발판: 목표 직종 관련 경력으로 인정될 가능성(0~100)
  note: string;
}

export function careerPath(profile: Profile, rec: Recommendation, data: Dataset): PathStage[] {
  const target = rec.targets[0];
  if (!target) return [];
  const now = coverage(profile.competencies, target, data.skillMap);
  const key = keyItems(target);
  /** 일한 직업들의 핵심 항목을 더했을 때 채워지는 목표 핵심 항목 */
  const coveredAfter = (worked: Occupation[]) => {
    const have = itemsOf(profile.competencies, data.skillMap);
    for (const occ of worked) for (const k of keyItems(occ)) have.add(k);
    return key.filter((k) => have.has(k));
  };
  const pct = (items: string[]) => (key.length ? Math.round((items.length / key.length) * 100) : 0);
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
  const firstItems = coveredAfter(worked);
  stages.push({
    key: "first",
    when: "지금 ~ 1년",
    title: `${best.posting.company} ${best.posting.title}`,
    posting: best,
    coverage: pct(firstItems),
    gained: now.missing.filter((k) => firstItems.includes(k)),
    note: "일하면서 목표 직무 역량 쌓기",
  });
  const stepping = rec.tiers.stepping.find((sp) => sp.posting.id !== best.posting.id);
  if (stepping) {
    worked.push(stepping.occupation);
    const items = coveredAfter(worked);
    const gained = items.filter((k) => !firstItems.includes(k));
    stages.push({
      key: "stepping",
      when: "1~2년",
      title: `${stepping.posting.company} ${stepping.posting.title}`,
      posting: stepping,
      coverage: pct(items),
      gained,
      recognition: stepping.recognition,
      note: gained.length
        ? "목표 직종의 관련 경력으로 인정받으면서 남은 역량도 채우는 곳"
        : "역량보다 경력을 채우는 단계 — 목표 직종의 관련 경력으로 인정받기 좋은 곳",
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
