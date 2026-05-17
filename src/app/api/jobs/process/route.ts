import { assertOwnsCase } from '@/server/auth/ownership';
import { processCaseTimeline } from '@/server/ai/timeline-orchestrator';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { caseId: string };
    await assertOwnsCase(body.caseId);
    const result = await processCaseTimeline(body.caseId);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}
