import Link from "next/link";
import { buildPostingDetail, resolveState, type SearchParams } from "@/lib/session";
import { TIER_LABEL } from "@/lib/card/labels";
import { Badge, ButtonLink, Card, Meter, Section } from "@/components/ui";
import DemandChart from "@/components/DemandChart";

export default async function PostingPage({
  params,
  searchParams,
}: {
  params: Promise<{ postingId: string }>;
  searchParams: SearchParams;
}) {
  const { postingId } = await params;
  const resolved = await resolveState(searchParams);
  const view = resolved ? buildPostingDetail(resolved.state, decodeURIComponent(postingId)) : null;
  if (!resolved || !view) {
    return (
      <Card>
        <p className="text-sm">공고를 찾지 못했어요.</p>
        <Link href="/" className="mt-2 block text-sm font-bold text-brand">
          처음으로
        </Link>
      </Card>
    );
  }
  const { posting: p, occupation, fit, scored, demand } = view;
  const q = resolved.query;
  const id = encodeURIComponent(p.id);
  const salary = p.salaryMin ? `${p.salaryMin.toLocaleString()}~${p.salaryMax?.toLocaleString()}만원` : "회사 내규";

  return (
    <>
      <div className="mb-3">
        <div className="text-xs text-slate-500">
          S6 공고·기업 상세{scored?.tier ? ` · ${TIER_LABEL[scored.tier].title}` : ""}
          {scored ? ` · 마감 D-${scored.daysLeft}` : ""}
        </div>
        <h1 className="text-xl font-extrabold text-navy">
          {p.company} · {p.title}
        </h1>
      </div>

      <Card>
        <dl className="grid grid-cols-[5rem_1fr] gap-y-1 text-sm">
          <dt className="text-slate-500">기업</dt>
          <dd>
            {p.company} · {p.industry ?? "업종 정보 없음"}
            {p.companySize && <span className="block text-xs text-slate-500">{p.companySize}</span>}
          </dd>
          <dt className="text-slate-500">직종</dt>
          <dd>{occupation?.name ?? p.occupationCode}</dd>
          <dt className="text-slate-500">근무 조건</dt>
          <dd>
            {p.region} · {p.employmentType} · {salary}
          </dd>
          <dt className="text-slate-500">자격 요건</dt>
          <dd>
            경력 {p.career}
            {p.minCareerYears ? ` ${p.minCareerYears}년 이상` : ""} · {p.education}
            {p.majors?.length ? ` · ${p.majors.join("·")} 전공` : ""}
            {p.requiredCertificates?.length ? ` · ${p.requiredCertificates.join(", ")}` : ""}
          </dd>
          <dt className="text-slate-500">마감</dt>
          <dd>{p.closeDate}</dd>
        </dl>
      </Card>

      <Section title="하는 일과 우대 조건" desc={p.duties}>
        <Card>
          <div className="flex flex-wrap gap-1.5">
            {p.preferred.map((t) => (
              <Badge key={t} tone={fit.matched.includes(t) ? "teal" : "gray"}>
                {fit.matched.includes(t) ? "✓ " : ""}
                {t}
              </Badge>
            ))}
          </div>
          {p.talent.length > 0 && <p className="mt-2 text-xs text-slate-500">인재상 · {p.talent.join(", ")}</p>}
          <p className="mt-1 text-[11px] text-slate-400">✓ 표시는 내가 갖춘 우대 조건이에요</p>
        </Card>
      </Section>

      <Section title="나와 이 공고">
        <div className="grid grid-cols-3 gap-2">
          <Meter label="현재 적합도" value={fit.score} />
          {scored && <Meter label="목표 기여도" value={scored.contribution} />}
          {scored && <Meter label="성향 궁합" value={scored.traitFit} />}
        </div>
        <ul className="mt-2 space-y-0.5 text-xs">
          {fit.checks.map((c) => (
            <li key={c.label} className="flex justify-between">
              <span>{c.label}</span>
              <b className={c.passed ? "text-teal" : "text-accent"}>{c.passed ? "충족" : "미충족"}</b>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="직종별 채용 수요(구인배수)" desc="같은 지역에서 직종마다 일자리가 얼마나 있는지 비교해요">
        <Card>{demand.rows.length ? <DemandChart rows={demand.rows} month={demand.month} region={p.region} /> : <p className="text-sm text-slate-500">통계가 없어요.</p>}</Card>
      </Section>

      <div className="grid grid-cols-2 gap-2">
        {scored && (
          <ButtonLink href={`/card/${id}?${q}`} variant="outline">
            추천 이유 보기
          </ButtonLink>
        )}
        <ButtonLink href={`/coach/${id}?${q}`} variant="outline">
          서류 코칭
        </ButtonLink>
        <ButtonLink href={`/interview/${id}?${q}`} variant="outline">
          AI 모의면접
        </ButtonLink>
        <ButtonLink href={`/result?${q}`} variant="outline">
          추천 목록
        </ButtonLink>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">공고 번호 {p.id} · 구인배수는 고용행정통계(시연은 모의데이터)</p>
    </>
  );
}
