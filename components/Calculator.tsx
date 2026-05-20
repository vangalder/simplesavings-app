"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useLocaleAndCurrency } from "@/lib/hooks/useLocaleAndCurrency";
import { isCryptoCurrency, getCurrencyMeta } from "@/lib/currency";
import { defaultCalculatorValues, type CalculatorState } from "@/lib/defaultValues";
import AnimatedCurrency from "@/components/AnimatedCurrency";
import AnimatedNumberInput from "@/components/AnimatedNumberInput";
import ShareModal from "@/components/ShareModal";
import AIBlurb, { type BlurbMeta, type InsightContext } from "@/components/AIBlurb";
import ProUpsellModal from "@/components/ProUpsellModal";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const SaveButtonWithCloud = dynamic(() => import("@/components/SaveButtonWithCloud"), { ssr: false });

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isConvexConfigured = !!process.env.NEXT_PUBLIC_CONVEX_URL;

const Chart = dynamic(() => import("@/components/Chart"), { ssr: false });

const STORAGE_KEY = "simplesavings-calculator-state";

const MAX_YEARS_AHEAD = 100;

// Clamp day to last valid day of month; reject past or absurdly-far-future years (both snap to today).
function sanitizeDate(dateStr: string): string {
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);
  const todayYear = todayDate.getFullYear();

  if (!dateStr) return todayStr;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return todayStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return todayStr;

  // Numeric year guard — catches both past years and the browser's wrap-around to year 275757
  if (year < todayYear || year > todayYear + MAX_YEARS_AHEAD) return todayStr;

  // Clamp day to last valid day of that month (e.g. Jun 31 → Jun 30)
  const lastDay = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(Math.max(1, day), lastDay);

  const result = [String(year).padStart(4, "0"), parts[1], String(clampedDay).padStart(2, "0")].join("-");
  return result < todayStr ? todayStr : result;
}

