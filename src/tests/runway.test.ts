import { describe, expect, it } from 'vitest';
import { calculateRunwayScenarios, floorToHalfMonth } from '@/lib/runway';
import type { RunwayInput } from '@/lib/types';

describe('runway calculator', () => {
  it('floors to conservative 0.5 month units', () => {
    expect(floorToHalfMonth(0.99)).toBe(0.5);
    expect(floorToHalfMonth(1.24)).toBe(1);
    expect(floorToHalfMonth(1.75)).toBe(1.5);
  });

  it('calculates maintained, stopped and partial support scenarios client-side', () => {
    const input: RunwayInput = {
      availableCash: 3000000,
      monthlyIncome: 1200000,
      partnerSupportMonthly: 800000,
      partnerSupportRisk: 'partial',
      partialSupportRatio: 0.5,
      essentialExpenses: 1200000,
      adjustableExpenses: 300000,
      debtRepayment: 100000,
      childCosts: 300000,
      currentHousingCost: 500000,
      futureHousingCost: 600000,
      depositLockedAmount: 0,
      movingCost: 1000000,
      legalAdminCost: 500000,
      emergencyCost: 500000
    };
    const results = calculateRunwayScenarios(input);
    expect(results.map((item) => item.key)).toEqual(['maintained', 'stopped', 'partial']);
    expect(results.find((item) => item.key === 'stopped')?.runwayMonths).toBe(0.5);
    expect(results.find((item) => item.key === 'partial')?.partnerSupportScenarioAmount).toBe(400000);
  });
});
