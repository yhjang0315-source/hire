// 데이터 접근 계층 — 지금은 모의데이터만 제공한다.
// 고용24 API 수집 데이터가 준비되면 같은 Dataset 형태로 캐시를 읽도록 확장한다.
import type {
  Application,
  LaborStat,
  Occupation,
  Persona,
  Posting,
  Profile,
  SkillMap,
  TrainingCourse,
} from "@/lib/types";
import occupations from "./mock/occupations.json";
import postings from "./mock/postings.json";
import personas from "./mock/personas.json";
import trainings from "./mock/trainings.json";
import laborStats from "./mock/laborStats.json";
import skillMap from "./mock/skillMap.json";
import seekers from "./mock/seekers.json";

export interface Dataset {
  occupations: Occupation[];
  postings: Posting[];
  trainings: TrainingCourse[];
  laborStats: LaborStat[];
  skillMap: SkillMap;
}

/** 시연 기준일 — 모의 공고 마감일이 이 날짜 기준으로 짜여 있다 */
export const DEMO_TODAY = "2026-11-15";

export function getMockDataset(): Dataset {
  return {
    occupations: occupations.items as Occupation[],
    postings: postings.items as Posting[],
    trainings: trainings.items as TrainingCourse[],
    laborStats: laborStats.items as LaborStat[],
    skillMap: skillMap.items as SkillMap,
  };
}

export function getPersonas(): Persona[] {
  return personas.items as Persona[];
}

/** 상담사 대시보드용 가명 구직자 — profile이 없으면 같은 id의 페르소나를 쓴다 */
export function getSeekers(): { id: string; counselRequested: boolean; lastDiagnosedAt: string; profile: Profile; applications: Application[] }[] {
  return seekers.items.map((s) => {
    const own = s as Partial<{ profile: Profile; applications: Application[] }>;
    const persona = getPersonas().find((p) => p.profile.id === s.id);
    return {
      id: s.id,
      counselRequested: s.counselRequested,
      lastDiagnosedAt: s.lastDiagnosedAt,
      profile: own.profile ?? persona!.profile,
      applications: own.applications ?? persona!.applications,
    };
  });
}
