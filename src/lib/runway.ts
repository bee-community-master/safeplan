import type { PartnerSupportRisk, RunwayInput, RunwayScenarioResult } from './types';

const labels: Record<PartnerSupportRisk, string> = {
  maintained: '생활비를 받을 수 있는 경우',
  stopped: '생활비를 받을 수 없는 경우',
  partial: '일부만 받을 수 있는 경우'
};

export function floorToHalfMonth(rawMonths: number): number {
  if (!Number.isFinite(rawMonths) || rawMonths <= 0) return 0;
  return Math.floor(rawMonths * 2) / 2;
}

export function calculateRunwayScenario(input: RunwayInput, scenario: PartnerSupportRisk): RunwayScenarioResult {
  const initialDeduction = input.movingCost + input.legalAdminCost + input.emergencyCost;
  const usableCash = input.availableCash - initialDeduction - input.depositLockedAmount;
  const supportAmount =
    scenario === 'maintained'
      ? input.partnerSupportMonthly
      : scenario === 'partial'
        ? input.partnerSupportMonthly * Math.max(0, Math.min(1, input.partialSupportRatio))
        : 0;
  const selectedHousingCost = input.futureHousingCost || input.currentHousingCost;
  const monthlyNet =
    input.monthlyIncome +
    supportAmount -
    input.essentialExpenses -
    input.adjustableExpenses -
    input.debtRepayment -
    input.childCosts -
    selectedHousingCost;

  if (usableCash < 0) {
    return {
      key: scenario,
      label: labels[scenario],
      partnerSupportScenarioAmount: supportAmount,
      usableCash,
      monthlyNet,
      runwayMonths: 0,
      status: 'immediate_shortage'
    };
  }

  if (monthlyNet >= 0) {
    return {
      key: scenario,
      label: labels[scenario],
      partnerSupportScenarioAmount: supportAmount,
      usableCash,
      monthlyNet,
      runwayMonths: '유지 가능',
      status: 'sustainable'
    };
  }

  const runwayMonths = floorToHalfMonth(usableCash / Math.abs(monthlyNet));
  return {
    key: scenario,
    label: labels[scenario],
    partnerSupportScenarioAmount: supportAmount,
    usableCash,
    monthlyNet,
    runwayMonths,
    status: runwayMonths < 1 ? 'low_runway' : 'ok'
  };
}

export function calculateRunwayScenarios(input: RunwayInput): RunwayScenarioResult[] {
  return ['maintained', 'stopped', 'partial'].map((scenario) =>
    calculateRunwayScenario(input, scenario as PartnerSupportRisk)
  );
}
