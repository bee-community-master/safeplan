'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEGAL_CAUTION_COPY } from '@/lib/constants';

type ReportState = { id: string } | null;

export function ReportActions({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<ReportState>(null);
  const [share, setShare] = useState<{ id: string; url: string } | null>(null);
  const [message, setMessage] = useState('');

  async function generate() {
    const response = await fetch(`/api/reports/${caseId}/generate`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || '리포트 생성 실패');
    setReport({ id: data.report.id });
    setMessage('리포트가 생성되었습니다.');
  }

  async function createShare() {
    if (!report) return;
    const response = await fetch(`/api/share/${report.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || '공유 링크 생성 실패');
    setShare({ id: data.share.id, url: data.url });
    setMessage('14일 뒤 만료되는 보안 링크가 생성되었습니다.');
  }

  async function revoke() {
    if (!share) return;
    await fetch(`/api/share/${share.id}/revoke`, { method: 'POST' });
    setMessage('공유 링크를 폐기했습니다.');
    setShare(null);
  }

  async function deleteCase() {
    const response = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || '삭제 실패');
    setMessage('자료, 리포트, 공유 링크를 삭제하거나 더 이상 열 수 없게 처리했습니다.');
    setTimeout(() => router.push('/account?deleted=1'), 600);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold">리포트 · 보안 링크 · 삭제</h1>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">{LEGAL_CAUTION_COPY}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-xl bg-ink px-5 py-3 font-semibold text-white" onClick={generate}>리포트 생성</button>
        <button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={!report} onClick={createShare}>보안 링크 생성</button>
        {report && <a className="rounded-xl border border-stone-300 px-5 py-3 font-semibold" href={`/api/reports/${report.id}/download`}>PDF 다운로드</a>}
        {share && <button className="rounded-xl border border-amber-300 px-5 py-3 font-semibold" onClick={revoke}>공유 링크 폐기</button>}
        <button className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-800" onClick={deleteCase}>자료 전체 삭제</button>
      </div>
      {share && (
        <div className="mt-5 rounded-2xl bg-calm p-4">
          <p className="font-bold">개인 확인용 보안 링크</p>
          <a className="break-all underline" href={share.url} target="_blank" rel="noreferrer">{share.url}</a>
        </div>
      )}
      {message && <p className="mt-4 rounded-xl bg-calm p-3" role="status">{message}</p>}
    </section>
  );
}
