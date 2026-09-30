import Link from "next/link";
import { buildCard, resolveState, type SearchParams } from "@/lib/session";
import { TIER_LABEL } from "@/lib/card/labels";
import { Badge, ButtonLink, Card, Gauge } from "@/components/ui";

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ postingId: string }>;
  searchParams: SearchParams;
}) {
  const { postingId } = await params;
  const resolved = await resolveState(searchParams);
  const view = resolved ? await buildCard(resolved.state, decodeURIComponent(postingId)) : null;
  if (!resolved || !view) {
    return (
      <Card>
        <p className="text-sm">추천 정보를 찾지 못했어요.</p>
        <Link href="/" className="mt-2 block text-sm font-bold text-brand">
          처음으로
        </Link>
      </Card>
    );
  }
  const { rec, sp, card, coverage, trainings } = view;
  const isBest = rec.best?.posting.id === sp.posting.id;
  const showGauge = coverage && rec.tracks.includes("ladder") && sp.tier !== "target";

  return (
    <>
      <div className="mb-3">
        <div className="text-xs text-slate-500">
          {sp.tier ? TIER_LABEL[sp.tier].title : "추천"}
          {isBest && " · 지금 지원 1순위"}
        </div>
        <h1 className="text-xl font-extrabold text-navy">
          {sp.posting.company} · {sp.posting.title}
        </h1>
        <div className="text-xs text-slate-500">
          {sp.posting.region} · 경력 {sp.posting.career} · {sp.posting.salaryMin?.toLocaleString()}~{sp.posting.salaryMax?.toLocaleString()}만원 · 마감 D-{sp.daysLeft}
        </div>
        <Link href={`/posting/${encodeURIComponent(sp.posting.id)}?${resolved.query}`} className="text-xs font-bold text-brand">
          공고·기업 상세 →
        </Link>
      </div>

      <h2 className="mb-1 text-sm font-extrabold text-navy">A. 한마디</h2>
      <Card className="bg-orange-50">
        <p className="text-[15px] leading-relaxed">{card.headline}</p>
      </Card>

      <h2 className="mb-1 text-sm font-extrabold text-navy">B. 왜 이렇게 판단했나요?</h2>
      <Card>
        <ol className="space-y-2">
          {card.reasons.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span>
                {r.text} <span className="text-[11px] font-bold text-brand">{r.source}</span>
              </span>
            </li>
          ))}
        </ol>
        {showGauge && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-bold">목표 역량 충족도 · {rec.targets[0]?.name}</div>
            <Gauge now={coverage.now} after={coverage.afterYear} />
          </div>
        )}
      </Card>

      <h2 className="mb-1 text-sm font-extrabold text-navy">C. 이후 계획</h2>
      <Card>
        <ol className="relative ml-1 border-l-2 border-slate-200 pl-4">
          {card.plan.map((p, i) => (
            <li key={i} className="relative mb-2 text-sm leading-snug last:mb-0">
              <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-teal" />
              <b className="text-teal">{p.when}</b> {p.what}
            </li>
          ))}
        </ol>
        {card.planB && <p className="mt-2 text-xs text-slate-500">플랜 B · {card.planB}</p>}
      </Card>

      {trainings.length > 0 && rec.tracks.includes("ladder") && (
        <>
          <h2 className="mb-1 text-sm font-extrabold text-navy">부족 역량을 채울 훈련과정</h2>
          <Card>
            {trainings.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
                <span>
                  {t.title}
                  <span className="block text-[11px] text-slate-400">
                    {t.institution} · {t.region} · 자부담 {t.realCost.toLocaleString()}원
                  </span>
                </span>
                {t.employmentRate6 != null && <Badge tone="teal">취업률 {t.employmentRate6}%</Badge>}
              </div>
            ))}
            <Link href={`/training?${resolved.query}`} className="mt-2 block text-right text-xs font-bold text-brand">
              훈련과정 전체 보기 →
            </Link>
          </Card>
        </>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <ButtonLink href={`/coach/${encodeURIComponent(sp.posting.id)}?${resolved.query}`} variant="outline">
          서류 코칭
        </ButtonLink>
        <ButtonLink href={`/interview/${encodeURIComponent(sp.posting.id)}?${resolved.query}`} variant="outline">
          AI 모의면접
        </ButtonLink>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <ButtonLink href={`/result?${resolved.query}`} variant="outline">
          추천 목록으로
        </ButtonLink>
        <ButtonLink href={`/input?${resolved.query}`}>결과 입력</ButtonLink>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">공고 번호 {sp.posting.id} · 실서비스에서는 고용24 공고로 바로 이동</p>
    </>
  );
}
