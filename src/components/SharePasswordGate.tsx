'use client';

import { useState } from 'react';
import { BrandMark } from './DesignSystem';
import { ShareReportContent, type SharedReportCard } from './ShareReportContent';

type SharedReportPayload = {
  cards: SharedReportCard[];
  fileCount: number;
};

export function SharePasswordGate({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [report, setReport] = useState<SharedReportPayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function openReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/share/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || '리포트를 열 수 없습니다. 비밀번호를 확인해 주세요.');
        return;
      }
      setReport(data.report);
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  if (report) return <ShareReportContent cards={report.cards} fileCount={report.fileCount} />;

  return (
    <section className="surface-panel p-6 md:p-8">
      <BrandMark />
      <h1 className="mt-5 text-3xl font-black">비밀번호 확인</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted">이 리포트는 소유자가 설정한 비밀번호를 입력한 뒤에만 열 수 있습니다. 비밀번호는 링크를 만든 사람에게 별도로 확인하세요.</p>
      <form className="mt-6 max-w-md space-y-3" onSubmit={openReport}>
        <label className="block text-sm font-bold" htmlFor="share-password">공유 링크 비밀번호</label>
        <input
          id="share-password"
          className="field-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
        />
        <button className="button-primary" disabled={loading} type="submit">리포트 열기</button>
      </form>
      {message && <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-950" role="status">{message}</p>}
    </section>
  );
}
