import { handleTossWebhook } from '@/server/payments/provider';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    return jsonOk(await handleTossWebhook(JSON.parse(rawBody)));
  } catch (error) {
    return jsonError(error, 400);
  }
}
