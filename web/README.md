# 커리어 사다리 — MVP (web)

Next.js 16 · TypeScript · Tailwind CSS

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
npm test      # 진단·추천 엔진 테스트(Vitest)
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/lib/types.ts` | 공통 데이터 타입(직업정보, 공고, 프로필, 지원 이력, 훈련과정, 구인구직 통계) |
| `src/data/index.ts` | 데이터 접근 계층(현재 모의데이터, 추후 고용24 수집 캐시) |
| `src/data/mock/` | 시연용 모의데이터 — 모두 가상이며 실제 기업·개인과 무관 |
| `src/lib/engine/` | 진단·추천 엔진(규칙 기반, AI 없이 동작) |

## 모의데이터

| 파일 | 내용 |
|---|---|
| `occupations.json` | 직업 9종의 업무수행능력·지식 중요도(직업정보 형태) |
| `postings.json` | 공고 27건(시연 기준일 2026-11-15) |
| `personas.json` | 페르소나 3명(자격 격차형·조직 적합형·서류 표현형)과 지원 이력, 기대 결과 |
| `trainings.json` | 국민내일배움카드 훈련과정 6건 |
| `laborStats.json` | 직업분류 중분류·지역별 신규구인·신규구직(구인배수 계산용) |
| `skillMap.json` | 역량 태그 → 직업정보 항목 매핑(실서비스에서는 임베딩 유사도로 대체) |

## 진단·추천 엔진

| 파일 | 내용 |
|---|---|
| `scores.ts` | F 현재 적합도, T 목표 기여도(평균을 뺀 직업 벡터 코사인), C 경력 인정 가능성(직업분류 계층), 조건 적합, 마감 임박 |
| `diagnosis.ts` | 탈락 원인 진단(판단보류·자격격차형·서류표현형·조직적합형·혼합형), 장벽 요건, 공통 인재상, 성향 차이 |
| `traits.ts` | 인재상 키워드 ↔ 성향 5축 궁합 |
| `competency.ts` | 역량 태그 ↔ 직업정보 항목 매칭, 목표 역량 충족도(지금 → 1년 후 예상) |
| `recommend.ts` | 공고 점수 → 사다리 단계(target·stepping·growing·immediate) 분류 → 지금 지원 1순위, 방향 전환 트랙, 훈련과정 매칭 |

```ts
import { getMockDataset, getPersonas, DEMO_TODAY } from "@/data";
import { recommend } from "@/lib/engine";

const [a] = getPersonas();
const rec = recommend(a.profile, a.applications, getMockDataset(), DEMO_TODAY);
rec.diagnosis.type; // "자격격차형"
rec.best?.posting.id; // "MOCK-D01"
```

기준값(임계값·가중치)은 `THRESHOLDS`, `TIER_RULES`, `BEST_RULES`와 `weights()`에 모여 있다.

설계 기준은 [../docs/service_design.md](../docs/service_design.md)를 따른다.
