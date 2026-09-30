// 역량 태그와 직업정보 항목(업무수행능력·지식)을 잇는 계산
import type { Occupation, SkillMap } from "@/lib/types";

/** 직업의 업무수행능력·지식 중요도를 하나의 벡터로 합친다 */
export function occupationVector(occ: Occupation): Record<string, number> {
  return { ...occ.abilities, ...occ.knowledge };
}

/** 태그 목록이 가리키는 직업정보 항목 집합 */
export function itemsOf(tags: string[], skillMap: SkillMap): Set<string> {
  const items = new Set<string>();
  for (const tag of tags) for (const item of skillMap[tag] ?? []) items.add(item);
  return items;
}

/**
 * 공고의 우대 태그를 사용자가 갖췄는지 판단한다.
 * 같은 태그를 갖고 있거나, 사용자 태그 하나가 그 태그의 항목을 모두 포함하면 충족.
 * (실서비스에서는 임베딩 유사도로 대체)
 */
export function coversTag(userTags: string[], tag: string, skillMap: SkillMap): boolean {
  if (userTags.includes(tag)) return true;
  const need = skillMap[tag];
  if (!need || need.length === 0) return false;
  return userTags.some((t) => {
    const has = new Set(skillMap[t] ?? []);
    return need.every((item) => has.has(item));
  });
}

/** 목표 직업의 핵심 항목(중요도 기준 이상) */
export function keyItems(occ: Occupation, threshold = 70): string[] {
  return Object.entries(occupationVector(occ))
    .filter(([, v]) => v >= threshold)
    .map(([k]) => k);
}

export interface Coverage {
  keyItems: string[];
  have: string[];
  missing: string[];
  /** 지금 충족도(%) */
  now: number;
  /** 추천 공고에서 1년 일했을 때 예상 충족도(%) — 공고 직업의 핵심 항목을 더해 계산 */
  afterYear?: number;
  gained?: string[];
}

/** 목표 직업 핵심 항목 대비 역량 충족도 */
export function coverage(
  userTags: string[],
  target: Occupation,
  skillMap: SkillMap,
  postingOcc?: Occupation,
): Coverage {
  const key = keyItems(target);
  const userItems = itemsOf(userTags, skillMap);
  const have = key.filter((k) => userItems.has(k));
  const missing = key.filter((k) => !userItems.has(k));
  const pct = (n: number) => (key.length === 0 ? 0 : Math.round((n / key.length) * 100));
  const result: Coverage = { keyItems: key, have, missing, now: pct(have.length) };
  if (postingOcc) {
    const postingKey = new Set(keyItems(postingOcc));
    const gained = missing.filter((k) => postingKey.has(k));
    result.gained = gained;
    result.afterYear = pct(have.length + gained.length);
  }
  return result;
}
