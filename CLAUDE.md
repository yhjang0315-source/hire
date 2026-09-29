# 작업 규칙

- 기획 내용(아이디어, 범위, 데이터, 문구)을 바꾸면 **제출용 PDF에도 항상 반영**한다.
  - 본문 `docs/proposal/src/proposal.html`, 그림 `docs/proposal/src/figures.html` 수정 → `cd docs/proposal && node build.js`
  - 빌드 출력에서 10쪽 모두 `over: 0`, PDF 10쪽 이내인지 확인
  - 관련 문서(`docs/service_design.md`, `docs/proposal_draft.md`, `docs/data_spec.md`)도 같은 내용으로 맞춘다.
- 선정 20팀에는 생성형 AI 플랫폼이 제공된다(공모 요강). 데이터는 공공데이터포털·고용24 Open API 인증키로 활용하고, 항목명은 API 명세로 대조한다.
- 작업은 단계별로 나눠 PR로 올린다.
