import { assertOwnsReport } from '@/server/auth/ownership';
import { readDb } from '@/server/db/local-store';
import { revokeShareLink, toShareLinkSummary } from '@/server/reports/report-service';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: shareId } = await params;
    const db = await readDb();
    const existing = db.shareLinks.find((item) => item.id === shareId);
    if (!existing) throw new Error('share_not_found');
    await assertOwnsReport(existing.reportId);
    const share = await revokeShareLink(shareId);
    return jsonOk({ share: toShareLinkSummary(share) });
  } catch (error) {
    return jsonError(error, 400);
  }
}
