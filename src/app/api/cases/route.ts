import { getOrCreateSessionId } from '@/server/auth/session';
import { createAnonymousCase } from '@/server/db/cases';
import { jsonError, jsonOk } from '@/server/http';

export async function POST() {
  try {
    const caseRecord = await createAnonymousCase(await getOrCreateSessionId());
    return jsonOk({ case: caseRecord });
  } catch (error) {
    return jsonError(error, 500);
  }
}