export default function Calculator() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<CalculatorState>(defaultCalculatorValues);
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldAnimateInputs, setShouldAnimateInputs] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [timeframeMode, setTimeframeMode] = useState<"years" | "date">("years");
  const [targetDateStr, setTargetDateStr] = useState("");
  const t = useTranslations("calculator");
  const tSave = useTranslations("save");
  const tChart = useTranslations("chart");
  const { locale, currency } = useLocaleAndCurrency();
  const [chartType, setChartType] = useState<"area" | "bar" | "line">("area");
  const [goalAmount, setGoalAmount] = useState<number>(0);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [aiBlurb, setAiBlurb] = useState("");
  const [aiBlurbQuestion, setAiBlurbQuestion] = useState("");
  const [aiBlurbPitch, setAiBlurbPitch] = useState("");
  const [aiBlurbLoading, setAiBlurbLoading] = useState(false);
  const [aiBlurbMeta, setAiBlurbMeta] = useState<BlurbMeta | undefined>();
  const [aiBlurbError, setAiBlurbError] = useState<string | undefined>();
  const isAdmin = useIsAdmin();
  // Store English originals separately so locale changes can translate all parts atomically
  const aiBlurbOriginalBodyRef = useRef("");
  const aiBlurbOriginalQuestionRef = useRef("");
  const aiBlurbOriginalPitchRef = useRef("");
  // Keep locale in a ref so the debounced blurb callback always reads the live value
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const [upsellContext, setUpsellContext] = useState<InsightContext | null>(null);

  // Load values from URL params, localStorage, or defaults
  useEffect(() => {
    if (isInitialized) return;

    // Priority 1: URL Parameters
    const tdParam = searchParams.get("td"); // target date (date mode)
    const urlParams = {
      sa: searchParams.get("sa"),
      mc: searchParams.get("mc"),
      ty: searchParams.get("ty"),
      ir: searchParams.get("ir"),
    };

    if (urlParams.sa || urlParams.mc || urlParams.ty || urlParams.ir || tdParam) {
      let timeframeYears = urlParams.ty ? parseFloat(urlParams.ty) || 0 : defaultCalculatorValues.timeframeYears;
      if (tdParam) {
        const diff = new Date(tdParam).getTime() - Date.now();
        timeframeYears = parseFloat(Math.min(200, Math.max(0, diff / (365.25 * 24 * 3600 * 1000))).toFixed(2));
        setTargetDateStr(tdParam);
        setTimeframeMode("date");
      }
      const newState: CalculatorState = {
        startingAmount: urlParams.sa ? parseFloat(urlParams.sa) || 0 : defaultCalculatorValues.startingAmount,
        monthlyContribution: urlParams.mc ? parseFloat(urlParams.mc) || 0 : defaultCalculatorValues.monthlyContribution,
        timeframeYears,
        interestRate: urlParams.ir ? parseFloat(urlParams.ir) || 0 : defaultCalculatorValues.interestRate,
      };
      // Goal lives only in localStorage — restore it even when URL params take priority
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed.goalAmount === "number" && parsed.goalAmount > 0) {
            setGoalAmount(parsed.goalAmount);
            setShowGoalInput(true);
          }
        }
      } catch { /* ignore */ }
      setState({ startingAmount: 0, monthlyContribution: 0, timeframeYears: 0, interestRate: 0 });
      setIsInitialized(true);
      setTimeout(() => {
        setShouldAnimateInputs(true);
        setTimeout(() => { setState(newState); }, 50);
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
        if (parsed.timeframeMode === "date" && parsed.targetDateStr) {
          setTimeframeMode("date");
          setTargetDateStr(parsed.targetDateStr);
        }
        if (typeof parsed.goalAmount === "number" && parsed.goalAmount > 0) {
          setGoalAmount(parsed.goalAmount);
          setShowGoalInput(true);
        }
        setState({ startingAmount: 0, monthlyContribution: 0, timeframeYears: 0, interestRate: 0 });
        setIsInitialized(true);
        setTimeout(() => {
          setShouldAnimateInputs(true);
          setTimeout(() => { setState(loadedState); }, 50);
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

  // Update URL when state changes (debounced).
  // Uses window.history.replaceState instead of router.replace to avoid triggering
  // Next.js Suspense re-renders which would unmount Calculator and reset local state.
  const updateURL = useCallback(
    (newState: CalculatorState, mode: "years" | "date", dateStr: string) => {
      const params = new URLSearchParams();
      if (newState.startingAmount !== defaultCalculatorValues.startingAmount) {
        params.set("sa", newState.startingAmount.toString());
      }
      if (newState.monthlyContribution !== defaultCalculatorValues.monthlyContribution) {
        params.set("mc", newState.monthlyContribution.toString());
      }
      if (mode === "date") {
        if (dateStr) params.set("td", dateStr);
      } else {
        if (newState.timeframeYears !== defaultCalculatorValues.timeframeYears) {
          params.set("ty", newState.timeframeYears.toString());
        }
      }
      if (newState.interestRate !== defaultCalculatorValues.interestRate) {
        params.set("ir", newState.interestRate.toString());
      }

      const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState(null, "", newURL);
    },
    []
  );

  // Debounce URL updates
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      updateURL(state, timeframeMode, targetDateStr);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state, timeframeMode, targetDateStr, isInitialized, updateURL]);

  // Debounced auto-save to localStorage on every state change
  useEffect(() => {
    if (!isInitialized) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, timeframeMode, targetDateStr, goalAmount, showGoalInput }));
      } catch {
        // ignore quota errors silently
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [state, timeframeMode, targetDateStr, goalAmount, showGoalInput, isInitialized]);

  // Debounced real-time AI blurb — fires 1500ms after inputs settle
  useEffect(() => {
    if (!isInitialized) return;
    setAiBlurbLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai-blurb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startingAmount: results.totalValue > 0 ? state.startingAmount : 0,
            monthlyContribution: state.monthlyContribution,
            timeframeYears: state.timeframeYears,
            interestRate: state.interestRate,
            totalValue: results.totalValue,
            interestEarned: results.interestEarned,
            currency,
            goalAmount: goalAmount > 0 ? goalAmount : null,
          }),
        });
        const data = await res.json();
        const englishBlurb = data.blurb ?? "";
        const englishQuestion = data.question ?? "";
        const englishPitch = data.pitch ?? "";
        aiBlurbOriginalBodyRef.current = englishBlurb;
        aiBlurbOriginalQuestionRef.current = englishQuestion;
        aiBlurbOriginalPitchRef.current = englishPitch;
        if (data.meta) setAiBlurbMeta(data.meta);
        if (data.error) setAiBlurbError(data.error); else setAiBlurbError(undefined);

        // Translate immediately if locale is non-English
        const currentLocale = localeRef.current;
        if (currentLocale !== "en" && englishBlurb) {
          const combined = [englishBlurb, englishQuestion, englishPitch].filter(Boolean).join("\n---\n");
          const tRes = await fetch("/api/ai-blurb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: combined, targetLocale: currentLocale }),
          });
          const tData = await tRes.json();
          setAiBlurb(tData.blurb ?? englishBlurb);
          setAiBlurbQuestion(tData.question ?? englishQuestion);
          setAiBlurbPitch(tData.pitch ?? englishPitch);
          if (tData.meta) setAiBlurbMeta(tData.meta);
        } else {
          setAiBlurb(englishBlurb);
          setAiBlurbQuestion(englishQuestion);
          setAiBlurbPitch(englishPitch);
        }
      } catch {
        // fail silently
      } finally {
        setAiBlurbLoading(false);
      }
    }, 1500);
    return () => {
      clearTimeout(id);
      setAiBlurbLoading(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, goalAmount, isInitialized]);

  // Translate existing blurb when locale changes — does not regenerate
  useEffect(() => {
    const body = aiBlurbOriginalBodyRef.current;
    if (!body) return;

    if (locale === "en") {
      // Restore English originals directly from refs — no API call needed
      setAiBlurb(body);
      setAiBlurbQuestion(aiBlurbOriginalQuestionRef.current);
      setAiBlurbPitch(aiBlurbOriginalPitchRef.current);
      return;
    }

    // Clear stale content synchronously so body and question can't show from different locales
    setAiBlurb("");
    setAiBlurbQuestion("");
    setAiBlurbPitch("");
    setAiBlurbLoading(true);

    const combined = [body, aiBlurbOriginalQuestionRef.current, aiBlurbOriginalPitchRef.current]
      .filter(Boolean).join("\n---\n");
    let cancelled = false;
    fetch("/api/ai-blurb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: combined, targetLocale: locale }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAiBlurb(data.blurb ?? body);
        setAiBlurbQuestion(data.question ?? aiBlurbOriginalQuestionRef.current);
        setAiBlurbPitch(data.pitch ?? aiBlurbOriginalPitchRef.current);
        if (data.meta) setAiBlurbMeta(data.meta);
      })
      .catch(() => {
        if (!cancelled) {
          setAiBlurb(body);
          setAiBlurbQuestion(aiBlurbOriginalQuestionRef.current);
          setAiBlurbPitch(aiBlurbOriginalPitchRef.current);
        }
      })
      .finally(() => { if (!cancelled) setAiBlurbLoading(false); });
    return () => { cancelled = true; setAiBlurbLoading(false); };
  }, [locale]); // intentionally omits refs — ref reads are stable

  // Recompute timeframeYears from target date (also runs every 24h via interval)
  useEffect(() => {
    if (timeframeMode !== "date" || !targetDateStr) return;
    const compute = () => {
      const diff = new Date(targetDateStr).getTime() - Date.now();
      const years = Math.min(200, Math.max(0, diff / (365.25 * 24 * 3600 * 1000)));
      setState((prev) => ({ ...prev, timeframeYears: parseFloat(years.toFixed(2)) }));
    };
    compute();
    const id = setInterval(compute, 24 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [timeframeMode, targetDateStr]);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, timeframeMode, targetDateStr, goalAmount, showGoalInput }));
      toast.success("Saved!");
    } catch {
      toast.error("Failed to save. Check your browser settings.");
    }
  }, [state, timeframeMode, targetDateStr, goalAmount, showGoalInput]);

  // Keyboard shortcut handler for Save (Command-S / Control-S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Command-S (macOS) or Control-S (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        // Prevent default browser save behavior
        event.preventDefault();
        
        // Don't trigger if user is typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        
        // Trigger save action
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave]);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("sa", state.startingAmount.toString());
    params.set("mc", state.monthlyContribution.toString());
    params.set("ty", state.timeframeYears.toString());
    params.set("ir", state.interestRate.toString());
    return `https://simplesavings.app?${params.toString()}`;
  }, [state]);

  const handleShare = () => {
    if (isClerkConfigured) {
      setShowShareModal(true);
      return;
    }
    // Fallback when auth is not configured: copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(
      () => toast.success("Link copied to clipboard!"),
      () => toast.info(`Copy this link: ${shareUrl}`, { duration: 10000 })
    );
  };

  const results = useMemo(() => {
    // Validate and sanitize input values
    const safeInterestRate = isNaN(state.interestRate) || !isFinite(state.interestRate) ? 0 : state.interestRate;
    const safeTimeframeYears = isNaN(state.timeframeYears) || !isFinite(state.timeframeYears) ? 0 : Math.max(0, state.timeframeYears);
    const safeStartingAmount = isNaN(state.startingAmount) || !isFinite(state.startingAmount) ? 0 : Math.max(0, state.startingAmount);
    // Negative values are valid (monthly withdrawals)
    const safeMonthlyContribution = isNaN(state.monthlyContribution) || !isFinite(state.monthlyContribution) ? 0 : state.monthlyContribution;

    const monthlyRate = safeInterestRate / 100 / 12;
    const totalMonths = Math.floor(safeTimeframeYears * 12);

    // Handle division by zero when interest rate is 0
    const calculateFutureValueAnnuity = (months: number) => {
      if (monthlyRate === 0 || Math.abs(monthlyRate) < 0.0001) {
        return safeMonthlyContribution * months;
      }
      const result = safeMonthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      return isNaN(result) || !isFinite(result) ? safeMonthlyContribution * months : result;
    };

    // Future value of initial amount
    const futureValueInitial = safeStartingAmount * Math.pow(1 + monthlyRate, totalMonths);
    const safeFvInitial = isNaN(futureValueInitial) || !isFinite(futureValueInitial) ? safeStartingAmount : futureValueInitial;

    // Future value of annuity (monthly contributions)
    const futureValueAnnuity = calculateFutureValueAnnuity(totalMonths);
    const safeFvAnnuity = isNaN(futureValueAnnuity) || !isFinite(futureValueAnnuity) ? 0 : futureValueAnnuity;

    const totalValue = Math.max(0, safeFvInitial + safeFvAnnuity);

    // For savings: principalPaid = starting amount + all contributions added
    // For withdrawals: principalPaid = starting balance only (nothing extra was deposited)
    const isWithdrawalMode = safeMonthlyContribution < 0;
    const principalPaid = isWithdrawalMode
      ? safeStartingAmount
      : safeStartingAmount + safeMonthlyContribution * totalMonths;

    // Universal formula: Interest = Ending Balance + Total Withdrawals − Starting Balance − Total Contributions
    // Equivalent to: totalValue − startingAmount − (monthlyContribution × months)
    // Works correctly for both savings (+monthly) and withdrawal (−monthly) scenarios.
    const interestEarned = Math.max(0, totalValue - safeStartingAmount - safeMonthlyContribution * totalMonths);

    // Generate data points for chart
    // Use monthly granularity when timeframe < 2 years so the chart is meaningful
    const maxYear = Math.floor(Math.max(0, safeTimeframeYears));
    const chartMonthly = totalMonths < 24;
    const chartPoints = chartMonthly ? totalMonths : maxYear;
    const chartData = [];

    for (let i = 0; i <= chartPoints; i++) {
      const months = chartMonthly ? i : i * 12;

      const fvInitial = safeStartingAmount * Math.pow(1 + monthlyRate, months);
      const safeFvI = isNaN(fvInitial) || !isFinite(fvInitial) ? safeStartingAmount : fvInitial;
      const fvAnnuity = calculateFutureValueAnnuity(months);
      const safeFvA = isNaN(fvAnnuity) || !isFinite(fvAnnuity) ? 0 : fvAnnuity;

      const totalValue = safeFvI + safeFvA;
      const finalTotal = isNaN(totalValue) || !isFinite(totalValue) ? 0 : Math.max(0, totalValue);

      let finalPrincipal: number;
      let finalInterest: number;
      if (isWithdrawalMode) {
        // Principal = original deposit, intact until balance actually drops below it.
        // Orange = retained interest (only when withdrawing less than interest earned).
        finalPrincipal = Math.min(finalTotal, safeStartingAmount);
        finalInterest = Math.max(0, finalTotal - safeStartingAmount);
      } else {
        // Principal = starting amount + cumulative contributions deposited so far.
        // Orange = compounded growth above that invested capital.
        const cumulativePrincipal = Math.max(0, safeStartingAmount + safeMonthlyContribution * months);
        finalPrincipal = Math.min(finalTotal, cumulativePrincipal);
        finalInterest = Math.max(0, finalTotal - finalPrincipal);
      }

      // Account depleted — record the zero point and stop generating data
      if (finalTotal <= 0 && i > 0) {
        chartData.push({ year: i, value: 0, principal: 0, interest: 0 });
        break;
      }

      chartData.push({ year: i, value: finalTotal, principal: finalPrincipal, interest: finalInterest });
    }

    return {
      totalValue,
      principalPaid,
      interestEarned,
      isWithdrawalMode,
      chartData,
      chartXUnit: chartMonthly ? "months" as const : "years" as const,
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
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calculator Form - Left 50% on desktop/tablet, full width on mobile */}
      <div className="w-full lg:w-1/2">
        <div className="bg-white rounded-2xl p-4 md:p-6 space-y-3 shadow-lg">
          {/* Crypto denomination notice */}
          {isCryptoCurrency(currency) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
              {t("cryptoNotice", { symbol: currency })}
            </div>
          )}
          {/* Starting Amount */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t("startingAmount")}
            </label>
            <AnimatedNumberInput
              value={state.startingAmount}
              onChange={(val) => setState({ ...state, startingAmount: val })}
              step="0.01"
              placeholder="$0.00"
              className="w-full px-4 py-3 border-2 border-accent-orange-base rounded-xl text-center text-4xl font-display font-semibold text-accent-orange-base focus:outline-none focus:ring-2 focus:ring-accent-orange-base focus:border-accent-orange-base"
              shouldAnimate={shouldAnimateInputs}
            />
            <p className="text-xs text-neutral-600 mt-0.5 text-center">{t("startingAmountHint")}</p>
          </div>

          {/* Monthly Contribution */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {state.monthlyContribution < 0 ? t("monthlyWithdrawal") : t("monthlyContribution")}
            </label>
            <AnimatedNumberInput
              value={state.monthlyContribution}
              onChange={(val) => setState({ ...state, monthlyContribution: val })}
              step="0.01"
              placeholder="$0.00"
              className="w-full px-4 py-3 border-2 border-accent-orange-base rounded-xl text-center text-4xl font-display font-semibold text-accent-orange-base focus:outline-none focus:ring-2 focus:ring-accent-orange-base focus:border-accent-orange-base"
              shouldAnimate={shouldAnimateInputs}
            />
            <p className="text-xs text-neutral-600 mt-0.5 text-center">
              {state.monthlyContribution < 0 ? t("monthlyWithdrawalHint") : t("monthlyContributionHint")}
            </p>
          </div>

          {/* Timeframe and Interest Rate - Side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  {timeframeMode === "years" ? t("timeframeYears") : t("timeframeDate")}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (timeframeMode === "years") {
                      const years = Math.max(1, state.timeframeYears);
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + Math.floor(years));
                      setTargetDateStr(d.toISOString().slice(0, 10));
                      setTimeframeMode("date");
                    } else {
                      setTimeframeMode("years");
                    }
                  }}
                  className="text-xs text-primary-base hover:underline whitespace-nowrap"
                >
                  {timeframeMode === "years" ? t("switchToDateMode") : t("switchToYearsMode")}
                </button>
              </div>

              {/* mt-auto pushes the input to the bottom of the grid row so it aligns with the interest rate input */}
              <div className="mt-auto">
                {timeframeMode === "years" ? (
                  <>
                    <AnimatedNumberInput
                      value={state.timeframeYears}
                      onChange={(val) => setState({ ...state, timeframeYears: val })}
                      step="0.1"
                      min={0}
                      placeholder="0"
                      className="w-full px-4 py-3 border-2 border-accent-orange-base rounded-xl text-center text-4xl font-display font-semibold text-accent-orange-base focus:outline-none focus:ring-2 focus:ring-accent-orange-base focus:border-accent-orange-base"
                      shouldAnimate={shouldAnimateInputs}
                    />
                    <p className="text-xs text-neutral-600 mt-0.5 text-center">
                      {state.monthlyContribution < 0 ? t("timeframeYearsWithdrawalHint") : t("timeframeYearsHint")}
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      ref={dateInputRef}
                      type="date"
                      defaultValue={targetDateStr}
                      min={new Date().toISOString().slice(0, 10)}
                      max={`${new Date().getFullYear() + MAX_YEARS_AHEAD}-12-31`}
                      onChange={(e) => { if (e.target.value) setTargetDateStr(e.target.value); }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const sanitized = sanitizeDate(e.target.value);
                          setTargetDateStr(sanitized);
                          if (dateInputRef.current) dateInputRef.current.value = sanitized;
                        }
                      }}
                      className="w-full px-3 py-3 border-2 border-accent-orange-base rounded-xl text-center text-lg font-display font-semibold text-accent-orange-base focus:outline-none focus:ring-2 focus:ring-accent-orange-base"
                    />
                    <p className="text-xs text-neutral-600 mt-0.5 text-center">
                      {state.timeframeYears > 0
                        ? (() => {
                            const totalMonths = Math.round(state.timeframeYears * 12);
                            const y = Math.floor(totalMonths / 12);
                            const m = totalMonths % 12;
                            return t("timeframeRemaining", { years: y, months: m });
                          })()
                        : t("timeframeDateHint")}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="mt-auto">
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t("interestRate")}
              </label>
                <AnimatedNumberInput
                  value={state.interestRate}
                  onChange={(val) => setState({ ...state, interestRate: val })}
                  step="0.1"
                  max={100}
                  placeholder="0"
                  className="w-full px-4 py-3 border-2 border-accent-orange-base rounded-xl text-center text-4xl font-display font-semibold text-accent-orange-base focus:outline-none focus:ring-2 focus:ring-accent-orange-base focus:border-accent-orange-base"
                  shouldAnimate={shouldAnimateInputs}
                />
                <p className="text-xs text-neutral-600 mt-0.5 text-center">
                  {isCryptoCurrency(currency) ? t("interestRateCryptoHint") : t("interestRateHint")}
                </p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="border-t-2 border-neutral-200 pt-3 mt-3">
            <h2 className="text-lg font-display font-semibold text-neutral-800 mb-2 text-center">{t("totalValue")}</h2>
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="font-display font-bold text-secondary-base">
                <AnimatedCurrency value={results.totalValue} size="xl" locale={locale} currency={currency} />
              </div>
              <button
                onClick={handleShare}
                className="p-2 hover:bg-secondary-light/20 rounded-lg transition-colors flex items-center justify-center"
                aria-label="Share calculation"
                title="Share this calculation"
              >
                <Image
                  src="/Icon-share.svg"
                  alt="Share"
                  width={24}
                  height={24}
                  unoptimized
                />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 text-sm mb-3">
              <div className="text-center min-w-0">
                <p className="text-neutral-600 truncate">{results.isWithdrawalMode ? t("startingBalance") : t("principalPaid")}</p>
                <div className="text-secondary-base font-display font-semibold mt-0.5 flex justify-center overflow-hidden">
                  <AnimatedCurrency value={results.principalPaid} size="md" locale={locale} currency={currency} />
                </div>
              </div>
              <div className="text-center min-w-0">
                <p className="text-neutral-600 truncate">{t("interestEarned")}</p>
                <div className="text-secondary-base font-display font-semibold mt-0.5 flex justify-center overflow-hidden">
                  <AnimatedCurrency value={results.interestEarned} size="md" locale={locale} currency={currency} />
                </div>
              </div>
            </div>
          </div>

          <AIBlurb blurb={aiBlurb} question={aiBlurbQuestion} pitch={aiBlurbPitch} loading={aiBlurbLoading} meta={aiBlurbMeta} error={aiBlurbError} isAdmin={isAdmin} onUpsellClick={(ctx) => setUpsellContext(ctx)} />

          {/* Save Calculation Button */}
          {isConvexConfigured ? (
            <SaveButtonWithCloud
              state={state}
              results={results}
              onLocalSave={handleSave}
            />
          ) : (
            <button
              onClick={handleSave}
              className="w-full py-3 bg-gradient-orange-yellow rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow mt-2"
            >
              {tSave("save")}
            </button>
          )}
        </div>
      </div>

      {/* Chart - Right 50% on desktop/tablet, full width below form on mobile */}
      <div className="w-full lg:w-1/2">
        <div className="bg-secondary-base rounded-2xl p-4 h-full min-h-[500px] shadow-lg overflow-hidden flex flex-col gap-2">
          <Chart
            data={results.chartData}
            chartType={chartType}
            goalAmount={goalAmount}
            locale={locale}
            currency={currency}
            xAxisUnit={results.chartXUnit}
            onChartTypeChange={setChartType}
          />

          {/* Goal amount toggle + input */}
          <div className="mt-auto pt-2">
            {!showGoalInput ? (
              <button
                onClick={() => setShowGoalInput(true)}
                className="text-xs text-white/60 hover:text-white/90 transition-colors"
              >
                + {t("setGoal")}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <label className="text-xs text-white/70 shrink-0">{tChart("goalLabel")} {getCurrencyMeta(currency).symbol}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={goalAmount ? goalAmount.toLocaleString() : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setGoalAmount(raw ? parseInt(raw, 10) : 0);
                  }}
                  onFocus={(e) => {
                    if (goalAmount) e.target.value = String(goalAmount);
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const parsed = raw ? parseInt(raw, 10) : 0;
                    setGoalAmount(parsed);
                    e.target.value = parsed ? parsed.toLocaleString() : "";
                  }}
                  placeholder="1,000,000"
                  className="flex-1 px-3 py-1.5 text-sm font-display font-semibold bg-white text-secondary-dark placeholder:text-secondary-dark/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60 transition-all"
                />
                <button
                  onClick={() => { setGoalAmount(0); setShowGoalInput(false); }}
                  className="text-xs text-white/50 hover:text-white/80"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showShareModal && isClerkConfigured && (
        <ShareModal url={shareUrl} onClose={() => setShowShareModal(false)} />
      )}
      <ProUpsellModal open={upsellContext !== null} onClose={() => setUpsellContext(null)} insightContext={upsellContext} />
    </div>
  );
}
