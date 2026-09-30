import Link from "next/link";
import { buildTrainingPlan, resolveState, type SearchParams } from "@/lib/session";
import { Badge, ButtonLink, Card, Gauge, Section, Title } from "@/components/ui";

const weeks = (start: string, end: string) => Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / (7 * 86_400_000)));

export default async function TrainingPage({ searchParams }: { searchParams: SearchParams }) {
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
  const regionOnly = (await searchParams).region !== "all";
  const { rec, coverage, needs, courses } = buildTrainingPlan(resolved.state, regionOnly);
  const target = rec.targets[0]?.name ?? "목표 직무";
  const base = `/training?${resolved.query}`;

  return (
    <>
      <Title sub={`${resolved.state.profile.alias} · 목표 ${target}`}>훈련과정 추천</Title>

      <Card>
        <b className="text-sm">목표까지 부족한 역량</b>
        {coverage && <Gauge now={coverage.now} />}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {needs.tags.map((t) => (
            <Badge key={t} tone="orange">
              {t}
            </Badge>
          ))}
          {needs.items.map((i) => (
            <Badge key={i} tone="gray">
              {i}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">주황: 목표 공고의 우대 조건 중 없는 것 · 회색: 목표 직업 핵심 역량 중 부족한 것(직업정보)</p>
      </Card>

      <div className="mb-2 flex gap-2 text-xs font-bold">
        <Link href={base} className={`rounded-full px-3 py-1 ${regionOnly ? "bg-brand text-white" : "bg-blue-50 text-brand"}`}>
          {resolved.state.profile.region} 과정만
        </Link>
        <Link href={`${base}&region=all`} className={`rounded-full px-3 py-1 ${!regionOnly ? "bg-brand text-white" : "bg-blue-50 text-brand"}`}>
          전체 지역
        </Link>
      </div>

      <Section title={`추천 과정 ${courses.length}개`} desc="부족 역량을 많이 채우는 순 · 같으면 6개월 취업률 순">
        {courses.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">조건에 맞는 과정이 없어요. 전체 지역으로 넓혀 보세요.</p>
          </Card>
        )}
        {courses.map(({ course: t, hits }) => (
          <Card key={t.id}>
            <div className="flex items-start justify-between gap-2">
              <b className="text-sm">{t.title}</b>
              {t.employmentRate6 != null && <Badge tone="teal">취업률 {t.employmentRate6}%</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {t.institution} · {t.region} · {t.startDate.slice(5).replace("-", ".")} 시작 · {weeks(t.startDate, t.endDate)}주
            </p>
            <p className="mt-2 text-sm">
              채워주는 역량 · <b>{[...hits.tags, ...hits.items].join(", ") || "-"}</b>
            </p>
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>
                훈련비 {t.cost.toLocaleString()}원 → 자부담 <b className="text-slate-800">{t.realCost.toLocaleString()}원</b>
              </span>
              {t.satisfaction != null && <span>만족도 {t.satisfaction}점</span>}
            </div>
          </Card>
        ))}
      </Section>

      <div className="grid grid-cols-2 gap-2">
        <ButtonLink href={`/result?${resolved.query}`} variant="outline">
          추천 목록으로
        </ButtonLink>
        <ButtonLink href="https://www.work24.go.kr" variant="outline">
          고용24 훈련 찾기
        </ButtonLink>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">국민내일배움카드 훈련과정(시연은 모의데이터) · 자부담은 과정별로 달라요</p>
    </>
  );
}
