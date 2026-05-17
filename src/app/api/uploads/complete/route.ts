import { assertOwnsCase } from '@/server/auth/ownership';
import { storeEvidenceFiles, type UploadInputFile } from '@/server/files/local';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { caseId: string; files: UploadInputFile[] };
    await assertOwnsCase(body.caseId);
    const files = await storeEvidenceFiles(body.caseId, body.files);
    return jsonOk({ files });
  } catch (error) {
    return jsonError(error, 400);
  }
}
