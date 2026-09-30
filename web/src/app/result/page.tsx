import Link from "next/link";
import { resolveState, run, type SearchParams } from "@/lib/session";
import { BARRIER_LABEL, DIAGNOSIS_LABEL, TIER_LABEL, TIER_ORDER } from "@/lib/card/labels";
import { TRAIT_LABELS } from "@/lib/engine";
import { joinItems } from "@/lib/korean";
import { Badge, ButtonLink, Card, Meter, Section, Title } from "@/components/ui";
import PostingRow from "@/components/PostingRow";
import { SaveSnapshot } from "@/components/History";
import { encodeState } from "@/lib/state";

const TIER_TONE = { target: "border-navy", stepping: "border-brand", growing: "border-brand", immediate: "border-slate-400" };

export default async function ResultPage({ searchParams }: { searchParams: SearchParams }) {
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
  const d = rec.diagnosis;
  const label = DIAGNOSIS_LABEL[d.type];
  const cardHref = (id: string) => `/card/${encodeURIComponent(id)}?${query}`;

  const evidence =
    d.type === "자격격차형" && d.barriers[0]
      ? `지원한 ${d.stats.total}곳 중 ${d.barriers[0].count}곳이 '${BARRIER_LABEL[d.barriers[0].key]}' 요구`
      : d.type === "조직적합형" && d.talentPattern.length
        ? `면접 탈락 공고의 공통 인재상: ${joinItems(d.talentPattern)}${
            d.traitGaps[0] ? ` · 내 성향은 ${TRAIT_LABELS[d.traitGaps[0].axis][d.traitGaps[0].user > 0 ? 1 : 0]} 쪽` : ""
          }`
        : d.type === "서류표현형"
          ? `요건 충족도 평균 ${d.stats.avgFit}% · 서류 탈락 ${d.stats.docFail}/${d.stats.decided}`
          : `지원 ${d.stats.total}건 · 요건 충족도 평균 ${d.stats.avgFit}%`;

  return (
    <>
      <SaveSnapshot
        snap={{
          s: encodeState(state),
          alias: state.profile.alias,
          diagnosis: label.title,
          best: rec.best ? `${rec.best.posting.company} · ${rec.best.posting.title}` : undefined,
          applications: state.applications.length,
        }}
      />
      <Title sub={`${state.profile.alias} · 목표 ${rec.targets.map((t) => t.name).join(", ")}`}>진단과 추천 결과</Title>

      <Card className="bg-orange-50">
        <div className="flex items-center gap-2">
          <Badge tone={label.tone}>진단: {label.title}</Badge>
        </div>
        <p className="mt-1.5 text-sm">{evidence}</p>
        <p className="mt-1 text-xs text-slate-500">{label.desc}</p>
      </Card>

      {rec.best && (
        <Link href={cardHref(rec.best.posting.id)} className="block">
          <div className="mb-4 rounded-2xl bg-navy p-4 text-white">
            <div className="text-xs font-bold opacity-85">★ 지금 지원 1순위{rec.best.tier ? ` · ${TIER_LABEL[rec.best.tier].short}` : ""}</div>
            <h3 className="mt-0.5 text-lg font-extrabold">
              {rec.best.posting.company} · {rec.best.posting.title}
            </h3>
            <div className="text-xs opacity-90">
              {rec.best.posting.region} · 경력 {rec.best.posting.career} · 마감 D-{rec.best.daysLeft}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Meter dark label="현재 적합도" value={rec.best.fit.score} />
              {d.type === "조직적합형" ? (
                <Meter dark label="성향 궁합" value={rec.best.traitFit} />
              ) : (
                <Meter dark label="목표 기여도" value={rec.best.contribution} />
              )}
            </div>
            <div className="mt-2 text-right text-xs font-bold">추천 이유 보기 →</div>
          </div>
        </Link>
      )}

      {rec.tracks.includes("ladder") &&
        TIER_ORDER.map((tier) =>
          rec.tiers[tier].length ? (
            <Section key={tier} title={TIER_LABEL[tier].title} desc={TIER_LABEL[tier].desc}>
              {rec.tiers[tier].map((sp) => (
                <PostingRow
                  key={sp.posting.id}
                  sp={sp}
                  href={cardHref(sp.posting.id)}
                  best={sp.posting.id === rec.best?.posting.id}
                  metric={tier === "target" || tier === "immediate" ? `적합도 ${sp.fit.score}%` : tier === "stepping" ? `경력 인정 ${sp.recognition}` : `기여도 ${sp.contribution}%`}
                  tone={TIER_TONE[tier]}
                />
              ))}
            </Section>
          ) : null,
        )}

      {rec.tracks.includes("redirect") && (
        <Section
          title="다시 도전할 공고"
          desc={d.type === "조직적합형" ? "같은 직무에서 내 성향과 잘 맞는 인재상을 가진 회사 순이에요" : "같은 수준의 공고예요. 서류를 다듬어 다시 도전해요"}
        >
          {rec.redirect.map((sp) => (
            <PostingRow
              key={sp.posting.id}
              sp={sp}
              href={cardHref(sp.posting.id)}
              best={sp.posting.id === rec.best?.posting.id}
              metric={d.type === "조직적합형" ? `궁합 ${sp.traitFit}점` : `적합도 ${sp.fit.score}%`}
              tone="border-teal"
            />
          ))}
          {d.type === "조직적합형" ? (
            rec.redirect[0] && (
              <div className="mt-2">
                <ButtonLink href={`/interview/${encodeURIComponent(rec.redirect[0].posting.id)}?${query}`}>
                  {rec.redirect[0].posting.company} 공고로 AI 모의면접
                </ButtonLink>
              </div>
            )
          ) : (
            rec.redirect[0] && (
              <div className="mt-2">
                <ButtonLink href={`/coach/${encodeURIComponent(rec.redirect[0].posting.id)}?${query}`}>
                  {rec.redirect[0].posting.company} 공고로 서류 코칭 받기
                </ButtonLink>
              </div>
            )
          )}
        </Section>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ButtonLink href={`/path?${query}`} variant="outline">
          커리어 경로
        </ButtonLink>
        <ButtonLink href={`/map?${query}`} variant="outline">
          지도로 보기
        </ButtonLink>
        <ButtonLink href={`/compare?${query}`} variant="outline">
          직종 비교
        </ButtonLink>
        <ButtonLink href={`/training?${query}`} variant="outline">
          훈련과정
        </ButtonLink>
        <ButtonLink href={`/my?${query}`} variant="outline">
          마이페이지
        </ButtonLink>
        <ButtonLink href={`/input?${query}`} variant="outline">
          결과 입력·수정
        </ButtonLink>
      </div>
      <div className="mt-2">
        <ButtonLink href="/" variant="outline">
          처음으로
        </ButtonLink>
      </div>
    </>
  );
}
