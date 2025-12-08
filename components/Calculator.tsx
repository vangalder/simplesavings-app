"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { defaultCalculatorValues, type CalculatorState } from "@/lib/defaultValues";
import AnimatedCurrency from "@/components/AnimatedCurrency";
import AnimatedNumberInput from "@/components/AnimatedNumberInput";

const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });

const STORAGE_KEY = "simplesavings-calculator-state";

export default function Calculator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<CalculatorState>(defaultCalculatorValues);
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldAnimateInputs, setShouldAnimateInputs] = useState(false);

  // Load values from URL params, localStorage, or defaults
  useEffect(() => {
    if (isInitialized) return;

    // Priority 1: URL Parameters
    const urlParams = {
      sa: searchParams.get("sa"),
      mc: searchParams.get("mc"),
      ty: searchParams.get("ty"),
      ir: searchParams.get("ir"),
    };

    if (urlParams.sa || urlParams.mc || urlParams.ty || urlParams.ir) {
      const newState: CalculatorState = {
        startingAmount: urlParams.sa ? parseFloat(urlParams.sa) || 0 : defaultCalculatorValues.startingAmount,
        monthlyContribution: urlParams.mc ? parseFloat(urlParams.mc) || 0 : defaultCalculatorValues.monthlyContribution,
        timeframeYears: urlParams.ty ? parseFloat(urlParams.ty) || 0 : defaultCalculatorValues.timeframeYears,
        interestRate: urlParams.ir ? parseFloat(urlParams.ir) || 0 : defaultCalculatorValues.interestRate,
      };
      // Set to 0 first for animation
      setState({
        startingAmount: 0,
        monthlyContribution: 0,
        timeframeYears: 0,
        interestRate: 0,
      });
      setIsInitialized(true);
      // Enable animation and set target values after a brief delay
      setTimeout(() => {
        setShouldAnimateInputs(true);
        setTimeout(() => {
          setState(newState);
        }, 50);
      }, 100);
      return;
    }

    // Priority 2: LocalStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const loadedState = {
          startingAmount: parsed.startingAmount ?? defaultCalculatorValues.startingAmount,
          monthlyContribution: parsed.monthlyContribution ?? defaultCalculatorValues.monthlyContribution,
          timeframeYears: parsed.timeframeYears ?? defaultCalculatorValues.timeframeYears,
          interestRate: parsed.interestRate ?? defaultCalculatorValues.interestRate,
        };
        // Set to 0 first for animation
        setState({
          startingAmount: 0,
          monthlyContribution: 0,
          timeframeYears: 0,
          interestRate: 0,
        });
        setIsInitialized(true);
        // Enable animation and set target values after a brief delay
        setTimeout(() => {
          setShouldAnimateInputs(true);
          setTimeout(() => {
            setState(loadedState);
          }, 50);
        }, 100);
        return;
      }
    } catch (err) {
      console.error("Failed to load from localStorage:", err);
    }

    // Priority 3: Default Values
    setState(defaultCalculatorValues);
    setIsInitialized(true);
  }, [searchParams, isInitialized]);

  // Update URL when state changes (debounced)
  const updateURL = useCallback(
    (newState: CalculatorState) => {
      const params = new URLSearchParams();
      if (newState.startingAmount !== defaultCalculatorValues.startingAmount) {
        params.set("sa", newState.startingAmount.toString());
      }
      if (newState.monthlyContribution !== defaultCalculatorValues.monthlyContribution) {
        params.set("mc", newState.monthlyContribution.toString());
      }
      if (newState.timeframeYears !== defaultCalculatorValues.timeframeYears) {
        params.set("ty", newState.timeframeYears.toString());
      }
      if (newState.interestRate !== defaultCalculatorValues.interestRate) {
        params.set("ir", newState.interestRate.toString());
      }

      const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
      router.replace(newURL, { scroll: false });
    },
    [router]
  );

  // Debounce URL updates
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      updateURL(state);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state, isInitialized, updateURL]);

  const handleSave = () => {
    try {
      // Get existing save metadata
      const saveMetadataKey = `${STORAGE_KEY}-metadata`;
      let saveCount = 0;
      let lastSaveTime = "";

      try {
        const existingMetadata = localStorage.getItem(saveMetadataKey);
        if (existingMetadata) {
          const parsed = JSON.parse(existingMetadata);
          saveCount = (parsed.saveCount || 0) + 1;
        } else {
          saveCount = 1;
        }
      } catch (err) {
        saveCount = 1;
      }

      // Get current timestamp
      lastSaveTime = new Date().toISOString();

      // Save calculator state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      // Save metadata
      localStorage.setItem(
        saveMetadataKey,
        JSON.stringify({
          saveCount,
          lastSaveTime,
        })
      );

      alert(`Calculation saved! (Saved ${saveCount} time${saveCount !== 1 ? "s" : ""})`);
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
      alert("Failed to save calculation. Please check your browser settings.");
    }
  };

  const results = useMemo(() => {
    const monthlyRate = state.interestRate / 100 / 12;
    const totalMonths = Math.floor(state.timeframeYears * 12);

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
    const maxYear = Math.ceil(state.timeframeYears);
    for (let year = 0; year <= maxYear; year++) {
      const months = year * 12;
      const fvInitial = state.startingAmount * Math.pow(1 + monthlyRate, months);
      const fvAnnuity = state.monthlyContribution *
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      chartData.push({
        year,
        value: fvInitial + fvAnnuity,
        principal: state.startingAmount + (state.monthlyContribution * months),
        interest: (fvInitial + fvAnnuity) - (state.startingAmount + (state.monthlyContribution * months)),
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

  const formatInputValue = (value: number | string): string => {
    if (value === "" || value === null || value === undefined) return "";
    return value.toString();
  };

  return (
    <div className="container mx-auto px-4 py-6 relative z-10">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calculator Form - Left 50% on desktop/tablet, full width on mobile */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6 shadow-lg">
            {/* Starting Amount */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                starting amount
              </label>
              <AnimatedNumberInput
                value={state.startingAmount}
                onChange={(val) => setState({ ...state, startingAmount: val })}
                step="0.01"
                placeholder="$0.00"
                className="w-full px-4 py-3 border-2 border-accent-orange-base rounded-xl text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-accent-orange-base focus:border-accent-orange-base"
                shouldAnimate={shouldAnimateInputs}
              />
              <p className="text-xs text-neutral-600 mt-1 text-center">your initial savings amount</p>
            </div>

            {/* Monthly Contribution */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                monthly contribution
              </label>
              <AnimatedNumberInput
                value={state.monthlyContribution}
                onChange={(val) => setState({ ...state, monthlyContribution: val })}
                step="0.01"
                placeholder="$0.00"
                className="w-full px-4 py-3 border-2 border-accent-orange-base rounded-xl text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-accent-orange-base focus:border-accent-orange-base"
                shouldAnimate={shouldAnimateInputs}
              />
              <p className="text-xs text-neutral-600 mt-1 text-center">amount you save each month</p>
            </div>

            {/* Timeframe and Interest Rate - Side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  timeframe in years
                </label>
                <AnimatedNumberInput
                  value={state.timeframeYears}
                  onChange={(val) => setState({ ...state, timeframeYears: val })}
                  step="0.1"
                  min={0}
                  placeholder="0"
                  className="w-full px-4 py-3 border-2 border-accent-orange-base rounded-xl text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-accent-orange-base focus:border-accent-orange-base"
                  shouldAnimate={shouldAnimateInputs}
                />
                <p className="text-xs text-neutral-600 mt-1 text-center">how long you plan to save</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  interest rate
                </label>
                <AnimatedNumberInput
                  value={state.interestRate}
                  onChange={(val) => setState({ ...state, interestRate: val })}
                  step="0.1"
                  min={0}
                  max={100}
                  placeholder="0"
                  className="w-full px-4 py-3 border-2 border-accent-orange-base rounded-xl text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-accent-orange-base focus:border-accent-orange-base"
                  shouldAnimate={shouldAnimateInputs}
                />
                <p className="text-xs text-neutral-600 mt-1 text-center">estimated annual return</p>
              </div>
            </div>

            {/* Results Section */}
            <div className="border-t-2 border-neutral-200 pt-6 mt-6">
              <h2 className="text-lg font-semibold text-neutral-800 mb-4">Total Value</h2>
              <div className="flex items-center gap-2 mb-6">
                <div className="font-display font-bold text-secondary-base">
                  <AnimatedCurrency value={results.totalValue} size="xl" />
                </div>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-secondary-base"
                >
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-neutral-600">principal paid</p>
                  <div className="text-secondary-base font-semibold mt-1">
                    <AnimatedCurrency value={results.principalPaid} size="lg" />
                  </div>
                </div>
                <div>
                  <p className="text-neutral-600">interest earned</p>
                  <div className="text-secondary-base font-semibold mt-1">
                    <AnimatedCurrency value={results.interestEarned} size="lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Calculation Button */}
            <button
              onClick={handleSave}
              className="w-full py-4 bg-gradient-orange-yellow rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              Save Calculation
            </button>
          </div>
        </div>

        {/* Chart - Right 50% on desktop/tablet, full width below form on mobile */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-2xl p-6 h-full shadow-lg">
            <Chart data={results.chartData} />
          </div>
        </div>
      </div>
    </div>
  );
}
