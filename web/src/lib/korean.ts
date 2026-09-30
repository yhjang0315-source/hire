// 조사 붙이기(을/를, 이/가, 은/는, 과/와, 으로/로)

const LATIN_BATCHIM = new Set(["l", "m", "n", "r"]); // 엘·엠·엔·알
const DIGIT_BATCHIM = new Set(["0", "1", "3", "6", "7", "8"]); // 영·일·삼·육·칠·팔

function lastSound(word: string): { batchim: boolean; rieul: boolean } {
  const ch = word.trim().replace(/[)\]"'’”]+$/, "").slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    return { batchim: jong !== 0, rieul: jong === 8 };
  }
  const lower = ch.toLowerCase();
  if (DIGIT_BATCHIM.has(lower)) return { batchim: true, rieul: lower === "1" || lower === "7" || lower === "8" };
  return { batchim: LATIN_BATCHIM.has(lower), rieul: lower === "l" || lower === "r" };
}

type Pair = "을를" | "이가" | "은는" | "과와" | "으로" | "이라";

export function josa(word: string, pair: Pair): string {
  const { batchim, rieul } = lastSound(word);
  const table: Record<Pair, [string, string]> = {
    을를: ["을", "를"],
    이가: ["이", "가"],
    은는: ["은", "는"],
    과와: ["과", "와"],
    으로: ["으로", "로"],
    이라: ["이라", "라"],
  };
  if (pair === "으로") return word + (batchim && !rieul ? "으로" : "로");
  return word + (batchim ? table[pair][0] : table[pair][1]);
}

/** 항목 나열: ["A","B","C"] → "A·B·C" */
export const joinItems = (items: string[], max = 3) => items.slice(0, max).join("·");

/** 따옴표로 감싼 말 뒤에 조사: quoted("주도적", "을를") → "'주도적'을" */
export const quoted = (word: string, pair: Pair) => `'${word}'${josa(word, pair).slice(word.length)}`;

/** 횟수 말: 5 → "다섯 번" (1~10), 그 외는 숫자 */
export function times(n: number): string {
  const words = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
  return n >= 1 && n <= 10 ? `${words[n]} 번` : `${n}번`;
}
