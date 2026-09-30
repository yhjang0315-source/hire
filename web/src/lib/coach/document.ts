// 서류 코칭(S7): 공고가 요구하는 역량과 내 경험을 맞대어, 갖춘 역량은 공고의 언어로 다시 쓰고
// 부족한 우대 조건은 보완 방법을 알려 준다.
// 문장은 규칙 기반 템플릿이며, 생성형 AI 플랫폼 연결 시 DocCoach 구현만 바꾼다.
import type { Posting, Profile, SkillMap } from "@/lib/types";
import { coversTag } from "@/lib/engine/competency";
import type { FitResult } from "@/lib/engine/scores";
import { evidenceFor } from "@/lib/interview";
import { josa } from "@/lib/korean";

/** 역량 태그 → 이력서에 쓸 행동 문장(상황 없이 행동 부분만) */
const ACTION: Record<string, string> = {
  "도면 작성": "부품 도면을 작성하고 치수·공차를 검토했습니다",
  "도면 해독": "도면을 읽고 치수·공차 기준을 확인했습니다",
  "설계 검토": "설계안을 검토해 수정 사항을 정리했습니다",
  "3D CAD": "3D CAD로 부품을 모델링하고 조립 간섭을 확인했습니다",
  솔리드웍스: "솔리드웍스로 부품을 모델링하고 도면을 출력했습니다",
  "2D CAD": "2D CAD로 도면을 작성·수정했습니다",
  "생산 공정 이해": "생산 공정 흐름을 익히고 공정별 품질 포인트를 확인했습니다",
  "품질 기준 준수": "작업 기준서에 맞춰 검사하고 결과를 기록했습니다",
  "품질 기준 이해": "품질 기준에 따라 불량 여부를 판정했습니다",
  "측정 장비 사용": "측정 장비로 치수를 측정하고 기록했습니다",
  "설비 점검": "설비를 정기 점검하고 이상을 보고했습니다",
  엑셀: "엑셀로 작업 데이터를 정리·집계했습니다",
  React: "React로 화면을 컴포넌트 단위로 설계·구현했습니다",
  JavaScript: "JavaScript로 주요 기능을 구현했습니다",
  TypeScript: "TypeScript로 타입을 정의해 오류를 줄였습니다",
  "HTML/CSS": "HTML/CSS로 반응형 화면을 구현했습니다",
  Git: "Git으로 브랜치를 나눠 협업하고 코드 리뷰를 했습니다",
  "팀 프로젝트": "팀에서 역할을 나누고 일정을 관리했습니다",
  "테스트 자동화": "테스트 코드를 작성해 기능 오류를 미리 잡았습니다",
};

/** 부족한 우대 조건을 채우는 방법 */
const FILL: Record<string, string> = {
  TypeScript: "기존 프로젝트 일부를 TypeScript로 옮겨 포트폴리오에 추가",
  "3D CAD": "내일배움카드 3D CAD 과정 또는 공모전 과제로 모델링 결과물 만들기",
  솔리드웍스: "솔리드웍스 무료 체험판으로 부품 모델링 과제 3개 완성",
  "2D CAD": "전산응용기계제도 과정으로 도면 작성 연습",
  "설계 실무": "설계 보조·인턴 공고로 실무 경험 쌓기",
  "양산 설계 경험": "설계 보조 직무에서 양산 부품 도면 경험 쌓기",
  엑셀: "작업 데이터를 엑셀로 정리한 사례를 하나 만들기",
  "테스트 자동화": "개인 프로젝트에 테스트 코드 추가",
};

export interface Rewrite {
  keyword: string; // 공고의 표현
  from: string; // 내가 가진 태그
  evidence: string | null; // 내 경험 서술에서 찾은 구절
  expressed: boolean; // 경험 서술에 공고 표현이 이미 드러나는지
  sentence: string; // 이렇게 써 보세요
}

export interface DocCoaching {
  requirements: { label: string; passed: boolean }[];
  rewrites: Rewrite[];
  gaps: { keyword: string; how: string }[];
  checklist: string[];
  summary: string;
}

export interface DocCoach {
  coach(input: { profile: Profile; posting: Posting; fit: FitResult; skillMap: SkillMap }): Promise<DocCoaching>;
}

/** 경험 구절에서 '상황'(어디에서)만 뽑는다: "CAD 수업 팀 프로젝트에서 도면을 작성했고" → "CAD 수업 팀 프로젝트" */
export function situationOf(evidence: string | null): string | null {
  if (!evidence) return null;
  const m = evidence.match(/^(.+?)(?:에서|으로|로)\s/) ?? evidence.match(/^(.+?)(?:을|를)\s/);
  return m ? m[1].trim() : null;
}

function sentenceFor(keyword: string, from: string, evidence: string | null): string {
  const action = ACTION[keyword] ?? ACTION[from] ?? `${josa(keyword, "을를")} 활용했습니다`;
  const where = situationOf(evidence);
  return `${where ? `${where}에서 ` : ""}${action} → 결과를 숫자로 덧붙여 보세요(예: 기간·인원·개선율).`;
}

export const templateDocCoach: DocCoach = {
  async coach({ profile, posting, fit, skillMap }) {
    const text = profile.experienceText;
    const rewrites: Rewrite[] = fit.matched.map((keyword) => {
      const from = profile.competencies.find((t) => t === keyword) ?? profile.competencies.find((t) => coversTag([t], keyword, skillMap)) ?? keyword;
      const evidence = evidenceFor(text, from);
      return {
        keyword,
        from,
        evidence,
        expressed: text.toLowerCase().includes(keyword.toLowerCase()),
        sentence: sentenceFor(keyword, from, evidence),
      };
    });
    const gaps = fit.missing.map((keyword) => ({
      keyword,
      how: FILL[keyword] ?? `${josa(keyword, "을를")} 보여 줄 수 있는 작은 프로젝트나 교육 이수 기록 만들기`,
    }));
    const hidden = rewrites.filter((r) => !r.expressed).length;
    const summary =
      rewrites.length === 0
        ? "공고의 우대 조건과 겹치는 경험을 아직 찾지 못했어요. 경험을 조금 더 자세히 적어 주세요."
        : hidden > 0
          ? `우대 조건 ${fit.matched.length + fit.missing.length}개 중 ${rewrites.length}개를 이미 갖췄는데, ${hidden}개는 서류에 공고의 표현으로 드러나지 않아요.`
          : `우대 조건 중 ${rewrites.length}개를 갖췄고 서류에도 드러나 있어요. 결과를 숫자로 보여 주면 더 강해져요.`;
    return {
      requirements: fit.checks.map((c) => ({ label: c.label, passed: c.passed })),
      rewrites,
      gaps,
      checklist: [
        `공고의 단어를 그대로 쓰기(${posting.preferred.slice(0, 3).join(", ")})`,
        "경험마다 결과를 숫자로(기간·인원·개선율)",
        `직무내용 "${posting.duties}"과 내 경험을 한 문장으로 연결하기`,
        "가장 관련 깊은 경험을 첫 문단에 두기",
      ],
      summary,
    };
  },
};

export function getDocCoach(): DocCoach {
  return templateDocCoach;
}
