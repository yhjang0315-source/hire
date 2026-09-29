# 1차 기획안 PDF

- 결과물: [career_ladder_proposal.pdf](career_ladder_proposal.pdf) (A4 10쪽)
- 그림: [images/](images/) — fig1 서비스 컨셉, fig2 AI·규칙 역할 분담, fig3 서비스 흐름, fig4~6 화면 목업

## 수정·재생성

1. 본문은 `src/proposal.html`, 그림은 `src/figures.html`, 공통 스타일은 `src/style.css`에서 수정
2. 한글 폰트(Pretendard) 준비 — `fonts/`는 저장소에 포함하지 않음
   ```bash
   npm pack pretendard && tar xzf pretendard-*.tgz
   mkdir -p fonts && cp package/dist/public/static/Pretendard-{Regular,Medium,SemiBold,Bold,ExtraBold}.otf fonts/
   ```
3. 빌드 (Playwright 필요)
   ```bash
   node build.js            # 그림 PNG + PDF 생성, 쪽별 넘침 검사 결과 출력
   node build.js --shots    # 쪽별 PNG 미리보기도 저장 (SHOT_DIR 환경변수로 위치 지정)
   ```
4. 출력되는 넘침 검사 결과에서 모든 쪽의 `over`가 0인지 확인
