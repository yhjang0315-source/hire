import Link from "next/link";
import type { ReactNode } from "react";
import { buildCompare, resolveState, type SearchParams } from "@/lib/session";
import { compareHighlights, COMPARE_MAX, type OccupationCompare } from "@/lib/engine";
import { josa } from "@/lib/korean";
import { ButtonLink, Card, Section, Title } from "@/components/ui";

const Best = () => <span className="ml-0.5 inline-block whitespace-nowrap text-[10px] font-bold text-brand">▲최고</span>;

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const resolved = await resolveState(searchParams);
  if (!resolved) {
    return (
      <Card>
        <p className="text-sm">입력 정보를 찾지 못했어요.</p>
        <Link href="/" className="mt-2 block text-sm font-bold text-brand">
          처음으로
        </Link>
      </Card>
    );
  }
  const picked = ([] as string[]).concat(sp.c ?? []).flatMap((v) => v.split(","));
  const { rows, selected, all } = buildCompare(resolved.state, picked);
  const q = resolved.query;
  const hidden = [...new URLSearchParams(q)];
  const hi = compareHighlights(rows);
  const many = rows.length > 1;
  const name = (code: string | null) => rows.find((r) => r.occupation.code === code)?.occupation.name ?? "";
  const demandOf = (code: string) => rows.find((r) => r.occupation.code === code)?.demandRatio?.toFixed(2);
  const mark = (key: keyof typeof hi, r: OccupationCompare) => (many && hi[key] === r.occupation.code ? <Best /> : null);

  const lines: { label: string; cell: (r: OccupationCompare) => ReactNode }[] = [
    {
      label: "역량 충족도",
      cell: (r) => (
        <>
          <b className="tabular-nums">{r.coverage.now}%</b>
          {mark("coverage", r)}
          <span className="mt-1 block h-1.5 rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${r.coverage.now}%` }} />
          </span>
        </>
      ),
    },
    {
      label: "부족한 핵심 역량",
      cell: (r) =>
        r.coverage.missing.length
          ? r.coverage.missing.slice(0, 3).join(", ") + (r.coverage.missing.length > 3 ? ` 외 ${r.coverage.missing.length - 3}개` : "")
          : "없음",
    },
    {
      label: "필요 자격증",
      cell: (r) =>
        r.certificates.map((c) => (
          <span key={c.name} className={`block ${c.have ? "text-teal" : "text-slate-500"}`}>
            {c.have && "✓ "}
            {c.name}
          </span>
        )),
    },
    {
      label: `${resolved.state.profile.region} 공고`,
      cell: (r) => (
        <>
          <b className="tabular-nums">{r.openings}건</b>
          <span className="block text-slate-500">
            신입 가능 {r.entryOpenings}
            {mark("entry", r)}
          </span>
        </>
      ),
    },
    {
      label: "가장 잘 맞는 공고",
      cell: (r) =>
        r.best ? (
          <Link href={`/posting/${encodeURIComponent(r.best.posting.id)}?${q}`} className="block">
            <span className="block text-slate-700 underline decoration-slate-300 underline-offset-2">{r.best.posting.company}</span>
            <b className="tabular-nums">적합도 {r.best.fit}%</b>
            {mark("fit", r)}
          </Link>
        ) : (
          <span className="text-slate-500">모집 중 공고 없음</span>
        ),
    },
    {
      label: "구인배수",
      cell: (r) =>
        r.demandRatio === null ? (
          <span className="text-slate-500">통계 없음</span>
        ) : (
          <>
            <b className="tabular-nums">{r.demandRatio.toFixed(2)}</b>
            {mark("demand", r)}
            <span className="block text-slate-500">{r.demandRatio >= 1 ? "일자리가 더 많음" : "구직자가 더 많음"}</span>
          </>
        ),
    },
    {
      label: "성향 궁합",
      cell: (r) =>
        r.traitFit === null ? (
          <span className="text-slate-500">-</span>
        ) : (
          <>
            <b className="tabular-nums">{r.traitFit}%</b>
            {mark("traitFit", r)}
          </>
        ),
    },
  ];

  const target = rows.find((r) => r.isTarget);
  const summary = many
    ? [
        hi.fit && `지금 지원하기 가장 수월한 직종은 ${josa(name(hi.fit), "이라")}고 볼 수 있어요.`,
        hi.demand &&
          (hi.demand === hi.fit
            ? `채용 수요(구인배수 ${demandOf(hi.demand)})도 가장 높아요.`
            : `채용 수요는 ${josa(name(hi.demand), "이가")} 가장 높아요(구인배수 ${demandOf(hi.demand)}).`),
        target && `목표인 ${name(target.occupation.code)}까지는 핵심 역량의 ${target.coverage.now}%를 갖췄어요.`,
      ].filter((s): s is string => !!s)
    : [];

  return (
    <>
      <Title sub={`직종을 최대 ${COMPARE_MAX}개 골라 같은 기준으로 나란히 봐요`}>목표 직종 비교</Title>

      <form method="get" className="mb-3">
        {hidden.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">비교할 직종</legend>
          {all.map((o) => (
            <label
              key={o.code}
              className="cursor-pointer rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 has-checked:border-brand has-checked:bg-blue-50 has-checked:text-brand has-focus-visible:outline-2 has-focus-visible:outline-brand"
            >
              <input type="checkbox" name="c" value={o.code} defaultChecked={selected.includes(o.code)} className="sr-only" />
              {o.name}
            </label>
          ))}
        </fieldset>
        <button type="submit" className="mt-2 w-full rounded-xl bg-brand py-2 text-sm font-bold text-white">
          비교하기
        </button>
        <p className="mt-1 text-[11px] text-slate-500">
          {COMPARE_MAX + 1}개 이상 고르면 앞의 {COMPARE_MAX}개만 비교해요.
        </p>
      </form>

      {summary.length > 0 && (
        <Card>
          <ul className="space-y-1 text-sm">
            {summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      )}

      <Section title="나란히 보기" desc="▲최고는 고른 직종 가운데 가장 나은 값, ✓는 가진 자격증이에요">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[4.5rem]" />
              {rows.map((r) => (
                <col key={r.occupation.code} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 align-bottom">
                <th className="p-2 font-medium text-slate-500">직종</th>
                {rows.map((r) => (
                  <th key={r.occupation.code} scope="col" className="p-2 text-sm font-extrabold text-navy">
                    {r.isTarget && <span className="block text-[10px] font-bold text-accent">★ 목표</span>}
                    {r.occupation.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.label} className="border-b border-slate-100 align-top last:border-0">
                  <th scope="row" className="p-2 font-medium text-slate-500">
                    {l.label}
                  </th>
                  {rows.map((r) => (
                    <td key={r.occupation.code} className="break-words p-2">
                      {l.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-2">
        <ButtonLink href={`/result?${q}`} variant="outline">
          추천 목록
        </ButtonLink>
        <ButtonLink href={`/training?${q}`} variant="outline">
          훈련과정
        </ButtonLink>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">역량 충족도는 직업정보 핵심 항목 기준 · 구인배수는 고용행정통계(시연은 모의데이터)</p>
    </>
  );
}
