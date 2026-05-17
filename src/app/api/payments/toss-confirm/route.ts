import { assertOwnsCase } from '@/server/auth/ownership';
import { confirmTossPayment } from '@/server/payments/provider';
import { jsonError, jsonOk } from '@/server/http';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { caseId: string; paymentId: string; paymentKey: string; orderId: string; amount: number };
    await assertOwnsCase(body.caseId);
    const payment = await confirmTossPayment({ ...body, amount: Number(body.amount) });
    return jsonOk({ payment });
  } catch (error) {
    return jsonError(error, 400);
  }
}
