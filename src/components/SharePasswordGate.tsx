'use client';

import { useState } from 'react';
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
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-clay">보호된 보안 링크</p>
      <h1 className="mt-2 text-3xl font-bold">비밀번호 확인</h1>
      <p className="mt-3 leading-7 text-stone-700">이 리포트는 소유자가 설정한 비밀번호를 입력한 뒤에만 열 수 있습니다. 비밀번호는 링크를 만든 사람에게 별도로 확인하세요.</p>
      <form className="mt-6 max-w-md space-y-3" onSubmit={openReport}>
        <label className="block text-sm font-bold" htmlFor="share-password">공유 링크 비밀번호</label>
        <input
          id="share-password"
          className="w-full rounded-xl border border-stone-300 px-3 py-2"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
        />
        <button className="rounded-xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={loading} type="submit">리포트 열기</button>
      </form>
      {message && <p className="mt-4 rounded-xl bg-amber-50 p-3" role="status">{message}</p>}
    </section>
  );
}
