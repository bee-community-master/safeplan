import { handleTossWebhook } from '@/server/payments/provider';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk(await handleTossWebhook(body));
  } catch (error) {
    return jsonError(error, 400);
  }
}
