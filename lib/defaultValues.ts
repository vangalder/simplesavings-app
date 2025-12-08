export interface CalculatorState {
  startingAmount: number;
  monthlyContribution: number;
  timeframeYears: number;
  interestRate: number;
}

export const defaultCalculatorValues: CalculatorState = {
  startingAmount: 0,
  monthlyContribution: 1600,
  timeframeYears: 20,
  interestRate: 9.0,
};
