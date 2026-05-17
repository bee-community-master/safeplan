import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '독립 세이프플랜',
  description: '생활 가능 기간 계산과 상담자료 준비를 돕는 안전 중심 서비스',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-sm" aria-label="주요 메뉴">
              <Link className="font-bold text-ink" href="/">독립 세이프플랜</Link>
              <div className="flex gap-3">
                <Link href="/simulator">생존 시뮬레이터</Link>
                <Link href="/evidence/start">자료 정리</Link>
                <Link href="/account">삭제/보관</Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
