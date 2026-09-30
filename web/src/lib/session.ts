// 페이지 공통: URL에서 입력 상태를 찾고 엔진을 돌린다(서버 전용)
import "server-only";
import type { Posting } from "@/lib/types";
import { DEMO_TODAY, getPersonas } from "@/data";
import { getDataset } from "@/data/cache";
import { coverageFor, currentFit, matchTrainings, missingTargetTags, recommend, trainingHits, type Recommendation, type ScoredPosting } from "@/lib/engine";
import { getCardWriter, type CardText } from "@/lib/card/writer";
import { decodeState, encodeState, type InputState } from "@/lib/state";
import { getDocCoach, type DocCoaching } from "@/lib/coach/document";

export type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** ?persona=P-A12 또는 ?s=<인코딩된 입력> */
export async function resolveState(searchParams: SearchParams): Promise<{ state: InputState; query: string } | null> {
  const sp = await searchParams;
  const personaId = first(sp.persona);
  if (personaId) {
    const p = getPersonas().find((x) => x.profile.id === personaId);
    if (p) return { state: { profile: p.profile, applications: p.applications }, query: `persona=${encodeURIComponent(personaId)}` };
  }
  const s = first(sp.s);
  const state = s ? decodeState(s) : null;
  return state ? { state, query: `s=${encodeState(state)}` } : null;
}

/** 시연 기준일: 모의데이터면 DEMO_TODAY, 실데이터면 오늘 */
export const today = () => (process.env.DATA_SOURCE === "cache" ? new Date().toISOString().slice(0, 10) : DEMO_TODAY);

export function run(state: InputState): Recommendation {
  return recommend(state.profile, state.applications, getDataset(), today());
}

export function allScored(rec: Recommendation): ScoredPosting[] {
  const seen = new Map<string, ScoredPosting>();
  for (const sp of [...Object.values(rec.tiers).flat(), ...rec.redirect]) seen.set(sp.posting.id, sp);
  return [...seen.values()];
}

export interface CardView {
  rec: Recommendation;
  sp: ScoredPosting;
  card: CardText;
  coverage: ReturnType<typeof coverageFor>;
  trainings: ReturnType<typeof matchTrainings>;
}

export async function buildCard(state: InputState, postingId: string): Promise<CardView | null> {
  const data = getDataset();
  const rec = run(state);
  const pool = allScored(rec);
  const sp = pool.find((x) => x.posting.id === postingId);
  if (!sp) return null;
  const coverage = coverageFor(state.profile, rec, sp, data);
  const trainings = matchTrainings(trainingNeeds(state, rec, coverage?.missing ?? []), state.profile, data);
  const planB =
    pool
      .filter((x) => x.posting.id !== sp.posting.id && x.fit.score >= 60 && (x.tier === sp.tier || x.tier === "growing" || x.tier === "stepping"))
      .sort((a, b) => b.score - a.score)[0] ?? null;
  const card = await getCardWriter().write({ profile: state.profile, rec, sp, coverage, trainings, planB });
  return { rec, sp, card, coverage, trainings };
}

/** 서류 코칭: 추천 목록에 없는 공고(이미 지원한 공고 포함)도 코칭할 수 있다 */
export async function buildDocCoaching(
  state: InputState,
  postingId: string,
): Promise<{ posting: Posting; coaching: DocCoaching; fitScore: number } | null> {
  const data = getDataset();
  const posting = data.postings.find((p) => p.id === postingId);
  if (!posting) return null;
  const fit = currentFit(state.profile, posting, data.skillMap);
  const coaching = await getDocCoach().coach({ profile: state.profile, posting, fit, skillMap: data.skillMap });
  return { posting, coaching, fitScore: fit.score };
}

/** 채울 역량: 목표 직업의 부족 항목 + 목표 공고·지원했던 공고의 우대 조건 중 없는 것 */
export function trainingNeeds(state: InputState, rec: Recommendation, missingItems: string[]) {
  const data = getDataset();
  const applied = state.applications
    .map((a) => data.postings.find((p) => p.id === a.postingId))
    .filter((p): p is Posting => !!p)
    .flatMap((p) => currentFit(state.profile, p, data.skillMap).missing);
  const tags = [...new Set([...missingTargetTags(rec), ...applied])].filter((t) => !state.profile.competencies.includes(t));
  return { items: missingItems, tags };
}

/** 훈련과정 추천(S9): 목표까지 부족한 역량과 이를 채우는 과정 */
export function buildTrainingPlan(state: InputState, regionOnly: boolean) {
  const data = getDataset();
  const rec = run(state);
  const coverage = coverageFor(state.profile, rec, rec.best, data);
  const needs = trainingNeeds(state, rec, coverage?.missing ?? []);
  const pool = regionOnly ? { ...data, trainings: data.trainings.filter((t) => t.region === state.profile.region) } : data;
  const courses = matchTrainings(needs, state.profile, pool, 10).map((t) => ({ course: t, hits: trainingHits(t, needs, data) }));
  return { rec, coverage, needs, courses };
}
