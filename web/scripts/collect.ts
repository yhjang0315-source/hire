// 고용24 데이터 수집 → src/data/cache/*.json
//
//   npm run collect -- postings [--pages 3] [--raw]
//   npm run collect -- trainings [--pages 2] [--raw]
//   npm run collect -- occupations [--limit 50] [--raw]
//   npm run collect -- stats --raw
//   npm run collect -- mock          # 인증키 없이 모의데이터로 캐시 파이프라인 확인
//
// 인증키는 web/.env.local 에 넣는다(.env.example 참고). --raw 는 원본 응답을 data/raw/ 에 저장한다.
import fs from "node:fs";
import path from "node:path";
import { getMockDataset } from "@/data";
import {
  laborStatFromRaw,
  list,
  occupationFromRaw,
  pick,
  postingFromRaw,
  str,
  trainingFromRaw,
  type Raw,
} from "@/lib/collect/normalize";
import { findDeep, parseBody } from "@/lib/collect/parse";
import { ENDPOINTS, type Endpoint, type EndpointName } from "./endpoints";

const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "src/data/cache");
const RAW_DIR = path.join(ROOT, "data/raw");
const skillMap = getMockDataset().skillMap;

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function endpoint(name: EndpointName): Endpoint {
  const ep: Endpoint = { ...ENDPOINTS[name] };
  const override = process.env[`${name.toUpperCase()}_URL`];
  if (override) ep.url = override;
  if (!ep.confirmed) console.warn(`⚠ ${ep.name}: 명세 미확인 설정 — ${ep.note}`);
  if (!ep.url) throw new Error(`${ep.name}: URL이 비어 있습니다. ${ep.note}`);
  if (!process.env[ep.keyEnv]) throw new Error(`${ep.name}: 인증키 ${ep.keyEnv} 가 없습니다. web/.env.local 에 추가하세요.`);
  return ep;
}

async function call(ep: Endpoint, params: Record<string, string>, rawName?: string): Promise<Raw> {
  const url = new URL(ep.url);
  for (const [k, v] of Object.entries({ authKey: process.env[ep.keyEnv]!, ...ep.params, ...params })) url.searchParams.set(k, v);
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      if (rawName && flag("raw")) {
        fs.mkdirSync(RAW_DIR, { recursive: true });
        fs.writeFileSync(path.join(RAW_DIR, rawName), body);
      }
      await new Promise((r) => setTimeout(r, 300)); // 호출 간격
      return parseBody(body);
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

function save(name: string, items: unknown, source: string) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify({ _source: source, _collectedAt: new Date().toISOString(), items }, null, 2) + "\n");
  console.log(`✓ ${file} (${Array.isArray(items) ? items.length : Object.keys(items as object).length}건)`);
}

/** 직종코드(jobsCd) → 직업정보 코드 매핑. 없으면 직종코드를 그대로 쓴다 */
function occupationMap(): Record<string, string> {
  const file = path.join(ROOT, "src/data/occupationMap.json");
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")).items as Record<string, string>) : {};
}

async function collectPostings() {
  const pages = Number(arg("pages", "1"));
  const listEp = endpoint("postingsList");
  const detailEp = endpoint("postingDetail");
  const map = occupationMap();
  const out = [];
  for (let page = 1; page <= pages; page++) {
    const root = await call(listEp, { startPage: String(page) }, `postings-list-${page}.xml`);
    const items = list<Raw>(findDeep(root, ["wanted"]));
    if (items.length === 0) break;
    for (const item of items) {
      const id = str(pick(item, ["wantedAuthNo"]));
      const d = await call(detailEp, { wantedAuthNo: id }, `posting-${id}.xml`);
      const corp = findDeep(d, ["corpInfo"]) as Raw | undefined;
      const wanted = findDeep(d, ["wantedInfo"]) as Raw | undefined;
      out.push(postingFromRaw(item, { corp, wanted }, map, skillMap));
    }
    console.log(`  채용정보 ${page}/${pages}쪽: 누적 ${out.length}건`);
  }
  save("postings", out, listEp.url);
}

async function collectTrainings() {
  const pages = Number(arg("pages", "1"));
  const ep = endpoint("trainings");
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const until = new Date(today.getTime() + 120 * 86_400_000);
  const out = [];
  for (let page = 1; page <= pages; page++) {
    const root = await call(ep, { pageNum: String(page), srchTraStDt: fmt(today), srchTraEndDt: fmt(until) }, `trainings-${page}.json`);
    const items = list<Raw>(findDeep(root, ["scn_list", "srchList", "list"]));
    if (items.length === 0) break;
    out.push(...items.map((i) => trainingFromRaw(i, skillMap)));
  }
  save("trainings", out, ep.url);
}

async function collectOccupations() {
  const limit = Number(arg("limit", "50"));
  const listEp = endpoint("occupationsList");
  const detailEp = endpoint("occupationDetail");
  const root = await call(listEp, {}, "occupations-list.xml");
  const rows = list<Raw>(findDeep(root, ["jobList", "jobs", "job"])).slice(0, limit);
  const out = [];
  for (const row of rows) {
    const jobCd = str(pick(row, ["jobCd"]));
    const summary = (findDeep(await call(detailEp, { jobCd, dtlGb: "1" }, `job-${jobCd}-1.xml`), ["jobSum", "jobsDetail"]) ?? row) as Raw;
    const ak = await call(detailEp, { jobCd, dtlGb: "5" }, `job-${jobCd}-5.xml`);
    const abilities = list<Raw>(findDeep(ak, ["jobAbil", "jobAblList"]));
    const knowledge = list<Raw>(findDeep(ak, ["Knwldg", "knwldgList"]));
    out.push(occupationFromRaw({ ...row, ...summary }, abilities, knowledge));
  }
  save("occupations", out, listEp.url);
}

async function collectStats() {
  const ep = endpoint("laborStats");
  const root = await call(ep, {}, "labor-stats.xml");
  const rows = list<Raw>(findDeep(root, ["row", "item", "list"]));
  save("laborStats", rows.map(laborStatFromRaw), ep.url);
}

function collectMock() {
  const d = getMockDataset();
  save("postings", d.postings, "mock");
  save("occupations", d.occupations, "mock");
  save("trainings", d.trainings, "mock");
  save("laborStats", d.laborStats, "mock");
}

async function main() {
  loadEnv();
  const target = process.argv[2];
  const jobs: Record<string, () => unknown> = {
    postings: collectPostings,
    trainings: collectTrainings,
    occupations: collectOccupations,
    stats: collectStats,
    mock: collectMock,
  };
  if (!target || !jobs[target]) {
    console.log("사용법: npm run collect -- <postings|trainings|occupations|stats|mock> [--pages N] [--limit N] [--raw]");
    process.exit(1);
  }
  await jobs[target]();
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
