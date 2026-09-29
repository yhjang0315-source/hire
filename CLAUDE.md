# 작업 규칙

- 기획 내용(아이디어, 범위, 데이터, 문구)을 바꾸면 **제출용 PDF에도 항상 반영**한다.
  - 본문 `docs/proposal/src/proposal.html`, 그림 `docs/proposal/src/figures.html` 수정 → `cd docs/proposal && node build.js`
  - 빌드 출력에서 10쪽 모두 `over: 0`, PDF 10쪽 이내인지 확인
  - 관련 문서(`docs/service_design.md`, `docs/proposal_draft.md`, `docs/data_spec.md`)도 같은 내용으로 맞춘다.
- API는 선정 시 주최측이 제공한다. 데이터 항목명은 그때 제공 API 명세로 대조한다.
- 작업은 단계별로 나눠 PR로 올린다.
