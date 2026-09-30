// 설득형 추천 카드 문장(A. 한마디 · B. 판단 근거 · C. 이후 계획)
// 지금은 규칙 기반 템플릿으로 만든다. 선정 후 제공되는 생성형 AI 플랫폼이 연결되면
// CardWriter 구현만 바꾸면 되고, 수치는 계속 엔진 계산값만 쓴다(환각 방지).
import type { Profile, TrainingCourse } from "@/lib/types";
import type { Coverage, Recommendation, ScoredPosting } from "@/lib/engine";
import { TRAIT_LABELS } from "@/lib/engine";
import { josa, joinItems, quoted, times } from "@/lib/korean";
import { BARRIER_LABEL, TIER_LABEL } from "./labels";

export interface CardInput {
  profile: Profile;
  rec: Recommendation;
  sp: ScoredPosting;
  coverage: Coverage | null;
  trainings: TrainingCourse[];
  planB: ScoredPosting | null;
}

export interface CardText {
  headline: string;
  reasons: { text: string; source: string }[];
  plan: { when: string; what: string }[];
  planB?: string;
}

export interface CardWriter {
  write(input: CardInput): Promise<CardText>;
}

/** 말투 원칙: 쓰지 않을 표현 */
export const FORBIDDEN_PHRASES = ["눈을 낮", "하향 지원", "현실적으로", "합격 보장", "무조건"];

export function violations(card: CardText): string[] {
  const all = [card.headline, ...card.reasons.map((r) => r.text), ...card.plan.map((p) => p.what), card.planB ?? ""].join(" ");
  return FORBIDDEN_PHRASES.filter((w) => all.includes(w));
}

function headline({ rec, sp }: CardInput): string {
  const d = rec.diagnosis;
  const target = rec.targets[0]?.name ?? "목표 직무";
  switch (d.type) {
    case "자격격차형":
      if (sp.tier === "target") return `목표에 가장 가까운 공고예요. 부족한 요건만 채우면 도전해 볼 만해요.`;
      return d.stats.docFail >= 2
        ? `${times(d.stats.docFail)}의 도전 끝에 찾은 우회로예요. 돌아가는 길 같지만, ${target}에 가장 빨리 닿는 길일 수 있어요.`
        : `지금 역량으로 확실하게 시작하면서 ${target}까지 이어갈 수 있는 곳이에요.`;
    case "서류표현형":
      return "자격은 이미 충분해요. 이번엔 서류에서 강점이 잘 보이도록 다듬어서 다시 도전해 봐요.";
    case "조직적합형":
      return "자격은 이미 충분해요. 부족한 게 아니라, 지금까지 지원한 회사들과 일하는 방식이 조금 달랐을 수 있어요.";
    case "혼합형":
      return "원인이 한 가지로 보이지 않아요. 가능성이 높은 곳에 지원하면서 서류도 함께 다듬어 봐요.";
    default:
      return "먼저 가능성이 높은 곳부터 지원해 보고, 결과를 알려 주시면 더 정확하게 도와드릴게요.";
  }
}

function historyReason({ rec }: CardInput): { text: string; source: string } {
  const d = rec.diagnosis;
  const src = "내 지원 이력";
  const top = d.barriers[0];
  switch (d.type) {
    case "자격격차형":
      if (top) {
        const label = BARRIER_LABEL[top.key];
        return {
          text: `지원하신 ${d.stats.total}곳 중 ${top.count}곳이 ${quoted(label, "을를")} 요구했어요. 실력보다 ${josa(label, "이가")} 가장 큰 차이였던 것 같아요.`,
          source: src,
        };
      }
      break;
    case "서류표현형":
      return {
        text: `지원하신 공고의 요건 충족도는 평균 ${d.stats.avgFit}%인데, 서류에서 ${d.stats.docFail}번 아쉬웠어요. 갖춘 역량이 서류에 충분히 드러나지 않았을 수 있어요.`,
        source: src,
      };
    case "조직적합형":
      return {
        text: `요건 충족도는 평균 ${d.stats.avgFit}%이고 서류는 ${d.stats.decided - d.stats.docFail}번 통과했지만, 면접은 ${d.stats.interviewFail}번 아쉬웠어요.`,
        source: src,
      };
    case "판단보류":
      return { text: `아직 지원 기록이 ${d.stats.total}건이라 탈락 원인을 판단하기엔 일러요.`, source: src };
  }
  return { text: `지원 ${d.stats.total}건의 요건 충족도는 평균 ${d.stats.avgFit}%예요.`, source: src };
}

function distanceReason({ rec, coverage, profile }: CardInput): { text: string; source: string } | null {
  const d = rec.diagnosis;
  if (d.type === "조직적합형" && d.talentPattern.length) {
    const gap = d.traitGaps[0];
    const mine = gap ? TRAIT_LABELS[gap.axis][gap.user > 0 ? 1 : 0] : null;
    return {
      text:
        `지원한 회사들의 인재상은 ${quoted(joinItems(d.talentPattern), "을를")} 강조했어요.` +
        (mine ? ` 자가진단에서 나온 ${mine} 성향과는 결이 달랐을 수 있어요.` : "") +
        " 기업이 탈락 사유를 알려주지 않기 때문에 이건 가능성이에요. 맞는지 한번 돌아봐 주세요.",
      source: "공고 분석·성향 자가진단",
    };
  }
  if (!coverage || !rec.targets[0]) return null;
  const target = rec.targets[0].name;
  const missing = coverage.missing.length ? ` 특히 ${joinItems(coverage.missing, 2)} 경험이 비어 있어요.` : "";
  return {
    text: `${target}에 필요한 핵심 역량 중 지금 약 ${coverage.now}%를 갖췄어요.${missing}${profile.competencies.length === 0 ? " 경험을 더 적어 주시면 정확해져요." : ""}`,
    source: "직업정보 역량 비교",
  };
}

