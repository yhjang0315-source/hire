import { getDataset } from "@/data/cache";
import { resolveState, type SearchParams } from "@/lib/session";
import { Title } from "@/components/ui";
import InputForm from "@/components/InputForm";

export default async function InputPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await resolveState(searchParams);
  const data = getDataset();
  return (
    <>
      <Title sub="지원 결과를 입력할수록 진단이 정확해져요.">나의 상황 입력</Title>
      <InputForm
        initial={resolved?.state ?? null}
        occupations={data.occupations.map((o) => ({ code: o.code, name: o.name }))}
        postings={data.postings.map((p) => ({ id: p.id, company: p.company, title: p.title }))}
        tags={Object.keys(data.skillMap)}
      />
    </>
  );
}
