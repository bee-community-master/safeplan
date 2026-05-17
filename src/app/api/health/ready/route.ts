import { productionReadiness } from '@/server/ops/readiness';
import { jsonOk } from '@/server/http';

export async function GET() {
  const report = productionReadiness();
  return jsonOk(report, { status: report.ready ? 200 : 503 });
}
