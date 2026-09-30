// 시연 전 점검: 모든 화면 × 페르소나·공고·구직자 조합을 실행 중인 서버에 요청해
// 응답 코드와 "찾지 못했어요" 같은 빈 화면 문구가 없는지 확인한다.
//
//   npm run build && npm start          # 다른 터미널
//   npm run smoke                       # 기본 http://localhost:3000
//   BASE=http://localhost:3100 npm run smoke
import { DEMO_TODAY, getMockDataset, getPersonas, getSeekers } from "@/data";
import { recommend } from "@/lib/engine";
import { encodeState } from "@/lib/state";

const BASE = process.env.BASE ?? "http://localhost:3000";
// 페이지가 대상을 못 찾았을 때만 나오는 문구(화면 안의 정상 안내 문구와 구분)
const EMPTY = /(공고를|입력 정보를|추천 정보를) 찾지 못했어요|입력 정보가 없어요|Application error|Internal Server Error/;

const data = getMockDataset();
const urls = new Set<string>(["/", "/input", "/counselor", "/counselor?f=focus", "/counselor?f=request"]);

for (const s of getSeekers()) {
  const persona = getPersonas().some((p) => p.profile.id === s.id);
  const q = persona ? `persona=${s.id}` : `s=${encodeState({ profile: s.profile, applications: s.applications })}`;
  urls.add(`/counselor?id=${s.id}`);
  for (const page of ["result", "path", "training", "my", "map", "compare"]) urls.add(`/${page}?${q}`);
  const rec = recommend(s.profile, s.applications, data, DEMO_TODAY);
  const scored = [...Object.values(rec.tiers).flat(), ...rec.redirect].map((sp) => sp.posting.id);
  for (const id of new Set(scored)) for (const page of ["card", "coach", "interview", "posting"]) urls.add(`/${page}/${id}?${q}`);
  for (const a of s.applications) for (const page of ["coach", "interview", "posting"]) urls.add(`/${page}/${a.postingId}?${q}`);
}

async function main() {
  const failed: string[] = [];
  const list = [...urls];
  for (let i = 0; i < list.length; i += 8) {
    await Promise.all(
      list.slice(i, i + 8).map(async (u) => {
        try {
          const res = await fetch(BASE + u);
          const html = await res.text();
          const hit = html.match(EMPTY)?.[0];
          if (!res.ok || hit) failed.push(`${res.status} ${hit ?? ""} ${u.slice(0, 120)}`);
        } catch (e) {
          failed.push(`ERR ${(e as Error).message} ${u.slice(0, 120)}`);
        }
      }),
    );
  }
  console.log(`화면 ${list.length}개 확인 · 실패 ${failed.length}개`);
  for (const f of failed) console.log("  ✗ " + f);
  process.exit(failed.length ? 1 : 0);
}

main();
