import { assertOwnsReport } from '@/server/auth/ownership';
import { createShareLink, toShareLinkSummary } from '@/server/reports/report-service';
import { appUrl } from '@/lib/url';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: reportId } = await params;
    const body = (await request.json().catch(() => ({}))) as { password?: string | null };
    await assertOwnsReport(reportId);
    const { share, token } = await createShareLink(reportId, body.password || null);
    return jsonOk({ share: toShareLinkSummary(share), token, url: appUrl(`/share/${token}`) });
  } catch (error) {
    return jsonError(error, 400);
  }
}
