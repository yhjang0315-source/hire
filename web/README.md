# 커리어 사다리 — MVP (web)

Next.js 16 · TypeScript · Tailwind CSS

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/lib/types.ts` | 공통 데이터 타입(직업정보, 공고, 프로필, 지원 이력, 훈련과정, 구인구직 통계) |
| `src/data/index.ts` | 데이터 접근 계층(현재 모의데이터, 추후 고용24 수집 캐시) |
| `src/data/mock/` | 시연용 모의데이터 — 모두 가상이며 실제 기업·개인과 무관 |

## 모의데이터

| 파일 | 내용 |
|---|---|
| `occupations.json` | 직업 9종의 업무수행능력·지식 중요도(직업정보 형태) |
| `postings.json` | 공고 27건(시연 기준일 2026-11-15) |
| `personas.json` | 페르소나 3명(자격 격차형·조직 적합형·서류 표현형)과 지원 이력, 기대 결과 |
| `trainings.json` | 국민내일배움카드 훈련과정 6건 |
| `laborStats.json` | 직업분류 중분류·지역별 신규구인·신규구직(구인배수 계산용) |
| `skillMap.json` | 역량 태그 → 직업정보 항목 매핑(실서비스에서는 임베딩 유사도로 대체) |

설계 기준은 [../docs/service_design.md](../docs/service_design.md)를 따른다.
