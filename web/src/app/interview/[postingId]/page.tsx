import Link from "next/link";
import { getDataset } from "@/data/cache";
import { resolveState, type SearchParams } from "@/lib/session";
import { getInterviewCoach } from "@/lib/coach/mockInterview";
import { joinItems } from "@/lib/korean";
import { ButtonLink, Card } from "@/components/ui";
import InterviewSession from "@/components/InterviewSession";

export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ postingId: string }>;
  searchParams: SearchParams;
}) {
  const { postingId } = await params;
  const resolved = await resolveState(searchParams);
  const posting = getDataset().postings.find((p) => p.id === decodeURIComponent(postingId));
  if (!resolved || !posting) {
    return (
      <Card>
        <p className="text-sm">면접을 연습할 공고를 찾지 못했어요.</p>
        <Link href="/" className="mt-2 block text-sm font-bold text-brand">
          처음으로
        </Link>
      </Card>
    );
  }
  const questions = getInterviewCoach().questions(posting);

  return (
    <>
      <div className="mb-3">
        <div className="text-xs text-slate-500">S8 AI 모의면접</div>
        <h1 className="text-xl font-extrabold text-navy">
          {posting.company} · {posting.title}
        </h1>
      </div>
      {posting.talent.length > 0 && (
        <Card className="bg-orange-50">
          <b className="text-sm text-accent">이 회사 인재상</b>
          <p className="text-sm">
            {joinItems(posting.talent, 5)} <span className="text-slate-500">(공고 분석)</span>
          </p>
        </Card>
      )}
      <InterviewSession posting={posting} questions={questions} traits={resolved.state.profile.traits} />
      <div className="mt-4">
        <ButtonLink href={`/card/${encodeURIComponent(posting.id)}?${resolved.query}`} variant="outline">
          추천 카드로
        </ButtonLink>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">시연: 규칙 기반 질문·피드백 · 실서비스는 생성형 AI 면접관(음성 확장 가능)</p>
    </>
  );
}
