// 공고 지도 보기(P2): 추천 결과를 지도 마커로 바꾼다. 좌표가 없는 공고는 목록에만 남긴다.
import type { Recommendation } from "@/lib/engine";
import type { Tier } from "@/lib/types";

export type MapGroup = Tier | "redirect";

export interface MapMarker {
  id: string;
  company: string;
  title: string;
  group: MapGroup;
  address: string;
  lat?: number;
  lng?: number;
  fit: number;
  daysLeft: number;
  best: boolean;
}

export const GROUP_ORDER: MapGroup[] = ["target", "stepping", "growing", "immediate", "redirect"];

export function mapMarkers(rec: Recommendation): MapMarker[] {
  const seen = new Map<string, MapMarker>();
  const add = (group: MapGroup) => (sp: Recommendation["redirect"][number]) => {
    const p = sp.posting;
    if (seen.has(p.id)) return;
    seen.set(p.id, {
      id: p.id,
      company: p.company,
      title: p.title,
      group,
      address: p.address ?? p.region,
      lat: p.lat,
      lng: p.lng,
      fit: sp.fit.score,
      daysLeft: sp.daysLeft,
      best: p.id === rec.best?.posting.id,
    });
  };
  if (rec.tracks.includes("ladder")) for (const t of GROUP_ORDER.slice(0, 4) as Tier[]) rec.tiers[t].forEach(add(t));
  if (rec.tracks.includes("redirect")) rec.redirect.forEach(add("redirect"));
  return GROUP_ORDER.flatMap((g) => [...seen.values()].filter((m) => m.group === g));
}
