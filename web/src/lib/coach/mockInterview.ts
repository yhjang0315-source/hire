// AI 모의면접(S8): 공고 인재상·직무로 질문을 만들고, 답변 구조·구체성·인재상 연결을 점검한다.
// 규칙 기반 피드백이며, 생성형 AI 플랫폼 연결 시 InterviewCoach 구현만 바꾼다.
import type { Posting, Traits } from "@/lib/types";
import { TRAIT_LABELS, talentTraits, type TraitAxis } from "@/lib/engine/traits";
import { quoted } from "@/lib/korean";

const TALENT_QUESTIONS: Record<string, string> = {
  도전: "새로운 일에 도전했다가 어려움을 겪은 경험과 이를 극복한 방법을 말씀해 주세요.",
  "빠른 실행": "예상하지 못한 문제가 생겼을 때 어떻게 대처했는지 말씀해 주세요.",
  주도적: "누가 시키지 않았는데 스스로 일을 찾아 해결한 경험이 있나요?",
  열정: "이 직무에 관심을 갖게 된 계기와 그 뒤로 해 온 노력을 말씀해 주세요.",
  혁신: "기존 방식을 바꿔 더 나은 결과를 낸 경험이 있나요?",
  성장: "최근 1년 동안 가장 크게 성장한 부분과 그 계기를 말씀해 주세요.",
  정확성: "작은 실수를 미리 발견해 문제를 막은 경험이 있나요?",
  꼼꼼함: "작은 실수를 미리 발견해 문제를 막은 경험이 있나요?",
  체계적: "복잡한 일을 계획을 세워 체계적으로 진행한 경험을 말씀해 주세요.",
  "품질 중시": "품질과 일정이 부딪혔을 때 어떻게 판단했나요?",
  협업: "팀원과 의견이 달랐을 때 어떻게 조율했나요?",
  성실: "맡은 일을 끝까지 책임지고 마무리한 경험을 말씀해 주세요.",
  책임감: "맡은 일을 끝까지 책임지고 마무리한 경험을 말씀해 주세요.",
  전문성: "지원 직무에서 가장 자신 있는 역량과 그 근거를 말씀해 주세요.",
};

/** 인재상 키워드를 답변에서 알아볼 단서 */
const TALENT_CUES: Record<string, RegExp> = {
  도전: /도전|처음|새로/,
  "빠른 실행": /바로|즉시|빠르게|먼저 결정|결정했/,
  주도적: /스스로|먼저 제안|주도|직접/,
  열정: /관심|꾸준|매일|노력/,
  혁신: /바꿔|개선|새로운 방식/,
  성장: /배웠|성장|익혔/,
  정확성: /정확|검증|확인/,
  꼼꼼함: /꼼꼼|검토|확인/,
  체계적: /계획|단계|순서|체계/,
  "품질 중시": /품질|기준|불량/,
  협업: /팀|함께|조율|의견/,
  성실: /끝까지|꾸준|마무리/,
  책임감: /책임|끝까지|마무리/,
  전문성: /역량|전문|경험/,
};

export interface InterviewQuestion {
  id: string;
  text: string;
  talent?: string; // 연결된 인재상 키워드
}

export interface AnswerFeedback {
  good: string[];
  fix: string[];
  structure: string;
  score: number; // 0~100, 네 가지 점검 항목 기준
}

export interface InterviewCoach {
  questions(posting: Posting): InterviewQuestion[];
  feedback(input: { answer: string; question: InterviewQuestion; posting: Posting; traits?: Traits }): AnswerFeedback;
}

export const STRUCTURE = "결론(행동) → 근거(과정) → 결과(수치)";

function reframeTip(talent: string | undefined, traits?: Traits): string | null {
  if (!talent || !traits) return null;
  const company = talentTraits([talent]);
  const axis = (Object.keys(company) as TraitAxis[]).find((a) => Math.abs(traits[a] - company[a]!) >= 2);
  if (!axis) return null;
  const mine = TRAIT_LABELS[axis][traits[axis] > 0 ? 1 : 0];
  return `${quoted(talent, "을를")} 중시하는 회사예요. ${mine} 성향을 숨기기보다, 무엇을 결정했는지를 먼저 말하면 ${mine} 성향이 강점으로 전달돼요.`;
}

export const templateInterviewCoach: InterviewCoach = {
  questions(posting) {
    const seen = new Set<string>();
    const qs: InterviewQuestion[] = [{ id: "intro", text: "1분 동안 자기소개를 해 주세요. 지원 직무와 연결되는 경험 하나를 꼭 넣어 주세요." }];
    for (const t of posting.talent) {
      const text = TALENT_QUESTIONS[t];
      if (text && !seen.has(text)) {
        seen.add(text);
        qs.push({ id: `talent-${t}`, text, talent: t });
      }
      if (qs.length >= 4) break;
    }
    qs.push({ id: "duty", text: `이 직무(${posting.duties})에서 가장 중요하다고 생각하는 역량과 그 이유를 말씀해 주세요.` });
    return qs;
  },

  feedback({ answer, question, posting, traits }) {
    const text = answer.trim();
    const good: string[] = [];
    const fix: string[] = [];
    const first = text.split(/(?<=[.!?다요])\s+/)[0] ?? "";

    // 1. 구조: 결론(행동)을 먼저 말했는가
    const startsWithProcess = /^(먼저|우선|처음에|일단|원래)/.test(first);
    const firstHasAction = /(했습니다|했어요|결정|선택|해결|제안)/.test(first);
    if (firstHasAction && !startsWithProcess) good.push("첫 문장에 무엇을 했는지가 바로 나와요.");
    else fix.push("무엇을 결정·행동했는지를 첫 문장에 먼저 말해 보세요.");

    // 2. 과정: 근거가 드러나는가
    if (/(분석|확인|비교|검토|원인|자료)/.test(text)) good.push("원인을 분석하는 과정이 잘 드러나요.");
    else fix.push("왜 그렇게 했는지, 어떤 근거로 판단했는지를 한 문장 넣어 보세요.");

    // 3. 결과: 수치로 말하는가
    if (/\d/.test(text)) good.push("결과를 숫자로 말해 설득력이 있어요.");
    else fix.push("결과를 숫자로 덧붙여 보세요(예: 기간 단축, 불량률, 인원).");

    // 4. 인재상 연결
    const talents = question.talent ? [question.talent] : posting.talent;
    const linked = talents.find((t) => TALENT_CUES[t]?.test(text));
    if (linked) good.push(`회사 인재상 '${linked}'과 연결되는 표현이 있어요.`);
    else if (talents.length) fix.push(`회사 인재상(${talents.join("·")})과 이어지는 표현을 한 번 넣어 보세요.`);

    // 길이
    if (text.length < 60) fix.push("답변이 짧아요. 상황 → 행동 → 결과가 모두 들어가게 늘려 보세요.");
    if (text.length > 600) fix.push("답변이 길어요. 1분 안에 말할 수 있게 핵심만 남겨 보세요.");

    const tip = reframeTip(question.talent ?? posting.talent[0], traits);
    if (tip) fix.push(tip);

    const score = Math.round((good.length / 4) * 100);
    return { good, fix, structure: STRUCTURE, score: Math.min(100, score) };
  },
};

export function getInterviewCoach(): InterviewCoach {
  return templateInterviewCoach;
}
