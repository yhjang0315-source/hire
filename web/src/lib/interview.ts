// AI 경력 인터뷰(시연용): 경험 서술에서 역량 태그를 뽑는다.
// 실서비스에서는 생성형 AI가 대화로 질문하고 구조화 추출한다. 여기서는 키워드 규칙으로 흉내 낸다.
const RULES: [RegExp, string][] = [
  [/도면|제도/, "도면 작성"],
  [/솔리드웍스|solidworks/i, "솔리드웍스"],
  [/3d|모델링/i, "3D CAD"],
  [/검토/, "설계 검토"],
  [/생산|공장|공정/, "생산 공정 이해"],
  [/품질|검사|불량/, "품질 기준 준수"],
  [/설비|정비|점검/, "설비 점검"],
  [/엑셀|excel/i, "엑셀"],
  [/react|리액트/i, "React"],
  [/javascript|자바스크립트|js\b/i, "JavaScript"],
  [/typescript|타입스크립트/i, "TypeScript"],
  [/html|css|퍼블리싱/i, "HTML/CSS"],
  [/git|깃허브|github/i, "Git"],
  [/팀 ?프로젝트|협업/, "팀 프로젝트"],
  [/테스트|qa/i, "테스트 자동화"],
];

export const INTERVIEW_QUESTION = "학교나 아르바이트, 인턴에서 해 본 일을 편하게 말해 주세요.";

export function interviewTags(text: string): string[] {
  return [...new Set(RULES.filter(([re]) => re.test(text)).map(([, tag]) => tag))];
}

/** 경험 서술에서 태그를 뒷받침하는 구절(쉼표·마침표 단위). 없으면 null */
export function evidenceFor(text: string, tag: string): string | null {
  const rule = RULES.find(([, t]) => t === tag)?.[0];
  if (!rule) return null;
  const clause = text
    .split(/[,.!?\n]|그리고/)
    .map((s) => s.trim())
    .find((s) => rule.test(s));
  return clause || null;
}
