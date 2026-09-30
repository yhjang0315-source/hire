import Link from "next/link";
import { resolveState, run, type SearchParams } from "@/lib/session";
import { mapMarkers } from "@/lib/map";
import { ButtonLink, Card, Title } from "@/components/ui";
import PostingMap from "@/components/PostingMap";

export default async function MapPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await resolveState(searchParams);
  if (!resolved) {
    return (
      <Card>
        <p className="text-sm">입력 정보를 찾지 못했어요.</p>
        <Link href="/" className="mt-2 block text-sm font-bold text-brand">
          처음으로
        </Link>
      </Card>
    );
  }
  const markers = mapMarkers(run(resolved.state));
  const q = resolved.query;
  return (
    <>
      <Title sub="추천 공고를 근무지에서 한눈에 봐요. 단계 버튼으로 거를 수 있어요">공고 지도</Title>
      {markers.length ? <PostingMap markers={markers} query={q} /> : <Card>추천 공고가 없어요.</Card>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ButtonLink href={`/result?${q}`} variant="outline">
          추천 목록
        </ButtonLink>
        <ButtonLink href={`/path?${q}`} variant="outline">
          커리어 경로
        </ButtonLink>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">근무지는 시·군·구 단위 모의 좌표 · 지도 © OpenStreetMap</p>
    </>
  );
}
