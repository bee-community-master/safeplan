'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEGAL_CAUTION_COPY } from '@/lib/constants';

type ReportState = { id: string } | null;

export function ReportActions({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<ReportState>(null);
  const [share, setShare] = useState<{ id: string; url: string } | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    const response = await fetch(`/api/share/${report.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: sharePassword.trim() || null }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || '공유 링크 생성 실패');
    setShare({ id: data.share.id, url: data.url });
    setSharePassword('');
    setMessage(sharePassword.trim() ? '비밀번호로 보호되는 보안 링크가 생성되었습니다.' : '14일 뒤 만료되는 보안 링크가 생성되었습니다.');
  }

  async function revoke() {
    if (!share) return;
    await fetch(`/api/share/${share.id}/revoke`, { method: 'POST' });
    setMessage('공유 링크를 폐기했습니다.');
    setShare(null);
  }

  async function deleteCase() {
    if (!confirmDelete) {
      setMessage('삭제 전 확인 항목을 먼저 선택해 주세요.');
      return;
    }
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
      <div className="mt-6 rounded-2xl border border-stone-200 bg-calm p-4">
        <label className="block text-sm font-bold" htmlFor="share-password">공유 링크 비밀번호</label>
        <input
          id="share-password"
          className="mt-2 w-full max-w-md rounded-xl border border-stone-300 px-3 py-2"
          type="password"
          autoComplete="new-password"
          placeholder="선택 사항"
          value={sharePassword}
          onChange={(event) => setSharePassword(event.currentTarget.value)}
        />
        <p className="mt-2 text-sm text-stone-600">비밀번호를 설정하면 링크를 받은 사람이 비밀번호를 입력해야 리포트를 열 수 있습니다. 주민번호, 전화번호처럼 추측 가능한 민감정보는 사용하지 마세요.</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-xl bg-ink px-5 py-3 font-semibold text-white" onClick={generate}>리포트 생성</button>
        <button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={!report} onClick={createShare}>보안 링크 생성</button>
        {report && <a className="rounded-xl border border-stone-300 px-5 py-3 font-semibold" href={`/api/reports/${report.id}/download`}>PDF 다운로드</a>}
        {share && <button className="rounded-xl border border-amber-300 px-5 py-3 font-semibold" onClick={revoke}>공유 링크 폐기</button>}
      </div>
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
        <label className="flex gap-3 text-sm font-semibold text-red-950">
          <input type="checkbox" checked={confirmDelete} onChange={(event) => setConfirmDelete(event.currentTarget.checked)} />
          업로드한 원본, 정리 초안, 리포트, 공유 링크를 삭제하거나 더 이상 열 수 없게 처리한다는 점을 이해했습니다.
        </label>
        <button className="mt-4 rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-800 disabled:opacity-50" disabled={!confirmDelete} onClick={deleteCase}>자료 전체 삭제</button>
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
