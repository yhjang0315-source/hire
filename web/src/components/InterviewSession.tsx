"use client";

import { useState } from "react";
import type { Posting, Traits } from "@/lib/types";
import { templateInterviewCoach, type AnswerFeedback, type InterviewQuestion } from "@/lib/coach/mockInterview";

interface Props {
  posting: Posting;
  questions: InterviewQuestion[];
  traits?: Traits;
}

export default function InterviewSession({ posting, questions, traits }: Props) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const q = questions[index];
  const done = index >= questions.length;

  const check = () => {
    if (!answer.trim()) return;
    const f = templateInterviewCoach.feedback({ answer, question: q, posting, traits });
    setFeedback(f);
    setScores((s) => {
      const next = [...s];
      next[index] = f.score;
      return next;
    });
  };

  const next = () => {
    setIndex((i) => i + 1);
    setAnswer("");
    setFeedback(null);
  };

  if (done) {
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return (
      <div className="rounded-2xl bg-white p-4 shadow-[0_1px_0_#d9dfea]">
        <b className="text-navy">연습 완료 · 평균 {avg}점</b>
        <p className="mt-1 text-sm text-slate-600">
          점수는 구조·근거·수치·인재상 연결 네 가지를 점검한 결과예요. 낮은 질문부터 다시 연습해 보세요.
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {questions.map((x, i) => (
            <li key={x.id} className="flex justify-between gap-2">
              <span className="truncate">{i + 1}. {x.text}</span>
              <b>{scores[i] ?? "-"}</b>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => { setIndex(0); setScores([]); }} className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-extrabold text-white">
          처음부터 다시
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-slate-500">
        <span>질문 {index + 1} / {questions.length}</span>
        {q.talent && <span>인재상 · {q.talent}</span>}
      </div>
      <p className="mb-2 rounded-xl rounded-tl-sm bg-blue-50 px-3 py-2 text-sm">
        <b className="block text-[11px] text-brand">AI 면접관</b>
        {q.text}
      </p>
      <textarea
        className="min-h-28 w-full rounded-xl border-[1.5px] border-slate-200 bg-white px-3 py-2 text-sm"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="말하듯이 적어 보세요. 결론(행동) → 근거(과정) → 결과(수치) 순서를 추천해요."
      />
      {!feedback ? (
        <button type="button" onClick={check} className="mt-2 w-full rounded-xl bg-navy py-2.5 text-sm font-extrabold text-white">
          피드백 받기
        </button>
      ) : (
        <>
          {feedback.good.length > 0 && (
            <div className="mt-2 rounded-xl bg-teal-50 px-3 py-2 text-sm">
              <b className="block text-teal">좋았던 점</b>
              {feedback.good.map((g) => <p key={g}>· {g}</p>)}
            </div>
          )}
          {feedback.fix.length > 0 && (
            <div className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-sm">
              <b className="block text-accent">보완할 점</b>
              {feedback.fix.map((f) => <p key={f}>· {f}</p>)}
            </div>
          )}
          <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs shadow-[0_1px_0_#d9dfea]">
            <b className="text-navy">추천 답변 구조</b> {feedback.structure} · 점검 점수 {feedback.score}점
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setFeedback(null)} className="rounded-xl border-[1.5px] border-brand bg-white py-2.5 text-sm font-extrabold text-brand">
              다시 답변
            </button>
            <button type="button" onClick={next} className="rounded-xl bg-brand py-2.5 text-sm font-extrabold text-white">
              {index + 1 < questions.length ? "다음 질문" : "결과 보기"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
