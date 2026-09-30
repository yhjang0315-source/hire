// 공개 자료로 확인한 워크넷 채용정보 필드명으로 만든 예시 응답으로 파싱·정규화를 검증한다.
// 실제 응답 구조는 인증키 발급 후 `--raw` 저장본으로 다시 확인한다.
import { describe, expect, it } from "vitest";
import { getMockDataset } from "@/data";
import {
  laborStatFromRaw,
  list,
  normCareer,
  normDate,
  normEducation,
  normRegion,
  normSalary,
  occupationFromRaw,
  pick,
  postingFromRaw,
  trainingFromRaw,
  type Raw,
} from "./normalize";
import { findDeep, parseBody } from "./parse";

const skillMap = getMockDataset().skillMap;

const LIST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<wantedRoot><total>2</total><startPage>1</startPage><display>10</display>
  <wanted>
    <wantedAuthNo>K151612611150001</wantedAuthNo><company>가상정밀</company><busino>0000000000</busino>
    <indTpNm>기계 제조업</indTpNm><title>품질관리(QC) 신입 채용</title><salTpNm>연봉</salTpNm><sal>3000만원~3400만원</sal>
    <minSal>30000000</minSal><maxSal>34000000</maxSal><region>경기 화성시</region><holidayTpNm>주5일근무</holidayTpNm>
    <minEdubg>대졸(2~3년)</minEdubg><maxEdubg></maxEdubg><career>신입</career><regDt>26-11-01</regDt><closeDt>채용시까지 26-11-20</closeDt>
    <empTpCd>10</empTpCd><jobsCd>851101</jobsCd>
  </wanted>
  <wanted>
    <wantedAuthNo>K151612611150002</wantedAuthNo><company>가상기계</company><title>기계설계 경력</title><salTpNm>월급</salTpNm>
    <minSal>3000000</minSal><maxSal>3500000</maxSal><region>서울특별시 금천구</region><minEdubg>대졸(4년)</minEdubg>
    <career>경력(2년 이상)</career><closeDt>26-11-30</closeDt><empTpCd>20</empTpCd><jobsCd>151101</jobsCd>
  </wanted>
</wantedRoot>`;

describe("값 정규화", () => {
  it("지역: 첫 행정구역을 짧은 이름으로", () => {
    expect(normRegion("경기 화성시")).toBe("경기");
    expect(normRegion("서울특별시 금천구")).toBe("서울");
    expect(normRegion("경기도 수원시")).toBe("경기");
  });

  it("급여: 만원/년으로 환산", () => {
    expect(normSalary("연봉", 30_000_000, 34_000_000)).toEqual({ min: 3000, max: 3400 });
    expect(normSalary("월급", 3_000_000, 3_500_000)).toEqual({ min: 3600, max: 4200 });
  });

  it("경력·학력·날짜", () => {
    expect(normCareer("경력(2년 이상)")).toEqual({ career: "경력", minCareerYears: 2 });
    expect(normCareer("신입 또는 경력").career).toBe("무관");
    expect(normEducation("대졸(2~3년)")).toBe("전문대졸");
    expect(normEducation("대졸(4년)")).toBe("대졸");
    expect(normDate("채용시까지 26-11-20")).toBe("2026-11-20");
    expect(normDate("20261130")).toBe("2026-11-30");
  });

  it("후보 키는 대소문자·밑줄을 무시한다", () => {
    expect(pick({ COURSE_MAN: "100" }, ["courseMan"])).toBe("100");
  });
});

describe("채용정보", () => {
  it("XML 목록을 파싱해 Posting으로 정규화한다", () => {
    const root = parseBody(LIST_XML);
    const items = list<Raw>(findDeep(root, ["wanted"]));
    expect(items).toHaveLength(2);

    const detail = { wanted: { jobCont: "도면 기준 부품 치수 검사, 공정 품질 점검", pfCond: "도면 해독 가능자, 품질 기준 이해" } };
    const p = postingFromRaw(items[0], detail, { "851101": "8111" }, skillMap);
    expect(p).toMatchObject({
      id: "K151612611150001",
      company: "가상정밀",
      occupationCode: "8111",
      region: "경기",
      salaryMin: 3000,
      salaryMax: 3400,
      career: "신입",
      education: "전문대졸",
      employmentType: "정규직",
      closeDate: "2026-11-20",
    });
    expect(p.preferred).toContain("도면 해독");

    const q = postingFromRaw(items[1], undefined, {}, skillMap);
    expect(q).toMatchObject({ region: "서울", career: "경력", minCareerYears: 2, salaryMin: 3600, occupationCode: "151101" });
  });
});

describe("훈련과정·직업정보·통계", () => {
  it("훈련과정(JSON, 대문자 키도 허용)", () => {
    const t = trainingFromRaw(
      { TRPR_ID: "AIG2026", TRPR_DEGR: "3", TITLE: "3D CAD 설계 실무", SUB_TITLE: "가상교육원", ADDRESS: "경기도 수원시", TRA_START_DATE: "20261201", TRA_END_DATE: "20270131", COURSE_MAN: "1800000", REAL_MAN: "270000", EI_EMPL_RATE6: "68" },
      skillMap,
    );
    expect(t).toMatchObject({ id: "AIG2026-3", region: "경기", startDate: "2026-12-01", cost: 1_800_000, employmentRate6: 68 });
    expect(t.competencies).toContain("3D CAD");
  });

  it("직업정보 요약 + 능력·지식 목록", () => {
    const o = occupationFromRaw(
      { jobCd: "K000001", jobNm: "품질관리 검사원", jobClcd: "811" },
      [{ jobAblNm: "품질관리분석", jobAblStatus: "85" }],
      [{ knwldgNm: "생산과 공정", knwldgStatus: "80" }],
    );
    expect(o).toMatchObject({
      code: "K000001",
      classCode: { major: "8", middle: "81", minor: "811" },
      abilities: { 품질관리분석: 85 },
      knowledge: { "생산과 공정": 80 },
    });
  });

  it("구인구직 통계 한 행", () => {
    expect(laborStatFromRaw({ jobClcd: "8110", regionNm: "경기도", baseYm: "202610", newRcrtCnt: "2410", newSeekCnt: "1480" })).toEqual({
      middleClass: "81",
      region: "경기",
      month: "2026-10",
      newOpenings: 2410,
      newSeekers: 1480,
    });
  });
});
