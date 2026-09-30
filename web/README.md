# 커리어 사다리 — MVP (web)

Next.js 16 · TypeScript · Tailwind CSS

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
npm test      # 엔진·카드 문장·수집 정규화 테스트(Vitest)
```

## 화면 (P0)

| 경로 | 화면 |
|---|---|
| `/` | 시작 — 시연 페르소나 3명 선택, 직접 입력 |
| `/input` | 입력 — 목표 직종, 전공·자격, AI 경력 인터뷰(시연은 키워드 규칙), 공고 번호로 지원 이력 자동 채움, 희망 조건, 성향 자가진단 |
| `/result` | 진단과 추천 — 진단 유형·근거, 지금 지원 1순위, 사다리 단계별 공고 또는 다시 도전할 공고 |
| `/card/[공고번호]` | 추천 카드 — A. 한마디 · B. 판단 근거(출처 표시) · 목표 역량 충족도 · C. 이후 계획 · 플랜 B · 훈련과정 |

입력 상태는 URL(`?persona=` 또는 `?s=`)에 담겨 서버 저장 없이 새로고침·공유가 된다. 카드의 "결과 입력"으로 지원 결과를 바꾸면 다시 진단한다.

## 구조

| 경로 | 내용 |
|---|---|
| `src/lib/types.ts` | 공통 데이터 타입(직업정보, 공고, 프로필, 지원 이력, 훈련과정, 구인구직 통계) |
| `src/data/index.ts` | 데이터 접근 계층(현재 모의데이터, 추후 고용24 수집 캐시) |
| `src/data/mock/` | 시연용 모의데이터 — 모두 가상이며 실제 기업·개인과 무관 |
| `src/lib/engine/` | 진단·추천 엔진(규칙 기반, AI 없이 동작) |
| `src/lib/collect/` | 고용24 응답 파싱·정규화 |
| `scripts/` | 데이터 수집 CLI(`collect.ts`)와 API 호출 설정(`endpoints.ts`) |
| `src/data/cache.ts` | 수집 캐시 로더(`DATA_SOURCE=cache`) |
| `src/lib/card/` | 추천 카드 문장(`writer.ts`: 템플릿 작성기·금지 표현 검사), 화면 라벨 |
| `src/lib/session.ts` | 페이지 공통: URL 상태 해석, 엔진 실행, 카드 조립 |
| `src/lib/interview.ts` | AI 경력 인터뷰 시연용 키워드 규칙 |
| `src/app/`, `src/components/` | 화면 |

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

## 데이터 수집

1. `.env.example`을 `.env.local`로 복사하고 인증키를 넣는다.
2. 수집한다.
   ```bash
   npm run collect -- mock                    # 인증키 없이 캐시 파이프라인 확인
   npm run collect -- postings --pages 3 --raw
   npm run collect -- trainings --pages 2 --raw
   npm run collect -- occupations --limit 50 --raw
   ```
3. 앱에서 캐시를 쓰려면 `.env.local`에 `DATA_SOURCE=cache`.

결과는 `src/data/cache/`(저장소 제외), 원본 응답은 `--raw`로 `data/raw/`에 저장된다.

**아직 확인하지 못한 것**: 공식 API 명세 페이지를 확인하지 못해 `scripts/endpoints.ts`의 URL·파라미터 일부와 `src/lib/collect/normalize.ts`의 필드 후보 키가 추정값이다(`confirmed: false`로 표시, 실행 시 경고).

1. 인증키 발급 후 `--raw`로 원본 응답을 저장한다.
2. 실제 필드명과 대조해 후보 키와 URL을 고친다.
3. 공고 직종코드 → 직업정보 코드 매핑(`src/data/occupationMap.json`)을 채운다.
4. 공고의 인재상(`talent`)은 비워서 수집하므로, 생성형 AI 추출 단계에서 채운다.

## 생성형 AI 연결 지점

선정 20팀에 제공되는 생성형 AI 플랫폼이 정해지면 아래만 바꾼다. 점수·진단·수치는 계속 엔진이 계산한다.

1. `src/lib/card/writer.ts`의 `getCardWriter()` — 템플릿 대신 AI로 카드 문장 생성(금지 표현 검사 `violations()` 유지)
2. `src/lib/interview.ts`의 `interviewTags()` — 대화형 인터뷰와 역량 구조화 추출
3. 수집 단계의 공고 인재상(`talent`)·우대 역량 추출

설계 기준은 [../docs/service_design.md](../docs/service_design.md)를 따른다.
