"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });

interface CalculatorState {
  startingAmount: number;
  monthlyContribution: number;
  timeframeYears: number;
  interestRate: number;
}

export default function Calculator() {
  const [state, setState] = useState<CalculatorState>({
    startingAmount: 0,
    monthlyContribution: 1600,
    timeframeYears: 20,
    interestRate: 9.0,
  });

  const results = useMemo(() => {
    const monthlyRate = state.interestRate / 100 / 12;
    const totalMonths = state.timeframeYears * 12;
    
    // Future value of initial amount
    const futureValueInitial = state.startingAmount * Math.pow(1 + monthlyRate, totalMonths);
    
    // Future value of annuity (monthly contributions)
    const futureValueAnnuity = state.monthlyContribution * 
      ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
    
    const totalValue = futureValueInitial + futureValueAnnuity;
    const principalPaid = state.startingAmount + (state.monthlyContribution * totalMonths);
    const interestEarned = totalValue - principalPaid;

    // Generate data points for chart
    const chartData = [];
    for (let year = 0; year <= state.timeframeYears; year++) {
      const months = year * 12;
      const fvInitial = state.startingAmount * Math.pow(1 + monthlyRate, months);
      const fvAnnuity = state.monthlyContribution * 
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
  }, [state]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calculator Form - Left 50% on desktop/tablet, full width on mobile */}
        <div className="w-full lg:w-1/2">
          <div className="bg-neutral-50 rounded-lg p-6 space-y-6">
            {/* Starting Amount */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                starting amount
              </label>
              <input
                type="number"
                step="0.01"
                value={state.startingAmount || ""}
                onChange={(e) =>
                  setState({ ...state, startingAmount: parseFloat(e.target.value) || 0 })
                }
                placeholder="$0.00"
                className="w-full px-4 py-2 border border-secondary-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-base focus:border-transparent"
              />
              <p className="text-xs text-neutral-600 mt-1">your initial savings amount</p>
            </div>

            {/* Monthly Contribution */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                monthly contribution
              </label>
              <input
                type="number"
                step="0.01"
                value={state.monthlyContribution || ""}
                onChange={(e) =>
                  setState({ ...state, monthlyContribution: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-secondary-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-base focus:border-transparent"
              />
              <p className="text-xs text-neutral-600 mt-1">amount you save each month</p>
            </div>

            {/* Timeframe and Interest Rate - Side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  timeframe in years
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={state.timeframeYears || ""}
                  onChange={(e) =>
                    setState({ ...state, timeframeYears: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-secondary-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-base focus:border-transparent"
                />
                <p className="text-xs text-neutral-600 mt-1">how long you plan to save</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  interest rate
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={state.interestRate || ""}
                  onChange={(e) =>
                    setState({ ...state, interestRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-secondary-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-base focus:border-transparent"
                />
                <p className="text-xs text-neutral-600 mt-1">estimated annual return</p>
              </div>
            </div>

            {/* Results Section */}
            <div className="border-t border-neutral-300 pt-6 mt-6">
              <h2 className="text-lg font-semibold text-neutral-800 mb-4">Total Value</h2>
              <div className="text-4xl md:text-5xl font-display font-bold text-primary-base mb-6">
                {formatCurrency(results.totalValue)}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-600">principal paid</p>
                  <p className="text-neutral-800 font-medium mt-1">
                    {formatCurrency(results.principalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-600">interest earned</p>
                  <p className="text-neutral-800 font-medium mt-1">
                    {formatCurrency(results.interestEarned)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart - Right 50% on desktop/tablet, full width below form on mobile */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-lg p-6 h-full">
            <Chart data={results.chartData} />
          </div>
        </div>
      </div>
    </div>
  );
}
