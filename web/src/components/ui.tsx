import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-3 rounded-2xl bg-white p-4 shadow-[0_1px_0_#d9dfea] ${className}`}>{children}</div>;
}

const TONES = {
  orange: "bg-orange-50 text-accent",
  teal: "bg-teal-50 text-teal",
  blue: "bg-blue-50 text-brand",
  gray: "bg-slate-100 text-slate-500",
  navy: "bg-navy text-white",
} as const;

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[tone]}`}>{children}</span>;
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3">
      <h1 className="text-xl font-extrabold text-navy">{children}</h1>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

export function Section({ title, desc, children }: { title: ReactNode; desc?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="text-sm font-extrabold text-navy">{title}</h2>
      {desc && <p className="mb-1.5 text-xs text-slate-500">{desc}</p>}
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

export function Meter({ label, value, dark = false }: { label: string; value: number; dark?: boolean }) {
  return (
    <div className={`rounded-lg px-2.5 py-1.5 text-xs ${dark ? "bg-white/15" : "bg-slate-100"}`}>
      {label}
      <b className="block text-base">{value}%</b>
    </div>
  );
}

export function Gauge({ now, after, label = "지금" }: { now: number; after?: number; label?: string }) {
  return (
    <div>
      <div className="relative my-1.5 h-2.5 rounded-full bg-slate-200">
        {after != null && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[repeating-linear-gradient(45deg,#9dbbf0_0_5px,#c9daf7_5px_10px)]"
            style={{ width: `${after}%` }}
          />
        )}
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${now}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>{label} {now}%</span>
        {after != null && <span>1년 후 예상 {after}%</span>}
      </div>
    </div>
  );
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "outline" }) {
  const cls =
    variant === "primary" ? "bg-brand text-white" : "border-[1.5px] border-brand bg-white text-brand";
  return (
    <Link href={href} className={`block rounded-xl px-3 py-3 text-center text-sm font-extrabold ${cls}`}>
      {children}
    </Link>
  );
}
