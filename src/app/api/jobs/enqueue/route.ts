import { assertOwnsCase } from '@/server/auth/ownership';
import { enqueueProcessingJob } from '@/server/ai/timeline-orchestrator';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { caseId: string };
    await assertOwnsCase(body.caseId);
    const job = await enqueueProcessingJob(body.caseId);
    return jsonOk({ job });
  } catch (error) {
    return jsonError(error, 400);
  }
}
