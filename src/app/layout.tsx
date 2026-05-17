import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '독립 세이프플랜',
  description: '생활 가능 기간 계산과 상담자료 준비를 돕는 안전 중심 서비스',
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
            <nav className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" aria-label="주요 메뉴">
              <Link className="font-bold text-ink" href="/">독립 세이프플랜</Link>
              <div className="flex flex-wrap gap-3">
                <Link href="/simulator">생존 시뮬레이터</Link>
                <Link href="/evidence/start">자료 정리</Link>
                <Link href="/pricing">가격</Link>
                <Link href="/help">도움말</Link>
                <Link href="/account">삭제/보관</Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="border-t border-stone-200 bg-white/70">
            <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 text-sm text-stone-700 md:grid-cols-[1fr_auto]">
              <p>독립 세이프플랜은 법률 자문, 승소 가능성 예측, 변호사·직업 매칭을 제공하지 않습니다.</p>
              <nav className="flex flex-wrap gap-3" aria-label="하단 메뉴">
                <Link href="/legal/privacy">개인정보</Link>
                <Link href="/legal/terms">이용약관</Link>
                <Link href="/legal/ai-consent">자료 정리 동의</Link>
                <Link href="/legal/refund">환불 안내</Link>
                <Link href="/status">서비스 상태</Link>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
