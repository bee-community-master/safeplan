import { assertOwnsReport } from '@/server/auth/ownership';
import { readReportPdf } from '@/server/reports/report-service';
import { jsonError } from '@/server/http';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: reportId } = await params;
    await assertOwnsReport(reportId);
    const { pdf } = await readReportPdf(reportId);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="safeplan-report.pdf"',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return jsonError(error, 403);
  }
}
