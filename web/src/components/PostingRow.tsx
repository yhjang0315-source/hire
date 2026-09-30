import Link from "next/link";
import type { ScoredPosting } from "@/lib/engine";

export default function PostingRow({
  sp,
  href,
  best,
  metric,
  tone = "border-brand",
}: {
  sp: ScoredPosting;
  href: string;
  best?: boolean;
  metric: string;
  tone?: string;
}) {
  return (
    <Link
      href={href}
      className={`mb-1.5 flex items-center justify-between rounded-xl border-l-[5px] bg-white px-3 py-2 text-sm shadow-[0_1px_0_#d9dfea] ${tone}`}
    >
      <span className="min-w-0 truncate">
        {sp.posting.company} · {sp.posting.title}
        <span className="ml-1 text-[11px] text-slate-400">D-{sp.daysLeft}</span>
      </span>
      <span className="ml-2 shrink-0 text-xs text-slate-500">{best ? "★ 1순위" : metric}</span>
    </Link>
  );
}
