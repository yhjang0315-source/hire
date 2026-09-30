import Link from "next/link";
import { getPersonas } from "@/data";
import { DIAGNOSIS_LABEL } from "@/lib/card/labels";
import { Badge, ButtonLink, Card, Title } from "@/components/ui";

export default function Home() {
  const personas = getPersonas();
  return (
    <>
      <Title sub="탈락 원인을 먼저 진단하고, 목표 직장까지 가는 단계별 공고를 판단 근거·이후 계획과 함께 추천해요.">
        커리어 사다리
      </Title>

      <Card className="bg-orange-50">
        <p className="text-sm leading-relaxed">
          목표 직종 공고만 계속 지원하다 떨어지고 있나요? 부족한 역량을 <b>훈련이 아니라 일자리로</b> 채우는 길을
          찾아 드릴게요.
        </p>
      </Card>

      <h2 className="mb-2 mt-5 text-sm font-extrabold text-navy">시연 페르소나로 보기</h2>
      {personas.map((p) => {
        const d = DIAGNOSIS_LABEL[p.expected.diagnosis];
        return (
          <Link key={p.profile.id} href={`/result?persona=${p.profile.id}`} className="block">
            <Card className="transition hover:ring-2 hover:ring-brand/30">
              <div className="flex items-center justify-between">
                <b>{p.profile.alias}</b>
                <Badge tone={d.tone === "gray" ? "gray" : d.tone}>{d.title}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {p.profile.major} 전공 · 지원 {p.applications.length}건 · {p.profile.experienceText}
              </p>
            </Card>
          </Link>
        );
      })}

      <div className="mt-5">
        <ButtonLink href="/input">내 상황 직접 입력하기</ButtonLink>
      </div>
    </>
  );
}
