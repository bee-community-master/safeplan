import { verifyTossWebhook } from '@/server/payments/provider';
import { jsonError, jsonOk } from '@/server/http';

export async function POST() {
  try {
    return jsonOk(await verifyTossWebhook());
  } catch (error) {
    return jsonError(error, 400);
  }
}
