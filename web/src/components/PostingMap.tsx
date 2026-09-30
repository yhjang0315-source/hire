"use client";

// 공고 지도 보기(P2) — 추천 공고를 근무지에 마커로 표시한다.
// 마커 색 = 사다리 단계(검증한 범주 팔레트), 글자 기호를 함께 둬 색만으로 구분하지 않는다.
// 지도 타일을 못 불러와도 아래 목록에서 같은 정보를 볼 수 있다.
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import { GROUP_ORDER, type MapGroup, type MapMarker } from "@/lib/map";

export const GROUP_STYLE: Record<MapGroup, { label: string; glyph: string; color: string }> = {
  target: { label: "목표 공고", glyph: "★", color: "#2a78d6" },
  stepping: { label: "경력 발판", glyph: "2", color: "#eb6834" },
  growing: { label: "역량 키우기", glyph: "3", color: "#1baf7a" },
  immediate: { label: "즉시 적합", glyph: "1", color: "#eda100" },
  redirect: { label: "다시 도전", glyph: "재", color: "#e87ba4" },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function PostingMap({ markers, query }: { markers: MapMarker[]; query: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const byId = useRef(new Map<string, Marker>());
  const groups = GROUP_ORDER.filter((g) => markers.some((m) => m.group === g));
  const [shown, setShown] = useState<MapGroup[]>(groups);
  const visible = useMemo(() => markers.filter((m) => shown.includes(m.group)), [markers, shown]);
  const placed = useMemo(() => visible.filter((m) => m.lat !== undefined && m.lng !== undefined), [visible]);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      if (!map.current) {
        map.current = L.map(el.current, { zoomControl: true, attributionControl: true });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: "© OpenStreetMap",
        }).addTo(map.current);
        layer.current = L.layerGroup().addTo(map.current);
      }
      layer.current!.clearLayers();
      byId.current.clear();
      for (const m of placed) {
        const s = GROUP_STYLE[m.group];
        const size = m.best ? 32 : 24;
        const icon = L.divIcon({
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<span class="pm-dot${m.best ? " pm-best" : ""}" style="background:${s.color};width:${size}px;height:${size}px">${s.glyph}</span>`,
        });
        const mk = L.marker([m.lat!, m.lng!], { icon, title: `${m.company} ${m.title}`, keyboard: true, zIndexOffset: m.best ? 1000 : 0 })
          .bindPopup(
            `<b>${esc(m.company)}</b> · ${esc(m.title)}<br/>` +
              `<span class="pm-sub">${s.label}${m.best ? " · 지금 지원 1순위" : ""}</span><br/>` +
              `<span class="pm-sub">${esc(m.address)} · 적합도 ${m.fit}% · 마감 D-${m.daysLeft}</span><br/>` +
              `<a href="/posting/${encodeURIComponent(m.id)}?${query}">공고 상세 →</a>`,
          )
          .addTo(layer.current!);
        byId.current.set(m.id, mk);
      }
      if (placed.length) map.current.fitBounds(L.latLngBounds(placed.map((m) => [m.lat!, m.lng!])), { padding: [28, 28], maxZoom: 13 });
    });
    return () => {
      cancelled = true;
    };
  }, [placed, query]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    [],
  );

  const toggle = (g: MapGroup) => setShown((s) => (s.includes(g) ? (s.length > 1 ? s.filter((x) => x !== g) : s) : [...s, g]));
  const focus = (id: string) => {
    const mk = byId.current.get(id);
    if (!mk || !map.current) return;
    map.current.setView(mk.getLatLng(), Math.max(map.current.getZoom(), 12));
    mk.openPopup();
    el.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div>
      <div className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 pb-1" role="group" aria-label="사다리 단계로 거르기">
        {groups.map((g) => {
          const on = shown.includes(g);
          const s = GROUP_STYLE[g];
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(g)}
              className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-xs font-bold ${on ? "border-slate-300 bg-white text-slate-800" : "border-slate-200 bg-slate-100 text-slate-400"}`}
            >
              <span className="pm-dot" style={{ background: on ? s.color : "#cbd5e1", width: 16, height: 16, fontSize: 10 }}>
                {s.glyph}
              </span>
              {s.label} {markers.filter((m) => m.group === g).length}
            </button>
          );
        })}
      </div>
      <div ref={el} className="h-[22rem] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" aria-label="추천 공고 지도" />
      <p className="mt-1 text-[11px] text-slate-500">마커를 누르면 공고 요약이 열려요. 큰 마커는 지금 지원 1순위예요.</p>

      <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm">
        {visible.map((m) => {
          const s = GROUP_STYLE[m.group];
          return (
            <li key={m.id}>
              <button type="button" onClick={() => focus(m.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left" disabled={m.lat === undefined}>
                <span className="pm-dot shrink-0" style={{ background: s.color, width: 20, height: 20, fontSize: 11 }}>
                  {s.glyph}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-slate-800">
                    {m.company} · {m.title}
                    {m.best && <span className="ml-1 text-xs text-brand">1순위</span>}
                  </b>
                  <span className="text-xs text-slate-500">
                    {m.address} · {s.label} · 적합도 {m.fit}% · D-{m.daysLeft}
                    {m.lat === undefined ? " · 좌표 없음" : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
