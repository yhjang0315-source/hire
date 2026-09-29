"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Application, ApplicationResult, Education, Posting, Profile, Traits } from "@/lib/types";
import { encodeState, type InputState } from "@/lib/state";
import { INTERVIEW_QUESTION, interviewTags } from "@/lib/interview";
import { TRAIT_LABELS, type TraitAxis } from "@/lib/engine/traits";

interface Props {
  initial: InputState | null;
  occupations: { code: string; name: string }[];
  postings: Pick<Posting, "id" | "company" | "title">[];
  tags: string[];
}

const EMPTY: Profile = {
  id: "U-001",
  alias: "나",
  targetOccupationCodes: [],
  major: "기계",
  education: "대졸",
  certificates: [],
  careerYears: 0,
  experienceText: "",
  competencies: [],
  region: "경기",
  minSalary: 3000,
  searchMonths: 3,
  traits: { pace: 0, lead: 0, change: 0, scope: 0, work: 0 },
};

const RESULTS: ApplicationResult[] = ["서류탈락", "면접탈락", "최종합격", "대기"];
const label = "mb-1 block text-xs font-bold text-slate-500";
const field = "w-full rounded-lg border-[1.5px] border-slate-200 bg-white px-3 py-2 text-sm";
const box = "mb-3 rounded-2xl bg-white p-4 shadow-[0_1px_0_#d9dfea]";

