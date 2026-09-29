// 응답 본문(XML 또는 JSON) 파싱
import { XMLParser } from "fast-xml-parser";
import type { Raw } from "./normalize";

const xml = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });

export function parseBody(body: string): Raw {
  const text = body.trim();
  if (text.startsWith("{") || text.startsWith("[")) return JSON.parse(text) as Raw;
  return xml.parse(text) as Raw;
}

/** 중첩 객체에서 이름이 일치하는 첫 값을 찾는다(루트 태그 이름이 달라도 동작하도록) */
export function findDeep(obj: unknown, keys: string[]): unknown {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  const stack: unknown[] = [obj];
  while (stack.length) {
    const cur = stack.shift();
    if (!cur || typeof cur !== "object") continue;
    for (const [k, v] of Object.entries(cur as Raw)) {
      if (wanted.has(k.toLowerCase())) return v;
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return undefined;
}
