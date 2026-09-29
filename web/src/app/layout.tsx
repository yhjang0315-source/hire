import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "커리어 사다리",
  description: "탈락 원인을 진단하고 목표 직장까지 가는 단계별 공고를 추천하는 AI 신입 커리어 경로 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full bg-slate-100 text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 shadow-sm">
          <header className="bg-[#1f3a68] px-5 pb-4 pt-5 text-white">
            <Link href="/" className="text-xs opacity-80">
              고용24 · 커리어 사다리
            </Link>
          </header>
          <main className="flex-1 px-4 py-4">{children}</main>
          <footer className="px-5 py-4 text-center text-[11px] text-slate-400">
            시연용 모의데이터 — 회사명·인물·수치는 모두 가상입니다
          </footer>
        </div>
      </body>
    </html>
  );
}
