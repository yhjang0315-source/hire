// 커리어 사다리 공통 데이터 타입
// 고용24 Open API 응답을 이 형태로 정규화해서 사용한다(수집 스크립트에서 변환).

/** 직업정보 — 업무수행능력·지식 중요도(0~100) */
export interface Occupation {
  code: string; // 직업코드
  name: string;
  /** 직업분류 계층: 대분류(1자리)-중분류(2자리)-소분류(3자리) */
  classCode: { major: string; middle: string; minor: string };
  abilities: Record<string, number>; // 업무수행능력 항목명 → 중요도
  knowledge: Record<string, number>; // 지식 항목명 → 중요도
  relatedJobs: string[];
  certificates: string[];
}

export type CareerRequirement = "신입" | "경력" | "무관";
export type Education = "무관" | "고졸" | "전문대졸" | "대졸";
export type EmploymentType = "정규직" | "계약직" | "인턴";

/** 채용공고 — 채용목록 + 채용상세 */
export interface Posting {
  id: string; // 구인인증번호
  company: string;
  companySize?: string;
  industry?: string; // 업종
  title: string;
  occupationCode: string; // 직종코드 → Occupation.code
  region: string;
  salaryMin?: number; // 만원/년
  salaryMax?: number;
  career: CareerRequirement;
  minCareerYears?: number;
  education: Education;
  majors?: string[]; // 필수·우대 전공 계열
  requiredCertificates?: string[];
  preferred: string[]; // 우대조건·스킬 키워드
  duties: string; // 직무내용
  talent: string[]; // 인재상 키워드(실서비스에서는 생성형 AI로 공고 본문에서 추출)
  employmentType: EmploymentType;
  closeDate: string; // YYYY-MM-DD
}

/** 성향 5축: -2(왼쪽 성향) ~ +2(오른쪽 성향) */
export interface Traits {
  pace: number; // 속도 ↔ 신중
  lead: number; // 주도 ↔ 협력
  change: number; // 변화 ↔ 안정
  scope: number; // 큰 그림 ↔ 디테일
  work: number; // 독립 ↔ 팀
}

/** 구직자 프로필 */
export interface Profile {
  id: string; // 가명 ID
  alias: string;
  targetOccupationCodes: string[];
  major: string; // 전공 계열(예: 기계, 컴퓨터)
  education: Education;
  certificates: string[];
  careerYears: number;
  experienceText: string; // 경력·경험 자유 서술
  competencies: string[]; // 역량 태그(실서비스에서는 AI 경력 인터뷰로 추출)
  region: string;
  minSalary?: number; // 만원/년
  searchMonths: 1 | 3 | 6; // 구직 가능 기간
  traits?: Traits;
}

export type ApplicationResult = "서류탈락" | "면접탈락" | "최종합격" | "대기";

/** 입사지원 이력 */
export interface Application {
  postingId: string;
  appliedAt: string; // YYYY-MM-DD
  result: ApplicationResult;
}

/** 시연용 페르소나(모의데이터) */
export interface Persona {
  profile: Profile;
  applications: Application[];
  /** 설계 문서 기준 기대 결과 — 엔진 테스트에 사용 */
  expected: {
    diagnosis: DiagnosisType;
    bestPostingId?: string;
    tiers?: Partial<Record<Tier, string[]>>;
  };
}

/** 국민내일배움카드 훈련과정 */
export interface TrainingCourse {
  id: string; // 훈련과정ID
  title: string;
  institution: string;
  competencies: string[]; // 과정이 채워주는 역량 태그
  region: string;
  startDate: string;
  endDate: string;
  cost: number; // 수강비(원)
  realCost: number; // 실제훈련비(원)
  employmentRate6?: number; // 6개월 취업률(%)
  satisfaction?: number; // 만족도(100점)
}

/** 고용행정통계 — 직종 중분류·지역별 구인구직 */
export interface LaborStat {
  middleClass: string; // 직업분류 중분류
  className?: string; // 중분류 이름
  region: string;
  month: string; // YYYY-MM
  newOpenings: number; // 신규구인인원
  newSeekers: number; // 신규구직건수
}

/** 역량 태그 → 직업정보 항목(업무수행능력·지식) 매핑
 *  실서비스에서는 임베딩 유사도로 대체한다. */
export type SkillMap = Record<string, string[]>;

export type DiagnosisType = "판단보류" | "자격격차형" | "서류표현형" | "조직적합형" | "혼합형";
export type Tier = "target" | "stepping" | "growing" | "immediate";
