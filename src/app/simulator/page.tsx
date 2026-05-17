import { RunwaySimulator } from '@/components/RunwaySimulator';
import { RiskCheckGate } from '@/components/RiskCheckGate';

export default function SimulatorPage() {
  return (
    <>
      <RiskCheckGate />
      <RunwaySimulator />
    </>
  );
}
