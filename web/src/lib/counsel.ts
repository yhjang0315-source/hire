// 상담사 대시보드(P2): 구직자별 진단 요약, 집중지원 여부, AI 상담 포인트
// 상담 포인트는 생성형 AI 플랫폼 연결 전까지 진단 결과로 채우는 템플릿이다(getCounselWriter 교체 지점).
import type { Dataset } from "@/data";
import type { Application, Profile } from "@/lib/types";
import { coverageFor, recommend, TRAIT_LABELS, type Recommendation, type TraitGap } from "@/lib/engine";
import { BARRIER_LABEL } from "@/lib/card/labels";
import { josa, joinItems } from "@/lib/korean";

/** 반복 탈락(서류+면접 탈락 합계)이 이 이상이면 집중지원 대상 */
export const FOCUS_RULES = { minRejections: 5, recentDays: 7 };

export interface SeekerRecord {
  id: string;
  counselRequested: boolean;
  lastDiagnosedAt: string;
  profile: Profile;
  applications: Application[];
}

export interface SeekerSummary {
  seeker: SeekerRecord;
  rec: Recommendation;
  targets: string[];
  rejections: number;
  focus: boolean;
  recent: boolean; // 최근 7일 안에 재진단
  evidence: string;
}

/** 근거 문장용 요건 이름 */
const REQUIRED: Record<keyof typeof BARRIER_LABEL, string> = { career: "관련 경력", certificate: "자격증", major: "특정 전공", education: "상위 학력" };

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

function evidenceOf(rec: Recommendation): string {
  const d = rec.diagnosis;
  const s = d.stats;
  const barrier = d.barriers[0];
  switch (d.type) {
    case "자격격차형":
      if (!barrier) return `요건 충족도 평균 ${s.avgFit}%`;
      return barrier.count === s.total ? `지원 ${s.total}곳 모두 ${REQUIRED[barrier.key]} 요구` : `지원 ${s.total}곳 중 ${barrier.count}곳이 ${REQUIRED[barrier.key]} 요구`;
    case "서류표현형":
      return `요건 충족도 평균 ${s.avgFit}%인데 서류 탈락 ${s.docFail}회`;
    case "조직적합형":
      return `서류 통과 후 면접 탈락 ${s.interviewFail}회${d.talentPattern.length ? ` · 공통 인재상 '${d.talentPattern.join("·")}'` : ""}`;
    case "혼합형":
      return `서류 탈락 ${s.docFail}회 · 면접 탈락 ${s.interviewFail}회${barrier ? ` · ${BARRIER_LABEL[barrier.key]} 요건 ${barrier.count}곳` : ""}`;
    default:
      return `결과가 나온 지원 ${s.decided}건 — 3건 이상 쌓이면 원인을 진단해요`;
  }
}

export function summarizeSeeker(seeker: SeekerRecord, data: Dataset, today: string): SeekerSummary {
  const rec = recommend(seeker.profile, seeker.applications, data, today);
  const { docFail, interviewFail } = rec.diagnosis.stats;
  const rejections = docFail + interviewFail;
  return {
    seeker,
    rec,
    targets: rec.targets.map((o) => o.name),
    rejections,
    focus: rejections >= FOCUS_RULES.minRejections,
    recent: dayDiff(seeker.lastDiagnosedAt, today) <= FOCUS_RULES.recentDays,
    evidence: evidenceOf(rec),
  };
}

function gapText(g: TraitGap): string {
  // 성향 축은 -2(앞 라벨) ~ +2(뒤 라벨)
  const [minus, plus] = TRAIT_LABELS[g.axis];
  const side = (v: number) => (v < 0 ? minus : v > 0 ? plus : "중간");
  return `회사는 '${side(g.company)}', 본인은 '${side(g.user)}' 성향`;
}

export interface CounselWriter {
  points(s: SeekerSummary, data: Dataset): string[];
}

const templateCounselWriter: CounselWriter = {
  points({ seeker, rec }, data) {
    const d = rec.diagnosis;
    const p = seeker.profile;
    const stepping = rec.tiers.stepping[0] ?? rec.tiers.growing[0];
    const again = rec.redirect[0];
    const cov = coverageFor(p, rec, rec.best, data);
    const missing = cov?.missing.slice(0, 2) ?? [];
    const barrier = d.barriers[0];
    const out: string[] = [];
    if (d.type === "자격격차형" || d.type === "혼합형") {
      if (barrier) out.push(`${josa(BARRIER_LABEL[barrier.key], "이가")} 반복 장벽 → ${stepping ? `경력 발판 공고(${stepping.posting.company} ${stepping.posting.title}) 지원 독려` : "요건이 낮은 단계 공고부터 지원 독려"}`);
      if (missing.length) out.push(`목표까지 부족한 ${joinItems(missing)} → 훈련과정 연계 안내`);
    }
    if (d.type === "서류표현형" || d.type === "혼합형") {
      out.push(`요건은 갖췄는데 서류에서 탈락 → 서류 코칭으로 경험을 공고 표현으로 다시 쓰기`);
      if (again) out.push(`같은 수준 공고(${again.posting.company}) 재도전 일정 함께 잡기`);
    }
    if (d.type === "조직적합형") {
      const g = d.traitGaps[0];
      out.push(`면접 탈락 ${d.stats.interviewFail}회 공통 인재상 '${d.talentPattern.join("·")}'${g ? ` — ${gapText(g)}` : ""}`);
      if (again) out.push(`성향이 잘 맞는 회사(${again.posting.company}) 우선 지원 권유`);
      out.push("AI 모의면접으로 성향을 강점으로 말하는 답변 연습");
    }
    if (d.type === "판단보류") {
      out.push(`지원 기록 ${d.stats.total}건 — 결과가 3건 이상 쌓이면 재진단`);
      if (rec.best) out.push(`지금 적합한 공고(${rec.best.posting.company} ${rec.best.posting.title})부터 지원 권유`);
    }
    if (p.competencies.length && rec.best && d.type !== "판단보류")
      out.push(`보유 역량 ${josa(`'${joinItems(p.competencies.slice(0, 2))}'`, "을를")} ${rec.best.occupation.name} 공고 표현으로 연결`);
    return out.slice(0, 4);
  },
};

/** 생성형 AI 플랫폼 연결 전까지는 템플릿 상담 포인트를 쓴다 */
export function getCounselWriter(): CounselWriter {
  return templateCounselWriter;
}
