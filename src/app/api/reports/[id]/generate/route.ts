import { assertOwnsCase } from '@/server/auth/ownership';
import { generateReport } from '@/server/reports/report-service';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await params;
    await assertOwnsCase(caseId);
    const report = await generateReport(caseId);
    return jsonOk({ report });
  } catch (error) {
    return jsonError(error, 400);
  }
}
