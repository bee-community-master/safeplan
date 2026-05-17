import { assertOwnsCase } from '@/server/auth/ownership';
import { completeMockPayment } from '@/server/payments/provider';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { caseId: string; paymentId: string };
    await assertOwnsCase(body.caseId);
    const payment = await completeMockPayment(body.caseId, body.paymentId);
    return jsonOk({ payment });
  } catch (error) {
    return jsonError(error, 400);
  }
}
