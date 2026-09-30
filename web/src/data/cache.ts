// 수집 캐시(src/data/cache/*.json)를 읽는 서버 전용 로더
// 캐시가 없는 항목은 모의데이터로 채운다. 역량 매핑 사전은 임베딩 도입 전까지 모의 사전을 쓴다.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getMockDataset, type Dataset } from "./index";

const CACHE_DIR = path.join(process.cwd(), "src/data/cache");

function read<T>(name: string): T[] | undefined {
  const file = path.join(CACHE_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")).items as T[];
}

/** DATA_SOURCE=cache 이면 수집 캐시를, 아니면 모의데이터를 쓴다 */
export function getDataset(): Dataset {
  const mock = getMockDataset();
  if (process.env.DATA_SOURCE !== "cache") return mock;
  return {
    occupations: read("occupations") ?? mock.occupations,
    postings: read("postings") ?? mock.postings,
    trainings: read("trainings") ?? mock.trainings,
    laborStats: read("laborStats") ?? mock.laborStats,
    skillMap: mock.skillMap,
  };
}
