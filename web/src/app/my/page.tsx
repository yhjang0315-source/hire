import Link from "next/link";
import { buildMyPage, resolveState, type SearchParams } from "@/lib/session";
import { DIAGNOSIS_LABEL } from "@/lib/card/labels";
import type { ApplicationResult } from "@/lib/types";
import { Badge, ButtonLink, Card, Section, Title } from "@/components/ui";
import { HistoryList, OpenLatest } from "@/components/History";

const COLUMNS: { result: ApplicationResult; tone: "orange" | "teal" | "blue" | "gray" }[] = [
  { result: "대기", tone: "gray" },
  { result: "서류탈락", tone: "orange" },
  { result: "면접탈락", tone: "teal" },
  { result: "최종합격", tone: "blue" },
];

export default async function MyPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await resolveState(searchParams);
  if (!resolved) {
    return (
      <>
        <Title>마이페이지</Title>
        <Card>
          <OpenLatest />
        </Card>
      </>
    );
  }
  const { state, query } = resolved;
  const { rec, board, alerts } = buildMyPage(state, query);
  const label = DIAGNOSIS_LABEL[rec.diagnosis.type];

  return (
    <>
      <Title sub={`${state.profile.alias} · 목표 ${rec.targets.map((t) => t.name).join(", ")}`}>마이페이지</Title>

      <Card className="flex items-center justify-between">
        <div>
          <Badge tone={label.tone}>진단: {label.title}</Badge>
          {rec.best && (
            <p className="mt-1 text-sm">
              지금 지원 1순위 · <b>{rec.best.posting.company} {rec.best.posting.title}</b>
            </p>
          )}
        </div>
        <Link href={`/path?${query}`} className="shrink-0 text-xs font-bold text-brand">
          커리어 경로 →
        </Link>
      </Card>

      {alerts.length > 0 && (
        <Section title="알림">
          {alerts.map((a) => (
            <Link key={a.text} href={a.href ?? "#"} className="mb-1.5 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-[0_1px_0_#d9dfea]">
              <Badge tone={a.tone}>{a.tone === "orange" ? "마감" : a.tone === "blue" ? "추천" : a.tone === "teal" ? "결과" : "안내"}</Badge>
              <span className="min-w-0 flex-1">{a.text}</span>
            </Link>
          ))}
        </Section>
      )}

      <Section title={`지원 현황 ${board.length}건`}>
        <div className="grid grid-cols-2 gap-2">
          {COLUMNS.map((c) => {
            const list = board.filter((b) => b.result === c.result);
            return (
              <div key={c.result} className="rounded-2xl bg-white p-3 shadow-[0_1px_0_#d9dfea]">
                <div className="mb-1 flex items-center justify-between">
                  <Badge tone={c.tone}>{c.result}</Badge>
                  <b className="text-sm">{list.length}</b>
                </div>
                {list.map((b) => (
                  <p key={b.postingId} className="truncate text-xs text-slate-600">
                    {b.posting ? `${b.posting.company} · ${b.posting.title}` : b.postingId}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
        <div className="mt-2">
          <ButtonLink href={`/input?${query}`} variant="outline">
            결과 입력·지원 추가
          </ButtonLink>
        </div>
      </Section>

      <Section title="재진단 기록" desc="결과 화면을 볼 때마다 이 기기에 저장돼요">
        <HistoryList />
      </Section>
    </>
  );
}
