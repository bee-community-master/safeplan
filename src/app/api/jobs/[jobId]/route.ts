import { readDb } from '@/server/db/local-store';
import { assertOwnsCase } from '@/server/auth/ownership';
import { jsonError, jsonOk } from '@/server/http';

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const db = await readDb();
    const job = db.processingJobs.find((item) => item.id === jobId);
    if (!job) return jsonError(new Error('job_not_found'), 404);
    await assertOwnsCase(job.caseId);
    return jsonOk({ job });
  } catch (error) {
    return jsonError(error, 403);
  }
}