export default function InputForm({ initial, occupations, postings, tags }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initial?.profile ?? EMPTY);
  const [apps, setApps] = useState<Application[]>(initial?.applications ?? []);
  const [postingNo, setPostingNo] = useState("");
  const [notice, setNotice] = useState("");
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile((p) => ({ ...p, [k]: v }));
  const byId = new Map(postings.map((p) => [p.id, p]));

  const toggleTarget = (code: string) =>
    set(
      "targetOccupationCodes",
      profile.targetOccupationCodes.includes(code)
        ? profile.targetOccupationCodes.filter((c) => c !== code)
        : [...profile.targetOccupationCodes, code],
    );

  const summarize = () => {
    const found = interviewTags(profile.experienceText);
    set("competencies", [...new Set([...profile.competencies, ...found])]);
    setNotice(found.length ? `${found.length}개 역량으로 정리했어요. 맞지 않으면 지워 주세요.` : "찾은 역량이 없어요. 조금 더 자세히 적어 주세요.");
  };

  const addApplication = () => {
    const id = postingNo.trim();
    if (!byId.has(id)) return setNotice("공고 번호를 찾지 못했어요. 목록에서 골라 주세요.");
    if (apps.some((a) => a.postingId === id)) return setNotice("이미 추가한 공고예요.");
    setApps([...apps, { postingId: id, appliedAt: new Date().toISOString().slice(0, 10), result: "서류탈락" }]);
    setPostingNo("");
    setNotice("");
  };

  const submit = () => {
    if (profile.targetOccupationCodes.length === 0) return setNotice("목표 직종을 하나 이상 골라 주세요.");
    router.push(`/result?s=${encodeState({ profile, applications: apps })}`);
  };

  const traits = profile.traits ?? EMPTY.traits!;

  return (
    <div>
      <div className={box}>
        <span className={label}>관심·목표 직종</span>
        <div className="flex flex-wrap gap-1.5">
          {occupations.map((o) => {
            const on = profile.targetOccupationCodes.includes(o.code);
            return (
              <button
                key={o.code}
                type="button"
                onClick={() => toggleTarget(o.code)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${on ? "bg-brand text-white" : "bg-blue-50 text-brand"}`}
              >
                {o.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${box} grid grid-cols-2 gap-2`}>
        <label>
          <span className={label}>전공 계열</span>
          <select className={field} value={profile.major} onChange={(e) => set("major", e.target.value)}>
            {["기계", "컴퓨터", "전기·전자", "경영", "기타"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>학력</span>
          <select className={field} value={profile.education} onChange={(e) => set("education", e.target.value as Education)}>
            {(["고졸", "전문대졸", "대졸"] as Education[]).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2">
          <span className={label}>자격증(쉼표로 구분)</span>
          <input
            className={field}
            value={profile.certificates.join(", ")}
            onChange={(e) => set("certificates", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="예: 일반기계기사"
          />
        </label>
        <label className="col-span-2">
          <span className={label}>관련 경력(년, 인턴 포함)</span>
          <input
            className={field}
            type="number"
            min={0}
            step={0.5}
            value={profile.careerYears}
            onChange={(e) => set("careerYears", Number(e.target.value))}
          />
        </label>
      </div>

      <div className={box}>
        <span className={label}>AI 경력 인터뷰</span>
        <p className="mb-2 rounded-xl rounded-tl-sm bg-blue-50 px-3 py-2 text-sm">{INTERVIEW_QUESTION}</p>
        <textarea
          className={`${field} min-h-20`}
          value={profile.experienceText}
          onChange={(e) => set("experienceText", e.target.value)}
          placeholder="예: CAD 수업에서 부품 도면을 그렸고, 식품공장에서 6개월 일했어요."
        />
        <button type="button" onClick={summarize} className="mt-2 w-full rounded-lg bg-navy py-2 text-sm font-bold text-white">
          역량으로 정리하기
        </button>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.competencies.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("competencies", profile.competencies.filter((x) => x !== t))}
              className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal"
            >
              {t} ×
            </button>
          ))}
          <select
            className="rounded-full border border-dashed border-slate-300 bg-white px-2 text-xs text-slate-500"
            value=""
            onChange={(e) => e.target.value && set("competencies", [...new Set([...profile.competencies, e.target.value])])}
          >
            <option value="">+ 역량 추가</option>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">시연: 키워드 규칙으로 정리 · 실서비스는 생성형 AI가 대화로 정리</p>
      </div>

      <div className={box}>
        <span className={label}>지원 이력과 결과</span>
        <div className="mb-2 flex gap-1.5">
          <input
            className={field}
            list="posting-ids"
            value={postingNo}
            onChange={(e) => setPostingNo(e.target.value)}
            placeholder="고용24 공고 번호"
          />
          <datalist id="posting-ids">
            {postings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.company} · {p.title}
              </option>
            ))}
          </datalist>
          <button type="button" onClick={addApplication} className="shrink-0 rounded-lg bg-brand px-3 text-sm font-bold text-white">
            자동 채움
          </button>
        </div>
        {apps.length === 0 && <p className="text-xs text-slate-400">아직 지원 이력이 없어요. 3건 이상이면 탈락 원인을 진단해요.</p>}
        {apps.map((a, i) => {
          const p = byId.get(a.postingId);
          return (
            <div key={a.postingId} className="flex items-center gap-2 border-b border-slate-100 py-1.5 text-sm">
              <span className="flex-1 truncate">
                {p ? `${p.company} · ${p.title}` : a.postingId}
              </span>
              <select
                className="rounded-md border border-slate-200 px-1 py-0.5 text-xs"
                value={a.result}
                onChange={(e) => setApps(apps.map((x, j) => (j === i ? { ...x, result: e.target.value as ApplicationResult } : x)))}
              >
                {RESULTS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <button type="button" onClick={() => setApps(apps.filter((_, j) => j !== i))} className="text-xs text-slate-400">
                삭제
              </button>
            </div>
          );
        })}
      </div>

      <div className={`${box} grid grid-cols-3 gap-2`}>
        <label>
          <span className={label}>희망 지역</span>
          <select className={field} value={profile.region} onChange={(e) => set("region", e.target.value)}>
            {["서울", "경기", "인천", "기타"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>희망 연봉(만원)</span>
          <input className={field} type="number" step={100} value={profile.minSalary ?? 0} onChange={(e) => set("minSalary", Number(e.target.value))} />
        </label>
        <label>
          <span className={label}>구직 가능</span>
          <select className={field} value={profile.searchMonths} onChange={(e) => set("searchMonths", Number(e.target.value) as Profile["searchMonths"])}>
            <option value={1}>1개월</option>
            <option value={3}>3개월</option>
            <option value={6}>6개월+</option>
          </select>
        </label>
      </div>

      <details className={box}>
        <summary className="cursor-pointer text-xs font-bold text-slate-500">성향 자가진단(면접에서 자주 떨어진다면)</summary>
        {(Object.keys(TRAIT_LABELS) as TraitAxis[]).map((axis) => (
          <div key={axis} className="mt-2 flex items-center gap-2 text-xs">
            <span className="w-12 text-right">{TRAIT_LABELS[axis][0]}</span>
            <input
              type="range"
              min={-2}
              max={2}
              step={1}
              value={traits[axis]}
              onChange={(e) => set("traits", { ...traits, [axis]: Number(e.target.value) } as Traits)}
              className="flex-1"
            />
            <span className="w-12">{TRAIT_LABELS[axis][1]}</span>
          </div>
        ))}
      </details>

      {notice && <p className="mb-2 text-center text-xs font-bold text-accent">{notice}</p>}
      <button type="button" onClick={submit} className="w-full rounded-xl bg-brand py-3 text-base font-extrabold text-white">
        진단 받기
      </button>
    </div>
  );
}
