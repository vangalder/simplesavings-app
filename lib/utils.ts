import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Compound interest calculation utilities
export function calculateFutureValue(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): {
  totalValue: number;
  principalPaid: number;
  interestEarned: number;
  chartData: Array<{ year: number; value: number }>;
} {
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = years * 12;

  // Future value of initial amount
  const futureValueInitial = principal * Math.pow(1 + monthlyRate, totalMonths);

  // Future value of annuity (monthly contributions)
  const futureValueAnnuity =
    monthlyContribution *
    ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);

  const totalValue = futureValueInitial + futureValueAnnuity;
  const principalPaid = principal + monthlyContribution * totalMonths;
  const interestEarned = totalValue - principalPaid;

  // Generate data points for chart
  const chartData = [];
  for (let year = 0; year <= years; year++) {
    const months = year * 12;
    const fvInitial = principal * Math.pow(1 + monthlyRate, months);
    const fvAnnuity =
      monthlyContribution *
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    chartData.push({
      year,
      value: fvInitial + fvAnnuity,
    });
  }

  return {
    totalValue,
    principalPaid,
    interestEarned,
    chartData,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
