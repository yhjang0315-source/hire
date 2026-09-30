import Link from "next/link";
import { buildCounselor, type SearchParams } from "@/lib/session";
import { DIAGNOSIS_LABEL } from "@/lib/card/labels";
import { FOCUS_RULES } from "@/lib/counsel";
import { Badge, ButtonLink, Card, Section, Title } from "@/components/ui";

const FILTERS = { all: "전체", focus: "집중지원", request: "상담 요청" } as const;
type Filter = keyof typeof FILTERS;

/** 탈락 단계별 횟수: 한 단계뿐이면 "서류 5회", 섞이면 "서류 3·면접 2" */
const failText = ({ docFail, interviewFail }: { docFail: number; interviewFail: number }) =>
  docFail && interviewFail ? `서류 ${docFail}·면접 ${interviewFail}` : docFail ? `서류 ${docFail}회` : interviewFail ? `면접 ${interviewFail}회` : "-";

export default async function CounselorPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const f: Filter = (Object.keys(FILTERS) as Filter[]).find((k) => k === one(sp.f)) ?? "all";
  const view = buildCounselor();
  const list = view.summaries.filter((s) => (f === "focus" ? s.focus : f === "request" ? s.seeker.counselRequested : true));
  const sel = view.summaries.find((s) => s.seeker.id === one(sp.id)) ?? list[0] ?? null;
  const points = sel ? view.pointsOf(sel.seeker.id) : [];
  const href = (next: { f?: Filter; id?: string; booked?: boolean }) => {
    const q = new URLSearchParams();
    const nf = next.f ?? f;
    if (nf !== "all") q.set("f", nf);
    if (next.id) q.set("id", next.id);
    if (next.booked) q.set("booked", "1");
    const s = q.toString();
    return `/counselor${s ? `?${s}` : ""}`;
  };

  const kpis = [
    { label: "집중지원 필요", value: `${view.kpi.focus}명`, to: href({ f: "focus" }) },
    { label: "이번 주 재진단", value: `${view.kpi.recent}건`, to: href({ f: "all" }) },
    { label: "상담 요청", value: `${view.kpi.requested}건`, to: href({ f: "request" }) },
  ];

  return (
    <>
      <Title sub="○○고용센터 · 2026.11 · 반복 탈락자를 찾아 상담으로 연결해요">상담사 대시보드</Title>

      <div className="grid grid-cols-3 gap-2">
        {kpis.map((k) => (
          <Link key={k.label} href={k.to} className="rounded-2xl border border-slate-200 bg-white p-3">
            <span className="block text-[11px] text-slate-500">{k.label}</span>
            <b className="text-xl font-extrabold tabular-nums text-navy">{k.value}</b>
          </Link>
        ))}
      </div>

      <nav className="mt-3 flex gap-1.5" aria-label="구직자 거르기">
        {(Object.keys(FILTERS) as Filter[]).map((k) => (
          <Link
            key={k}
            href={href({ f: k })}
            aria-current={k === f ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${k === f ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-slate-600"}`}
          >
            {FILTERS[k]}
          </Link>
        ))}
      </nav>

      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-2 py-1.5 font-medium">구직자</th>
              <th className="px-1 font-medium">목표 직종</th>
              <th className="px-1 font-medium">진단 유형</th>
              <th className="px-1 font-medium">탈락</th>
              <th className="px-2 font-medium">상담</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const on = sel?.seeker.id === s.seeker.id;
              return (
                <tr key={s.seeker.id} className={`border-t border-slate-100 ${on ? "bg-blue-50" : ""}`}>
                  <td className="px-2 py-2">
                    <Link href={href({ id: s.seeker.id })} className="font-bold text-navy underline decoration-slate-300 underline-offset-2" aria-current={on ? "true" : undefined}>
                      {s.seeker.profile.alias.replace("구직자 ", "")}
                    </Link>
                    {s.focus && <span className="ml-1 rounded bg-orange-50 px-1 text-[10px] font-bold text-accent">집중</span>}
                  </td>
                  <td className="px-1">{s.targets[0] ?? "-"}</td>
                  <td className="px-1">{DIAGNOSIS_LABEL[s.rec.diagnosis.type].title}</td>
                  <td className="px-1 tabular-nums">{failText(s.rec.diagnosis.stats)}</td>
                  <td className="px-2">{s.seeker.counselRequested ? <b className="text-brand">요청</b> : <span className="text-slate-400">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        집중 = 서류·면접 탈락 합계 {FOCUS_RULES.minRejections}회 이상
      </p>

      {sel && (
        <Section title={`${sel.seeker.profile.alias} · 진단 요약`}>
          <Card>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={DIAGNOSIS_LABEL[sel.rec.diagnosis.type].tone}>{DIAGNOSIS_LABEL[sel.rec.diagnosis.type].title}</Badge>
              {sel.focus && <Badge tone="orange">집중지원</Badge>}
              {sel.seeker.counselRequested && <Badge tone="blue">상담 요청</Badge>}
            </div>
            <p className="mt-2 text-sm">{sel.evidence}</p>
            <p className="mt-1 text-xs text-slate-500">
              {sel.targets.join("·")} 목표 · {sel.seeker.profile.region} · 마지막 진단 {sel.seeker.lastDiagnosedAt}
              {sel.rec.best && ` · 지금 지원 1순위 ${sel.rec.best.posting.company} ${sel.rec.best.posting.title}`}
            </p>

            <h3 className="mt-3 text-sm font-extrabold text-navy">AI 상담 포인트</h3>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
              {points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-slate-400">진단 결과로 만든 초안이에요. 생성형 AI 연결 시 상담 기록을 반영해 다듬어요.</p>

            {one(sp.booked) && one(sp.id) === sel.seeker.id && (
              <p role="status" className="mt-3 rounded-xl bg-teal-50 px-3 py-2 text-sm font-bold text-teal">
                상담 일정 요청을 보냈어요(시연 — 실제로 전송되지 않아요)
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ButtonLink href={href({ id: sel.seeker.id, booked: true })}>상담 일정 잡기</ButtonLink>
              <ButtonLink href={`/result?${view.queryOf(sel.seeker.id)}`} variant="outline">
                구직자 화면 보기
              </ButtonLink>
            </div>
          </Card>
        </Section>
      )}
      <p className="mt-3 text-center text-[11px] text-slate-400">※ 모의데이터 화면(가명) · 상담 요청·재진단 일자는 가상</p>
    </>
  );
}
