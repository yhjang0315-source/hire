import Link from "next/link";
import { getDataset } from "@/data/cache";
import { resolveState, run, type SearchParams } from "@/lib/session";
import { careerPath } from "@/lib/engine";
import { ButtonLink, Card, Gauge, Title } from "@/components/ui";

export default async function PathPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await resolveState(searchParams);
  if (!resolved) {
    return (
      <Card>
        <p className="text-sm">입력 정보가 없어요.</p>
        <Link href="/" className="mt-2 block text-sm font-bold text-brand">
          처음으로
        </Link>
      </Card>
    );
  }
  const { state, query } = resolved;
  const rec = run(state);
  const stages = careerPath(state.profile, rec, getDataset());
  const target = rec.targets[0]?.name ?? "목표 직무";

  return (
    <>
      <Title sub={`목표 ${target}까지 · 역량 충족도는 직업정보 핵심 역량 기준 예상치`}>커리어 경로</Title>
      <ol className="relative ml-2 border-l-2 border-slate-200 pl-5">
        {stages.map((st, i) => (
          <li key={st.key + i} className="relative mb-3">
            <span className={`absolute -left-[29px] top-3 h-3.5 w-3.5 rounded-full ${st.key === "target" ? "bg-navy" : st.key === "now" ? "bg-slate-400" : "bg-teal"}`} />
            <div className="rounded-2xl bg-white p-3 shadow-[0_1px_0_#d9dfea]">
              <div className="text-[11px] font-bold text-teal">{st.when}</div>
              {st.posting ? (
                <Link href={`/card/${encodeURIComponent(st.posting.posting.id)}?${query}`} className="font-extrabold text-navy">
                  {st.title} →
                </Link>
              ) : (
                <b className="text-navy">{st.title}</b>
              )}
              <p className="text-xs text-slate-500">{st.note}</p>
              <Gauge now={st.coverage} label={st.key === "now" ? "지금" : "예상"} />
            </div>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <ButtonLink href={`/my?${query}`} variant="outline">
          마이페이지
        </ButtonLink>
        <ButtonLink href={`/result?${query}`} variant="outline">
          추천 목록
        </ButtonLink>
      </div>
    </>
  );
}
