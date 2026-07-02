"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import AdminModelMatrix from "@/components/AdminModelMatrix";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const CHART_COLORS = ["#F58634", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B"];

export default function AdminPanel() {
  // Admin queries require server-side auth; wait until the Convex token is
  // attached (isAuthenticated) or they throw "Not authenticated" on first paint
  // after a navigation — before Clerk's token reaches the Convex client.
  const { isAuthenticated } = useConvexAuth();
  const authed = isAuthenticated ? {} : "skip";
  const stats = useQuery(api.users.getAdminStats, authed);
  const shareAnalytics = useQuery(api.shares.getShareAnalytics, authed);
  const blurbModel = useQuery(api.appConfig.getConfig, { key: "defaultBlurbModel" });
  const convoModel = useQuery(api.appConfig.getConfig, { key: "defaultConversationModel" });
  const paymentTestMode = useQuery(api.appConfig.getConfig, { key: "paymentTestMode" });
  const proSampleCreditLimitRaw = useQuery(api.appConfig.getConfig, { key: "proSampleCreditLimitCents" });
  const proSamplePriceRaw = useQuery(api.appConfig.getConfig, { key: "proSamplePriceDisplay" });
  const proPriceRaw = useQuery(api.appConfig.getConfig, { key: "proPriceDisplay" });
  const setConfig = useMutation(api.appConfig.setConfig);
  const modelStats = useQuery(api.blurbLogs.getModelStats, authed);

  const { user } = useUser();
  const creditBalance = useQuery(
    api.users.getAiCreditBalance,
    isAuthenticated ? {} : "skip"
  );

  const seedTestCredits = useMutation(api.users.seedTestCredits);

  const testModeValue = (paymentTestMode === "true" ? "sample" : paymentTestMode) ?? "off";
  const isTestModeOn = testModeValue !== "off";

  const creditLimitCents = Math.max(1, parseInt(proSampleCreditLimitRaw ?? "100", 10) || 100);
  const [creditLimitInput, setCreditLimitInput] = useState<string>("");
  const [proSamplePriceInput, setProSamplePriceInput] = useState<string>("");
  const [proPriceInput, setProPriceInput] = useState<string>("");

  const handleTestModeChange = async (value: string) => {
    await setConfig({ key: "paymentTestMode", value });
    // When toggling to Pro Sample, immediately reset the test account to the
    // configured credit limit so the tier badge and usage bar are live.
    if (value === "sample" && user?.id) {
      await seedTestCredits({ creditsInCents: creditLimitCents });
    }
  };

  type StatSortCol = "model" | "calls" | "avgLatency" | "p95Latency" | "avgCost" | "totalCost" | "translations";
  type StatSortDir = "asc" | "desc";
  const [statSortCol, setStatSortCol] = useState<StatSortCol>("calls");
  const [statSortDir, setStatSortDir] = useState<StatSortDir>("desc");

  function handleStatSort(col: StatSortCol) {
    if (statSortCol === col) {
      setStatSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setStatSortCol(col);
      setStatSortDir(col === "model" ? "asc" : "desc");
    }
  }

  // Build chart data from model stats
  const chartData = useMemo(() => {
    if (!modelStats || modelStats.length === 0) return null;
    const sorted = [...modelStats].sort((a, b) => {
      let cmp = 0;
      if (statSortCol === "model")       cmp = `${a.provider}/${a.model}`.localeCompare(`${b.provider}/${b.model}`);
      else if (statSortCol === "calls")       cmp = a.callCount - b.callCount;
      else if (statSortCol === "avgLatency")  cmp = a.avgLatencyMs - b.avgLatencyMs;
      else if (statSortCol === "p95Latency")  cmp = a.p95LatencyMs - b.p95LatencyMs;
      else if (statSortCol === "avgCost")     cmp = a.avgCostUsd - b.avgCostUsd;
      else if (statSortCol === "totalCost")   cmp = a.totalCostUsd - b.totalCostUsd;
      else if (statSortCol === "translations") cmp = a.translationCount - b.translationCount;
      return statSortDir === "asc" ? cmp : -cmp;
    });
    const labels = sorted.map((s) => `${s.provider}/${s.model.split("/").pop()}`);
    return { stats: sorted, labels };
  }, [modelStats, statSortCol, statSortDir]);

  const latencyChartOption = useMemo(() => {
    if (!chartData) return null;
    return {
      color: ["#3B82F6", "#10B981"],
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { data: ["Avg (ms)", "P95 (ms)"], textStyle: { fontSize: 10 }, top: 4 },
      grid: { left: 8, right: 16, bottom: 8, top: 32, containLabel: true },
      xAxis: { type: "value", name: "ms", nameTextStyle: { fontSize: 9 }, axisLabel: { fontSize: 9 } },
      yAxis: {
        type: "category",
        data: chartData.labels,
        axisLabel: { fontSize: 9, width: 120, overflow: "truncate" },
        inverse: true,
      },
      series: [
        {
          name: "Avg (ms)",
          type: "bar",
          data: chartData.stats.map((s) => s.avgLatencyMs),
          barMaxWidth: 14,
        },
        {
          name: "P95 (ms)",
          type: "bar",
          data: chartData.stats.map((s) => s.p95LatencyMs),
          barMaxWidth: 14,
          itemStyle: { opacity: 0.5 },
        },
      ],
    };
  }, [chartData]);

  const costChartOption = useMemo(() => {
    if (!chartData) return null;
    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: { name: string; value: number }[]) =>
          params.map((p) => `${p.name}: $${p.value.toFixed(6)}`).join("<br/>"),
      },
      grid: { left: 8, right: 64, bottom: 8, top: 8, containLabel: true },
      yAxis: {
        type: "category",
        data: chartData.labels,
        axisLabel: { fontSize: 9, width: 120, overflow: "truncate" },
        inverse: true,
      },
      xAxis: { type: "value", axisLabel: { formatter: (v: number) => `$${v.toFixed(5)}`, fontSize: 8 } },
      series: [{
        type: "bar",
        data: chartData.stats.map((s, i) => ({
          value: s.avgCostUsd,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
        barMaxWidth: 14,
        label: { show: true, position: "right", formatter: (p: { value: number }) => `$${p.value.toFixed(5)}`, fontSize: 8 },
      }],
    };
  }, [chartData]);

  const callCountChartOption = useMemo(() => {
    if (!chartData) return null;
    const total = chartData.stats.reduce((sum, s) => sum + s.callCount, 0);
    return {
      tooltip: { trigger: "item", formatter: "{b}: {c} calls ({d}%)" },
      legend: { orient: "vertical", right: 0, top: "center", textStyle: { fontSize: 10 } },
      series: [{
        type: "pie",
        radius: ["40%", "70%"],
        center: ["38%", "50%"],
        data: chartData.stats.map((s, i) => ({
          name: chartData.labels[i],
          value: s.callCount,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 11, fontWeight: "bold" } },
      }],
      graphic: [{
        type: "text",
        left: "34%",
        top: "center",
        style: { text: `${total}\ncalls`, textAlign: "center", fontSize: 12, fontWeight: "bold", fill: "#374151" },
      }],
    };
  }, [chartData]);

  const tokenChartOption = useMemo(() => {
    if (!chartData) return null;
    return {
      color: ["#3B82F6", "#10B981"],
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { data: ["Tokens in", "Tokens out"], textStyle: { fontSize: 10 }, top: 4 },
      grid: { left: 8, right: 16, bottom: 8, top: 32, containLabel: true },
      xAxis: { type: "value", name: "tokens", nameTextStyle: { fontSize: 9 }, axisLabel: { fontSize: 9 } },
      yAxis: {
        type: "category",
        data: chartData.labels,
        axisLabel: { fontSize: 9, width: 120, overflow: "truncate" },
        inverse: true,
      },
      series: [
        {
          name: "Tokens in",
          type: "bar",
          stack: "tokens",
          data: chartData.stats.map((s) => s.avgTokensIn),
          barMaxWidth: 14,
          itemStyle: { opacity: 0.6 },
        },
        {
          name: "Tokens out",
          type: "bar",
          stack: "tokens",
          data: chartData.stats.map((s) => s.avgTokensOut),
          barMaxWidth: 14,
        },
      ],
    };
  }, [chartData]);

  const sharesSparklineOption = useMemo(() => {
    if (!shareAnalytics) return null;
    const days = shareAnalytics.dayBuckets;
    return {
      tooltip: { trigger: "axis", formatter: (p: { dataIndex: number; value: number }[]) => `${30 - p[0].dataIndex}d ago: ${p[0].value} shares` },
      grid: { left: 0, right: 0, top: 4, bottom: 0 },
      xAxis: { type: "category", show: false, data: days.map((_, i) => i) },
      yAxis: { type: "value", show: false },
      series: [{
        type: "line",
        data: days,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#F58634", width: 2 },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(245,134,52,0.3)" }, { offset: 1, color: "rgba(245,134,52,0)" }] } },
      }],
    };
  }, [shareAnalytics]);

  return (
    <div className="space-y-6 mt-2">
      <h2 className="text-xl font-display font-semibold text-neutral-800">Admin</h2>

      {/* Usage Stats */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Usage Stats</h3>
        {stats === undefined ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Total users" value={stats.totalUsers} />
              <Stat label="Pro subscribers" value={stats.proSubscribers} />
              <Stat label="One-time purchases" value={stats.oneTimePurchases} />
              <Stat label="AI chat responses" value={stats.totalAiMessages} />
              <Stat label="Blurbs generated" value={stats.totalBlurbs} />
              <StatDecimal label="Avg saves / free user" value={stats.avgSavesPerFreeUser} />
            </div>
            {stats.totalUsers === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                ⚠ 0 users in Convex — the Clerk webhook may not be configured. Set endpoint to{" "}
                <span className="font-mono">https://simplesavings.app/api/webhooks/clerk</span> in the Clerk dashboard.
              </p>
            )}
            <p className="text-xs text-neutral-600 mt-3">
              Conversation AI spend: ${(stats.totalAiCostCents / 100).toFixed(2)} · Blurb spend: ${stats.totalBlurbCostUsd.toFixed(4)}
            </p>
          </>
        )}
      </div>

      {/* Model Configuration */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-1">Model Configuration</h3>
        <p className="text-xs text-neutral-600 mb-4">
          Blurb: <span className="font-mono">{blurbModel ?? "not set"}</span> · Conversation: <span className="font-mono">{convoModel ?? "not set"}</span>
        </p>
        <AdminModelMatrix
          activeBlurb={typeof blurbModel === "string" ? blurbModel : null}
          activeConvo={typeof convoModel === "string" ? convoModel : null}
          onSetBlurb={async (modelId) => {
            await setConfig({ key: "defaultBlurbModel", value: `openrouter:${modelId}` });
          }}
          onSetConvo={async (modelId) => {
            await setConfig({ key: "defaultConversationModel", value: `openrouter:${modelId}` });
          }}
        />
      </div>

      {/* Payments & Testing */}
      <div className={`rounded-2xl border p-5 ${isTestModeOn ? "bg-amber-50 border-amber-300" : "bg-white border-neutral-200"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700">Payments & Testing</h3>
            <p className="text-xs text-neutral-600 mt-0.5">Configure pricing, credit limits, and test the paid UX without touching Stripe.</p>
          </div>
          {isTestModeOn && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-semibold">
              TEST MODE: {testModeValue === "pro" ? "PRO" : "PRO SAMPLE"}
            </span>
          )}
        </div>

        {/* Pricing display */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-neutral-600 mb-1">Pro Sample display price</p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-neutral-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={proSamplePriceRaw ?? "4.99"}
                value={proSamplePriceInput}
                onChange={(e) => setProSamplePriceInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-base/30"
              />
              <button
                onClick={async () => {
                  if (!proSamplePriceInput) return;
                  await setConfig({ key: "proSamplePriceDisplay", value: proSamplePriceInput });
                  setProSamplePriceInput("");
                }}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-primary-base text-white text-xs font-medium hover:opacity-90"
              >Save</button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Display only — update Stripe price separately.</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-600 mb-1">Pro display price (per month)</p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-neutral-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={proPriceRaw ?? "9.99"}
                value={proPriceInput}
                onChange={(e) => setProPriceInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-base/30"
              />
              <button
                onClick={async () => {
                  if (!proPriceInput) return;
                  await setConfig({ key: "proPriceDisplay", value: proPriceInput });
                  setProPriceInput("");
                }}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-primary-base text-white text-xs font-medium hover:opacity-90"
              >Save</button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Display only — update Stripe price separately.</p>
          </div>
        </div>

        {/* Pro Sample credit cap */}
        <div className="mt-3 pt-3 border-t border-neutral-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-700">Pro Sample credit cap</p>
              <p className="text-xs text-neutral-600 mt-0.5">
                How much AI spend a Pro Sample purchase grants. Currently <span className="font-semibold">${(creditLimitCents / 100).toFixed(2)}</span>.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-sm text-neutral-500">$</span>
              <input
                type="number"
                step="0.25"
                min="0.01"
                placeholder={(creditLimitCents / 100).toFixed(2)}
                value={creditLimitInput}
                onChange={(e) => setCreditLimitInput(e.target.value)}
                className="w-20 px-2 py-1.5 rounded-lg border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-base/30"
              />
              <button
                onClick={async () => {
                  const dollars = parseFloat(creditLimitInput);
                  if (!dollars || dollars <= 0) return;
                  const cents = Math.round(dollars * 100);
                  await setConfig({ key: "proSampleCreditLimitCents", value: String(cents) });
                  setCreditLimitInput("");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-primary-base text-white text-xs font-medium hover:opacity-90"
              >Save</button>
            </div>
          </div>
        </div>

        {/* Payment test mode */}
        <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-700">Payment test mode</p>
            <p className="text-xs text-neutral-600 mt-0.5">
              {testModeValue === "off" && "Checkout goes through Stripe — no bypass."}
              {testModeValue === "sample" && `Checkout instantly grants $${(creditLimitCents / 100).toFixed(2)} sample credits — no Stripe, no charge.`}
              {testModeValue === "pro" && "Checkout instantly grants full Pro access — no Stripe, no charge."}
            </p>
          </div>
          <select
            value={testModeValue}
            onChange={(e) => handleTestModeChange(e.target.value)}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-base/30"
          >
            <option value="off">Off</option>
            <option value="sample">Pro Sample</option>
            <option value="pro">Pro</option>
          </select>
        </div>

        {/* Credit balance — visible whenever the account has credits or is in sample test mode */}
        {creditBalance !== undefined && (creditBalance === null ? testModeValue === "sample" : creditBalance.granted > 0) && (
          <div className={`mt-3 pt-3 border-t ${isTestModeOn ? "border-amber-200" : "border-neutral-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-700">Test account credit balance</p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {creditBalance === null
                    ? "No credits yet — trigger checkout once to seed sample funds."
                    : `${creditBalance.isPro ? "Pro plan · " : ""}credit pool for this account`}
                </p>
              </div>
              {creditBalance !== null && (
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                    ${(Math.max(0, creditBalance.granted - creditBalance.used) / 100).toFixed(4)} remaining
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5 tabular-nums">
                    ${(creditBalance.granted / 100).toFixed(2)} granted · ${(creditBalance.used / 100).toFixed(4)} used
                    {creditBalance.granted > 0 && (
                      <span className="ml-1 text-neutral-500">
                        ({Math.min(100, Math.round((creditBalance.used / creditBalance.granted) * 100))}% consumed)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Performance Analytics */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-1">Blurb Performance Analytics</h3>
        <p className="text-xs text-neutral-600 mb-5">
          Real telemetry from every blurb call — last 5,000 requests. Use this to pick the best model for cost, speed, and token efficiency.
        </p>

        {modelStats === undefined && (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-48 bg-neutral-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {modelStats !== undefined && modelStats.length === 0 && (
          <div className="py-12 text-center text-neutral-600 text-sm">
            No blurb calls logged yet. Generate a few blurbs to start seeing performance data here.
          </div>
        )}

        {chartData && (
          <div className="space-y-8">
            {/* Summary table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-100">
                    {(
                      [
                        ["model",        "Model",        "text-left"],
                        ["calls",        "Calls",        "text-right"],
                        ["avgLatency",   "Avg latency",  "text-right"],
                        ["p95Latency",   "P95 latency",  "text-right"],
                        ["avgCost",      "Avg cost",     "text-right"],
                        ["totalCost",    "Total cost",   "text-right"],
                        ["translations", "Translations", "text-right"],
                      ] as [StatSortCol, string, string][]
                    ).map(([col, label, align]) => (
                      <th
                        key={col}
                        className={`${align} pb-2 text-neutral-500 font-medium cursor-pointer select-none hover:text-neutral-800 transition-colors`}
                        onClick={() => handleStatSort(col)}
                      >
                        {label}{statSortCol === col ? (statSortDir === "asc" ? " ↑" : " ↓") : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.stats.map((s, i) => (
                    <tr key={`${s.provider}:${s.model}`} className="border-b border-neutral-50 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="inline-block w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="font-mono text-neutral-700">{s.provider}/{s.model.split("/").pop()}</span>
                      </td>
                      <td className="text-right py-2 text-neutral-600 tabular-nums">{s.callCount.toLocaleString()}</td>
                      <td className="text-right py-2 text-neutral-600 tabular-nums">{s.avgLatencyMs.toLocaleString()}ms</td>
                      <td className="text-right py-2 text-neutral-600 tabular-nums">{s.p95LatencyMs.toLocaleString()}ms</td>
                      <td className="text-right py-2 text-neutral-600 tabular-nums font-mono">${s.avgCostUsd.toFixed(6)}</td>
                      <td className="text-right py-2 text-neutral-600 tabular-nums font-mono">${s.totalCostUsd.toFixed(4)}</td>
                      <td className="text-right py-2 text-neutral-600 tabular-nums">{s.translationCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-2">Latency by model</p>
                {latencyChartOption && (
                  <ReactECharts option={latencyChartOption} style={{ height: 220 }} />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-2">Avg cost per call</p>
                {costChartOption && (
                  <ReactECharts option={costChartOption} style={{ height: 220 }} />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-2">Call distribution</p>
                {callCountChartOption && (
                  <ReactECharts option={callCountChartOption} style={{ height: 220 }} />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-2">Token usage (in + out)</p>
                {tokenChartOption && (
                  <ReactECharts option={tokenChartOption} style={{ height: 220 }} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share Analytics */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-1">Share Analytics</h3>
        <p className="text-xs text-neutral-600 mb-4">Who&apos;s sharing, how often, and whether it&apos;s driving new sign-ups.</p>

        {shareAnalytics === undefined && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />)}
          </div>
        )}

        {shareAnalytics !== undefined && (
          <div className="space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total shares" value={shareAnalytics.totalShares} />
              <Stat label="Unique senders" value={shareAnalytics.uniqueSenders} />
              <Stat label="Repeat sharers" value={shareAnalytics.repeatSharers} />
              <Stat label="Recipients → users" value={shareAnalytics.convertedFromShare} />
            </div>

            {/* Sparkline */}
            {shareAnalytics.totalShares > 0 && sharesSparklineOption && (
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-1">Shares last 30 days</p>
                <ReactECharts option={sharesSparklineOption} style={{ height: 80 }} />
              </div>
            )}

            {/* Top sharers */}
            {shareAnalytics.topSharers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-2">Top sharers</p>
                <div className="space-y-1">
                  {shareAnalytics.topSharers.map((s) => (
                    <div key={s.email} className="flex items-center gap-2">
                      <div
                        className="h-1.5 rounded-full bg-primary-base"
                        style={{ width: `${Math.round((s.count / (shareAnalytics.topSharers[0]?.count ?? 1)) * 100)}%`, minWidth: 4, maxWidth: "60%" }}
                      />
                      <span className="text-xs text-neutral-600 font-mono truncate">{s.email}</span>
                      <span className="text-xs text-neutral-600 shrink-0">×{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share activity log */}
            {shareAnalytics.recentShares.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-neutral-600 mb-2">Recent shares (last 100)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="text-left pb-2 text-neutral-500 font-medium">From</th>
                        <th className="text-left pb-2 text-neutral-500 font-medium">To</th>
                        <th className="text-right pb-2 text-neutral-500 font-medium">Signed up?</th>
                        <th className="text-right pb-2 text-neutral-500 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shareAnalytics.recentShares.map((s, i) => (
                        <tr key={i} className="border-b border-neutral-50 last:border-0">
                          <td className="py-1.5 pr-3 font-mono text-neutral-700 truncate max-w-[140px]">{s.sharedBy || "—"}</td>
                          <td className="py-1.5 pr-3 font-mono text-neutral-700 truncate max-w-[140px]">{s.sharedWith || "—"}</td>
                          <td className="py-1.5 text-right">
                            {s.recipientIsUser
                              ? <span className="text-green-500 font-medium">✓ yes</span>
                              : <span className="text-neutral-500">—</span>}
                          </td>
                          <td className="py-1.5 text-right text-neutral-600 tabular-nums whitespace-nowrap">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-600 text-center py-6">No shares recorded yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-neutral-50 rounded-xl p-3">
      <p className="text-2xl font-bold text-neutral-900">{value.toLocaleString()}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}

function StatDecimal({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-neutral-50 rounded-xl p-3">
      <p className="text-2xl font-bold text-neutral-900">{value.toFixed(1)}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}
