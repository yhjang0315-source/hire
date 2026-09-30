// 고용24 Open API 호출 설정
// confirmed: false 인 항목은 공식 명세를 아직 확인하지 못한 추정값이다.
// 인증키 발급 후 고용24 Open API 가이드(https://www.work24.go.kr → 고객센터 → OPEN-API)와 대조해 고친다.
// URL은 환경변수(<이름>_URL)로 덮어쓸 수 있다.

export interface Endpoint {
  name: string;
  url: string;
  keyEnv: string; // 인증키 환경변수
  params: Record<string, string>;
  confirmed: boolean;
  note: string;
}

export const ENDPOINTS = {
  postingsList: {
    name: "채용정보 목록",
    url: "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do",
    keyEnv: "WORK24_WANTED_KEY",
    params: { returnType: "XML", callTp: "L", startPage: "1", display: "100" },
    confirmed: false,
    note: "필드명(wantedAuthNo, company, region, career, closeDt, jobsCd 등)은 공개 자료로 확인, URL·파라미터는 추정",
  },
  postingDetail: {
    name: "채용정보 상세",
    url: "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D01.do",
    keyEnv: "WORK24_WANTED_KEY",
    params: { returnType: "XML", callTp: "D", infoSvc: "VALIDATION" },
    confirmed: false,
    note: "구인인증번호(wantedAuthNo)로 조회. 직무내용·우대조건·전공·자격 필드명 추정",
  },
  trainings: {
    name: "국민내일배움카드 훈련과정 목록",
    url: "https://www.work24.go.kr/cm/openApi/call/hr/callOpenApiSvcInfo310L01.do",
    keyEnv: "WORK24_TRAINING_KEY",
    params: { returnType: "JSON", outType: "1", pageNum: "1", pageSize: "100", sort: "ASC", sortCol: "2" },
    confirmed: false,
    note: "URL과 파라미터 이름(authKey·returnType·outType·pageNum·pageSize·srchTraStDt·srchTraEndDt·sort·sortCol)은 공개 자료로 확인, sortCol 값은 추정",
  },
  occupationsList: {
    name: "직업정보 목록",
    url: "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo212L01.do",
    keyEnv: "WORK24_JOB_KEY",
    params: { returnType: "XML", target: "JOBCD" },
    confirmed: false,
    note: "URL·파라미터 추정",
  },
  occupationDetail: {
    name: "직업정보 상세(능력·지식)",
    url: "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo212D01.do",
    keyEnv: "WORK24_JOB_KEY",
    params: { returnType: "XML", target: "JOBDTL", jobGb: "1" },
    confirmed: false,
    note: "직업코드(jobCd)와 상세 구분으로 조회. URL·파라미터 추정",
  },
  laborStats: {
    name: "고용행정통계 구인구직취업현황",
    url: "",
    keyEnv: "EIS_KEY",
    params: {},
    confirmed: false,
    note: "고용행정통계 Open API 가이드(https://eis.work24.go.kr/eisps/opiv/selectOpivList.do)에서 통계표 ID·파라미터 확인 필요",
  },
} satisfies Record<string, Endpoint>;

export type EndpointName = keyof typeof ENDPOINTS;
