import Link from "next/link";
import { buildDocCoaching, resolveState, type SearchParams } from "@/lib/session";
import { ButtonLink, Card, Section } from "@/components/ui";

export default async function DocCoachPage({
  params,
  searchParams,
}: {
  params: Promise<{ postingId: string }>;
  searchParams: SearchParams;
}) {
  const { postingId } = await params;
  const resolved = await resolveState(searchParams);
  const view = resolved ? await buildDocCoaching(resolved.state, decodeURIComponent(postingId)) : null;
  if (!resolved || !view) {
    return (
      <Card>
        <p className="text-sm">코칭할 공고를 찾지 못했어요.</p>
        <Link href="/" className="mt-2 block text-sm font-bold text-brand">
          처음으로
        </Link>
      </Card>
    );
  }
  const { posting, coaching, fitScore } = view;
  const back = `/card/${encodeURIComponent(posting.id)}?${resolved.query}`;

  return (
    <>
      <div className="mb-3">
        <div className="text-xs text-slate-500">S7 서류 코칭 · 요건 충족도 {fitScore}%</div>
        <h1 className="text-xl font-extrabold text-navy">
          {posting.company} · {posting.title}
        </h1>
      </div>

      <Card className="bg-teal-50">
        <p className="text-sm leading-relaxed">{coaching.summary}</p>
      </Card>

      <Section title="공고가 찾는 사람" desc={posting.duties}>
        <Card>
          <ul className="space-y-1 text-sm">
            {coaching.requirements.map((r) => (
              <li key={r.label} className="flex justify-between">
                <span>{r.label}</span>
                <b className={r.passed ? "text-teal" : "text-accent"}>{r.passed ? "충족" : "미충족"}</b>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      {coaching.rewrites.length > 0 && (
        <Section title="내 경험을 공고의 언어로" desc="이미 갖춘 역량이에요. 서류에 이렇게 써 보세요">
          {coaching.rewrites.map((r) => (
            <Card key={r.keyword}>
              <div className="flex items-center justify-between">
                <b className="text-sm">공고 표현 · {r.keyword}</b>
                <span className={`text-[11px] font-bold ${r.expressed ? "text-teal" : "text-accent"}`}>
                  {r.expressed ? "서류에 드러남" : "서류에 안 보여요"}
                </span>
              </div>
              {r.evidence && <p className="mt-1 text-xs text-slate-500">내 경험 · “{r.evidence}”</p>}
              <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-sm leading-relaxed">{r.sentence}</p>
            </Card>
          ))}
        </Section>
      )}

      {coaching.gaps.length > 0 && (
        <Section title="보완할 우대 조건" desc="지금 없는 조건은 이렇게 채워요">
          <Card>
            <ul className="space-y-2 text-sm">
              {coaching.gaps.map((g) => (
                <li key={g.keyword}>
                  <b>{g.keyword}</b>
                  <span className="block text-slate-600">{g.how}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      <Section title="제출 전 체크리스트">
        <Card>
          <ul className="space-y-1 text-sm">
            {coaching.checklist.map((c) => (
              <li key={c}>☐ {c}</li>
            ))}
          </ul>
        </Card>
      </Section>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <ButtonLink href={back} variant="outline">
          추천 카드로
        </ButtonLink>
        <ButtonLink href={`/input?${resolved.query}`}>결과 입력</ButtonLink>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">시연: 규칙 기반 문장 · 실서비스는 생성형 AI가 이력서 전체를 첨삭</p>
    </>
  );
}
