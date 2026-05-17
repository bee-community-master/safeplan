import { handleTossWebhook, verifyTossWebhookSignature } from '@/server/payments/provider';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    verifyTossWebhookSignature({
      rawBody,
      signatureHeader: request.headers.get('x-toss-signature'),
      timestampHeader: request.headers.get('x-toss-timestamp')
    });
    return jsonOk(await handleTossWebhook(JSON.parse(rawBody)));
  } catch (error) {
    return jsonError(error, 400);
  }
}
