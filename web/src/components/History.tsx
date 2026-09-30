"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { clearHistory, historyRaw, parseHistory, saveSnapshot, subscribeHistory, type Snapshot } from "@/lib/history";

/** 기록 목록. 서버 렌더링 중에는 null(저장소는 브라우저에만 있다) */
function useHistory(): Snapshot[] | null {
  const raw = useSyncExternalStore(subscribeHistory, historyRaw, () => null);
  return useMemo(() => (raw === null ? null : parseHistory(raw)), [raw]);
}

/** 결과 화면을 볼 때마다 기록을 남긴다 */
export function SaveSnapshot({ snap }: { snap: Omit<Snapshot, "at"> }) {
  useEffect(() => {
    saveSnapshot({ ...snap, at: new Date().toISOString() });
  }, [snap]);
  return null;
}

/** 입력 없이 마이페이지에 오면 가장 최근 기록으로 이동한다 */
export function OpenLatest() {
  const router = useRouter();
  const items = useHistory();
  const latest = items?.[0];
  useEffect(() => {
    if (latest) router.replace(`/my?s=${latest.s}`);
  }, [latest, router]);
  if (items === null || latest) return <p className="text-sm text-slate-400">기록을 불러오는 중…</p>;
  return (
    <p className="text-sm text-slate-500">
      아직 기록이 없어요. <Link href="/" className="font-bold text-brand">진단을 먼저 받아 주세요.</Link>
    </p>
  );
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** 재진단 기록 */
export function HistoryList() {
  const items = useHistory();
  if (items === null) return null;
  if (items.length === 0) return <p className="text-sm text-slate-500">아직 기록이 없어요.</p>;
  return (
    <div>
      <ol className="relative ml-1 border-l-2 border-slate-200 pl-4">
        {items.map((x) => (
          <li key={x.s} className="relative mb-2 text-sm">
            <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
            <Link href={`/result?s=${x.s}`} className="block rounded-xl bg-white px-3 py-2 shadow-[0_1px_0_#d9dfea]">
              <span className="text-[11px] text-slate-400">{fmt(x.at)} · 지원 {x.applications}건</span>
              <b className="block">{x.diagnosis}</b>
              {x.best && <span className="text-xs text-slate-500">1순위 {x.best}</span>}
            </Link>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={clearHistory}
        className="mt-1 text-xs text-slate-400 underline"
      >
        기록 지우기
      </button>
    </div>
  );
}
