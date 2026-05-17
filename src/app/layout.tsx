import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark, PrimaryLink } from '@/components/DesignSystem';
import './globals.css';

export const metadata: Metadata = {
  title: '독립 세이프플랜',
  description: '생활 가능 기간 계산과 상담자료 준비를 돕는 안전 중심 서비스',
  robots: { index: true, follow: true }
};

const navItems = [
  ['생존 시뮬레이터', '/simulator'],
  ['자료 정리', '/evidence/start'],
  ['가격', '/pricing'],
  ['도움말', '/help']
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
            <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between" aria-label="주요 메뉴">
              <Link className="focus-ring rounded-2xl" href="/" aria-label="독립 세이프플랜 홈"><BrandMark /></Link>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {navItems.map(([label, href]) => (
                  <Link key={href} className="rounded-xl px-3 py-2 font-semibold text-muted transition hover:bg-tealSoft hover:text-teal focus-ring" href={href}>{label}</Link>
                ))}
                <Link className="rounded-xl px-3 py-2 font-semibold text-muted transition hover:bg-tealSoft hover:text-teal focus-ring" href="/account">삭제/보관</Link>
                <PrimaryLink href="/safety">시작하기</PrimaryLink>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">{children}</main>
          <footer className="mt-10 border-t border-line/80 bg-paper/80">
            <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted md:grid-cols-[1.2fr_1fr]">
              <div>
                <BrandMark />
                <p className="mt-3 max-w-xl leading-6">법률 자문, 승소 가능성 예측, 변호사·직업 매칭을 제공하지 않습니다. 긴급 위험이 있으면 112 또는 1366 연락을 우선하세요.</p>
              </div>
              <nav className="grid grid-cols-2 gap-3 md:justify-self-end" aria-label="하단 메뉴">
                <Link href="/legal/privacy">개인정보</Link>
                <Link href="/legal/terms">이용약관</Link>
                <Link href="/legal/ai-consent">자료 정리 동의</Link>
                <Link href="/legal/refund">환불 안내</Link>
                <Link href="/status">서비스 상태</Link>
                <Link href="/help">고객지원</Link>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
