"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import ProviderPicker, { PROVIDERS } from "@/components/ProviderPicker";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const CHART_COLORS = ["#F58634", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B"];

export default function AdminPanel() {
  const stats = useQuery(api.users.getAdminStats, {});
  const shareAnalytics = useQuery(api.shares.getShareAnalytics, {});
  const blurbModel = useQuery(api.appConfig.getConfig, { key: "defaultBlurbModel" });
  const convoModel = useQuery(api.appConfig.getConfig, { key: "defaultConversationModel" });
  const paymentTestMode = useQuery(api.appConfig.getConfig, { key: "paymentTestMode" });
  const setConfig = useMutation(api.appConfig.setConfig);
  const modelStats = useQuery(api.blurbLogs.getModelStats, {});

  const isTestModeOn = paymentTestMode === "true";
  const handleToggleTestMode = async () => {
    await setConfig({ key: "paymentTestMode", value: isTestModeOn ? "false" : "true" });
  };

  // Model config state
  const [blurbProvider, setBlurbProvider] = useState("anthropic");
  const [blurbModelId, setBlurbModelId] = useState("claude-haiku-4-5-20251001");
  const [convoProvider, setConvoProvider] = useState("anthropic");
  const [convoModelId, setConvoModelId] = useState("claude-sonnet-4-6");
  const [configSaved, setConfigSaved] = useState(false);

  // Sync dropdowns from Convex when config loads
  useEffect(() => {
    if (blurbModel && typeof blurbModel === "string" && blurbModel.includes(":")) {
      const [p, m] = blurbModel.split(":", 2);
      setBlurbProvider(p);
      setBlurbModelId(m);
    }
  }, [blurbModel]);

  useEffect(() => {
    if (convoModel && typeof convoModel === "string" && convoModel.includes(":")) {
      const [p, m] = convoModel.split(":", 2);
      setConvoProvider(p);
      setConvoModelId(m);
    }
  }, [convoModel]);

  const handleSaveConfig = async () => {
    await setConfig({ key: "defaultBlurbModel", value: `${blurbProvider}:${blurbModelId}` });
    await setConfig({ key: "defaultConversationModel", value: `${convoProvider}:${convoModelId}` });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  // Build chart data from model stats
  const chartData = useMemo(() => {
    if (!modelStats || modelStats.length === 0) return null;
    const labels = modelStats.map((s) => `${s.provider}/${s.model.split("/").pop()}`);
    return { stats: modelStats, labels };
  }, [modelStats]);

  const latencyChartOption = useMemo(() => {
    if (!chartData) return null;
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { data: ["Avg latency (ms)", "P95 latency (ms)"], textStyle: { fontSize: 11 } },
      grid: { left: 16, right: 16, bottom: 60, top: 40, containLabel: true },
      xAxis: {
        type: "category",
        data: chartData.labels,
        axisLabel: { rotate: 30, fontSize: 10, interval: 0 },
      },
      yAxis: { type: "value", name: "ms", nameTextStyle: { fontSize: 10 } },
      series: [
        {
          name: "Avg latency (ms)",
          type: "bar",
          data: chartData.stats.map((s, i) => ({ value: s.avgLatencyMs, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } })),
          barMaxWidth: 40,
        },
        {
          name: "P95 latency (ms)",
          type: "bar",
          data: chartData.stats.map((s, i) => ({ value: s.p95LatencyMs, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length], opacity: 0.45 } })),
          barMaxWidth: 40,
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
      grid: { left: 16, right: 16, bottom: 60, top: 24, containLabel: true },
      xAxis: {
        type: "category",
        data: chartData.labels,
        axisLabel: { rotate: 30, fontSize: 10, interval: 0 },
      },
      yAxis: { type: "value", name: "$/call", nameTextStyle: { fontSize: 10 },
        axisLabel: { formatter: (v: number) => `$${v.toFixed(5)}` } },
      series: [{
        type: "bar",
        data: chartData.stats.map((s, i) => ({
          value: s.avgCostUsd,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
        barMaxWidth: 40,
        label: { show: true, position: "top", formatter: (p: { value: number }) => `$${p.value.toFixed(5)}`, fontSize: 9 },
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
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { data: ["Avg tokens in", "Avg tokens out"], textStyle: { fontSize: 11 } },
      grid: { left: 16, right: 16, bottom: 60, top: 40, containLabel: true },
      xAxis: {
        type: "category",
        data: chartData.labels,
        axisLabel: { rotate: 30, fontSize: 10, interval: 0 },
      },
      yAxis: { type: "value", name: "tokens", nameTextStyle: { fontSize: 10 } },
      series: [
        {
          name: "Avg tokens in",
          type: "bar",
          stack: "tokens",
          data: chartData.stats.map((s, i) => ({ value: s.avgTokensIn, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length], opacity: 0.5 } })),
          barMaxWidth: 40,
        },
        {
          name: "Avg tokens out",
          type: "bar",
          stack: "tokens",
          data: chartData.stats.map((s, i) => ({ value: s.avgTokensOut, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } })),
          barMaxWidth: 40,
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total users" value={stats.totalUsers} />
            <Stat label="Pro subscribers" value={stats.proSubscribers} />
            <Stat label="One-time purchases" value={stats.oneTimePurchases} />
            <Stat label="AI responses" value={stats.totalAiMessages} />
          </div>
        )}
        {stats && (
          <p className="text-xs text-neutral-400 mt-3">
            Total AI spend: ${(stats.totalAiCostCents / 100).toFixed(2)}
          </p>
        )}
      </div>

      {/* Model Configuration */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-1">Model Configuration</h3>
        <p className="text-xs text-neutral-400 mb-4">
          Current saved — Blurb: <span className="font-mono">{blurbModel ?? "not set"}</span> · Conversation: <span className="font-mono">{convoModel ?? "not set"}</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Default blurb model (free, high-volume)</label>
            <ProviderPicker
              provider={blurbProvider}
              model={blurbModelId}
              onChange={(p, m) => { setBlurbProvider(p); setBlurbModelId(m); }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Default conversation model (paid)</label>
            <ProviderPicker
              provider={convoProvider}
              model={convoModelId}
              onChange={(p, m) => { setConvoProvider(p); setConvoModelId(m); }}
            />
          </div>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-primary-base text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            {configSaved ? "Saved ✓" : "Save defaults"}
          </button>
        </div>
      </div>

      {/* Developer Tools */}
      <div className={`rounded-2xl border p-5 ${isTestModeOn ? "bg-amber-50 border-amber-300" : "bg-white border-neutral-200"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700">Developer Tools</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Test the paid UX without touching Stripe.</p>
          </div>
          {isTestModeOn && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-semibold">TEST MODE ON</span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-700">Payment test mode</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isTestModeOn
                ? "Clicking a payment button will instantly grant access — no Stripe, no charge."
                : "When enabled, the checkout flow grants credits/Pro immediately without Stripe."}
            </p>
          </div>
          <button
            onClick={handleToggleTestMode}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              isTestModeOn ? "bg-amber-400" : "bg-neutral-200"
            }`}
            role="switch"
            aria-checked={isTestModeOn}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                isTestModeOn ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Performance Analytics */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-1">Blurb Performance Analytics</h3>
        <p className="text-xs text-neutral-400 mb-5">
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
          <div className="py-12 text-center text-neutral-400 text-sm">
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
                    <th className="text-left pb-2 text-neutral-500 font-medium">Model</th>
                    <th className="text-right pb-2 text-neutral-500 font-medium">Calls</th>
                    <th className="text-right pb-2 text-neutral-500 font-medium">Avg latency</th>
                    <th className="text-right pb-2 text-neutral-500 font-medium">P95 latency</th>
                    <th className="text-right pb-2 text-neutral-500 font-medium">Avg cost</th>
                    <th className="text-right pb-2 text-neutral-500 font-medium">Total cost</th>
                    <th className="text-right pb-2 text-neutral-500 font-medium">Translations</th>
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
        <p className="text-xs text-neutral-400 mb-4">Who&apos;s sharing, how often, and whether it&apos;s driving new sign-ups.</p>

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
                      <span className="text-xs text-neutral-400 shrink-0">×{s.count}</span>
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
                              : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="py-1.5 text-right text-neutral-400 tabular-nums whitespace-nowrap">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400 text-center py-6">No shares recorded yet.</p>
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
