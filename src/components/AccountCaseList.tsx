'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type CaseSummary = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  retentionUntil: string;
  fileCount: number;
  cardCount: number;
  reportCount: number;
};

const STATUS_LABELS: Record<string, string> = {
  draft: '준비 중',
  uploaded: '업로드 완료',
  paid: '결제 완료',
  processing: '정리 중',
  review: '검토 필요',
  reported: '리포트 생성됨',
  deleted: '삭제됨'
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));
}

export function AccountCaseList() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/cases', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setCases(data.cases || []))
      .catch(() => setMessage('자료 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
  }, []);

  async function deleteCase(caseId: string) {
    if (!deleteConfirmed[caseId]) {
      setMessage('삭제 전 확인 항목을 먼저 선택해 주세요.');
      return;
    }
    setDeleting(caseId);
    setMessage('');
    try {
      const response = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || '삭제 처리에 실패했습니다.');
        return;
      }
      setCases((prev) => prev.filter((item) => item.id !== caseId));
      setMessage('선택한 자료 묶음의 원본, 정리 초안, 리포트, 공유 링크를 삭제하거나 더 이상 열 수 없게 처리했습니다.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="surface-panel p-6 md:p-8">
      <h2 className="text-2xl font-black">내 자료 묶음</h2>
      <p className="mt-3 leading-7 text-muted">이 브라우저 세션에서 만든 자료 묶음만 표시합니다. 삭제하면 공유 링크도 폐기되어 리포트 내용이 노출되지 않습니다.</p>
      <div className="mt-6 space-y-4">
        {cases.map((item) => (
          <article key={item.id} className="rounded-3xl border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold text-teal">{STATUS_LABELS[item.status] ?? item.status}</p>
                <h3 className="mt-1 text-lg font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">자료 {item.fileCount}개 · 카드 {item.cardCount}개 · 리포트 {item.reportCount}개 · 보관 기한 {formatDate(item.retentionUntil)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="button-secondary px-4 py-2" href={`/evidence/${item.id}/review`}>카드 검토</Link>
                <Link className="button-secondary px-4 py-2" href={`/evidence/${item.id}/report`}>리포트·삭제</Link>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
              <label className="flex gap-3 text-sm font-semibold text-red-950">
                <input
                  type="checkbox"
                  checked={Boolean(deleteConfirmed[item.id])}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setDeleteConfirmed((prev) => ({ ...prev, [item.id]: checked }));
                  }}
                />
                이 자료 묶음의 원본, 정리 초안, 리포트, 공유 링크를 삭제하거나 더 이상 열 수 없게 처리한다는 점을 이해했습니다.
              </label>
              <button className="button-danger mt-3 px-4 py-2" disabled={deleting === item.id || !deleteConfirmed[item.id]} onClick={() => deleteCase(item.id)}>전체 삭제</button>
            </div>
          </article>
        ))}
      </div>
      {cases.length === 0 && <p className="mt-5 rounded-2xl bg-tealSoft p-4 text-tealDark">이 브라우저에서 보관 중인 자료 묶음이 없습니다.</p>}
      {message && <p className="mt-4 rounded-2xl bg-tealSoft p-4 text-tealDark" role="status">{message}</p>}
    </section>
  );
}