function postingReason({ rec, sp, coverage }: CardInput): { text: string; source: string } {
  const title = `${sp.posting.company} ${sp.posting.title}`;
  if (rec.diagnosis.type === "조직적합형") {
    return {
      text: `${title}의 인재상은 ${quoted(joinItems(sp.posting.talent), "이라")} 성향 궁합이 ${sp.traitFit}점이에요. 요건 충족도도 ${sp.fit.score}%예요.`,
      source: "공고 분석",
    };
  }
  if (sp.tier === "target" || rec.diagnosis.type === "서류표현형") {
    const passed = sp.fit.checks.filter((c) => c.passed).length;
    return {
      text: `${josa(title, "은는")} 필수 요건 ${sp.fit.checks.length}개 중 ${passed}개를 충족하고, 우대 조건 중 ${sp.fit.matched.length ? josa(joinItems(sp.fit.matched), "을를") + " 갖췄어요" : "맞는 항목을 서류에서 보여 주면 좋아요"}.`,
      source: "공고 분석",
    };
  }
  const gained = coverage?.gained?.length ? `${josa(joinItems(coverage.gained, 2), "을를")} 매일 다루는 일이라` : "목표 직무와 겹치는 일이 많아";
  const after = coverage?.afterYear != null ? `, 1년이면 약 ${coverage.afterYear}%까지 오를 것으로 예상돼요` : "";
  const demand = sp.jobsPerSeeker && sp.jobsPerSeeker >= 1 ? ` 이 직종은 구직자 1명당 일자리가 ${sp.jobsPerSeeker}개로 채용이 활발해요.` : "";
  return { text: `${josa(title, "은는")} ${gained}${after}.${demand}`, source: "공고 분석·구인배수" };
}

function plan({ rec, sp, coverage, trainings, profile }: CardInput): { when: string; what: string }[] {
  const d = rec.diagnosis.type;
  const target = rec.targets[0]?.name ?? "목표 직무";
  const dday = `지원 전(D-${sp.daysLeft})`;
  const strength = sp.fit.matched.length ? joinItems(sp.fit.matched) : joinItems(profile.competencies);
  const training = trainings[0];

  if (d === "서류표현형") {
    return [
      { when: dday, what: `서류 코칭으로 ${strength || "갖춘 역량"} 경험을 공고 요구 역량에 맞춘 문장으로 바꾸기` },
      { when: "1주", what: "같은 수준 공고 3곳에 다듬은 서류로 지원" },
      { when: "2주", what: "결과를 입력하고 다시 진단 받기" },
      { when: "1개월", what: sp.fit.missing.length ? `우대 조건 ${joinItems(sp.fit.missing)} 보완(포트폴리오·프로젝트)` : "포트폴리오에 성과 수치 더하기" },
    ];
  }
  if (d === "조직적합형") {
    return [
      { when: dday, what: `인재상 '${joinItems(sp.posting.talent)}'에 맞춰 내 성향을 강점으로 말하는 자기소개 준비` },
      { when: "면접 전", what: "AI 모의면접으로 결론 → 근거 → 결과 순서로 답하는 연습" },
      { when: "2주", what: "성향이 맞는 회사 3곳 지원 → 결과 입력 → 다시 진단" },
    ];
  }
  const steps = [
    { when: dday, what: strength ? `이력서에 ${josa(strength, "을를")} 구체적인 경험으로 적어 보세요` : "이력서에 관련 경험을 구체적으로 적어 보세요" },
    {
      when: "입사 후 1~3개월",
      what: `${coverage?.gained?.length ? joinItems(coverage.gained, 2) + " 관련 업무 익히기, " : ""}매주 업무 기록 한 줄 남기기(나중에 경력기술서가 됩니다)`,
    },
    {
      when: "4~6개월",
      what: training
        ? `내일배움카드 '${training.title}' 과정 병행(${training.institution})`
        : `부족한 ${joinItems(coverage?.missing ?? [], 2) || "역량"} 보완 학습`,
    },
    {
      when: "7~12개월",
      what: sp.tier === "stepping" ? `${target} 공고 요건을 다시 점검하고 지원 준비` : "역량 충족도를 다시 점검하고, 경력 발판 공고가 열리면 도전",
    },
    { when: "12개월 이후", what: `관련 경력 1년으로 ${target} 공고에 다시 도전` },
  ];
  return steps;
}

export const templateWriter: CardWriter = {
  async write(input) {
    const reasons = [historyReason(input), distanceReason(input), postingReason(input)].filter(
      (r): r is { text: string; source: string } => !!r,
    );
    const planB = input.planB
      ? `이번에 안 되면 ${input.planB.posting.company} ${input.planB.posting.title}(${input.planB.tier === "target" ? "같은 수준 공고" : input.planB.tier ? TIER_LABEL[input.planB.tier].short : "추천"})`
      : undefined;
    return { headline: headline(input), reasons, plan: plan(input), planB };
  },
};

/** 생성형 AI 플랫폼 연결 전까지는 템플릿 문장을 쓴다 */
export function getCardWriter(): CardWriter {
  return templateWriter;
}
