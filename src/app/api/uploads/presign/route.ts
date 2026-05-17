import { LIMITS, SUPPORTED_MIME_TYPES } from '@/lib/constants';
import { assertOwnsCase } from '@/server/auth/ownership';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { caseId: string };
    await assertOwnsCase(body.caseId);
    return jsonOk({ uploadMode: 'api-base64', limits: LIMITS, supportedMimeTypes: SUPPORTED_MIME_TYPES });
  } catch (error) {
    return jsonError(error, 403);
  }
}
