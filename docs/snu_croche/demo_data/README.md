# 시연용 가상 자료

> 모두 가상 데이터다(규정 11: 실제 강의자료·타인 정보 사용 금지). 시연일 10.17(토) 기준으로 날짜를 맞췄다.

## 파일

| 파일 | 용도 | 시연 포인트 |
|---|---|---|
| [files/report_management.pdf](files/report_management.pdf) | 경영학원론 기말 보고서 안내 | 마감 10/23(금) 23:59, A4 5쪽, 비중 20% |
| [files/coding_ds_hw3.pdf](files/coding_ds_hw3.pdf) | 자료구조 과제 3 안내 | 마감 10/21(수) — **제출 시각 누락 → 되묻기** |
| [files/lecture_stats_week7.png](files/lecture_stats_week7.png) | 통계학 7주차 녹강 공지 캡처 | 수강 기간 10/19~10/25, 영상 75분, 90% 시청 |
| [files/timetable.png](files/timetable.png) | 2학기 시간표 캡처 | 월·수 오전, 화 오전~점심 수업 |
| [expected_tasks.json](expected_tasks.json) | 위 파일의 기대 추출 결과 | `extractTasks` 프롬프트·스키마 조정 기준 |
| [fixed_events.json](fixed_events.json) | 수업 + 알바(목·토 13~16시) | 스케줄러 입력 |
| [profiles.json](profiles.json) | 몰아형·미리형 설문 답과 보정 후 프로필 | 프로필 전환 시연 |
| [timer_logs.json](timer_logs.json) | 시연 전 1주 타이머 기록 | 보정 배율·집중 시간 계산 근거 |

## 프로필 근거 (timer_logs.json으로 검산)

| | 코딩 배율 | 시험 배율 | 녹강 배율 | 집중 시간(녹강 제외 평균) |
|---|---|---|---|---|
| 몰아형 | 8h ÷ 4h = 2.0 | 3.5h ÷ 3h ≈ 1.2 | 1h ÷ 0.9h ≈ 1.1 | 2.9h → 180분 |
| 미리형 | 6h ÷ 4h = 1.5 | 3.5h ÷ 3h ≈ 1.2 | 0.9h ÷ 0.9h = 1.0 | 1.9h → 120분 |

## 다시 만들기

```bash
node build.js   # src/*.html → files/ (폰트: ../onepager/fonts)
```
