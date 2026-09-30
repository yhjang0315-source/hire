"use client";

// 직종별 구인배수 — 강조형 가로 막대(이 공고 직종만 강조색, 나머지 회색)
// 모든 막대에 값을 붙이고(축 눈금 대신), 기준선 1.0, 막대별 툴팁, 표 보기를 함께 둔다.
import { useState } from "react";
import type { DemandRow } from "@/lib/engine/demand";

const ACCENT = "#2f6fdb"; // 흰 카드 대비 3:1 이상(검증)
const MUTED = "#aab4c3"; // 강조 대비용 회색 — 값 라벨·표로 보완
const BAR = 14; // 막대 두께(px)

export default function DemandChart({ rows, month, region }: { rows: DemandRow[]; month: string; region: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.ratio)) * 1.15;
  const pct = (v: number) => `${(v / max) * 100}%`;

  return (
    <figure>
      <figcaption className="mb-2 text-xs text-slate-500">
        {region} · {month.replace("-", ".")} · 구인배수 = 신규구인인원 ÷ 신규구직건수
      </figcaption>
      <div className="relative">
        {/* 기준선 1.0 */}
        <div className="pointer-events-none absolute inset-y-0 z-0" style={{ left: `calc(7.5rem + (100% - 7.5rem - 2.5rem) * ${1 / max})` }}>
          <div className="h-full w-px bg-slate-300" />
        </div>
        <ul className="relative z-10 space-y-2.5">
          {rows.map((r, i) => (
            <li
              key={r.middleClass}
              tabIndex={0}
              aria-label={`${r.name} 구인배수 ${r.ratio}, 신규구인 ${r.openings.toLocaleString()}명, 신규구직 ${r.seekers.toLocaleString()}건`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="relative flex items-center py-1 outline-none"
            >
              <span className="w-[7.5rem] shrink-0 pr-2 text-xs leading-tight text-slate-700">
                {r.name}
                {(r.isPosting || r.isTarget) && (
                  <span className="block text-[10px] font-bold text-slate-500">
                    {[r.isPosting && "이 공고", r.isTarget && "목표"].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <span className="relative flex-1">
                <span
                  className="block rounded-r-[4px] transition-opacity"
                  style={{
                    width: pct(r.ratio),
                    height: BAR,
                    background: r.isPosting ? ACCENT : MUTED,
                    opacity: hover === null || hover === i ? 1 : 0.55,
                  }}
                />
              </span>
              <b className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-800">{r.ratio.toFixed(2)}</b>
              {hover === i && (
                <span role="tooltip" className="absolute right-10 top-full z-20 mt-0.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow">
                  <b className="block text-sm">{r.ratio.toFixed(2)}</b>
                  {r.name} · 구인 {r.openings.toLocaleString()}명 / 구직 {r.seekers.toLocaleString()}건
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">세로선 = 1.0(구직자 1명당 일자리 1개). 오른쪽으로 길수록 채용이 활발해요.</p>
      <details className="mt-1 text-xs">
        <summary className="cursor-pointer text-slate-500">표로 보기</summary>
        <table className="mt-1 w-full text-left tabular-nums">
          <thead className="text-slate-500">
            <tr>
              <th className="py-0.5 font-medium">직종</th>
              <th className="font-medium">신규구인</th>
              <th className="font-medium">신규구직</th>
              <th className="font-medium">구인배수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.middleClass} className="border-t border-slate-100">
                <td className="py-0.5">{r.name}</td>
                <td>{r.openings.toLocaleString()}</td>
                <td>{r.seekers.toLocaleString()}</td>
                <td>{r.ratio.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
