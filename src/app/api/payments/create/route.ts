import { assertOwnsCase } from '@/server/auth/ownership';
import { createPaymentIntent } from '@/server/payments/provider';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { caseId: string };
    await assertOwnsCase(body.caseId);
    const payment = await createPaymentIntent(body.caseId);
    return jsonOk({ payment });
  } catch (error) {
    return jsonError(error, 400);
  }
}
