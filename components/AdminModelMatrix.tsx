"use client";

import { useState, useEffect, useMemo } from "react";

type DynamicModel = {
  id: string;
  name: string;
  tier: "latest" | "penultimate" | "value";
  pricePerMTok: number;
};

const PROVIDER_ORDER = ["openai/", "anthropic/", "google/", "x-ai/", "deepseek/"] as const;
type ProviderPrefix = typeof PROVIDER_ORDER[number];

const PROVIDER_LABELS: Record<ProviderPrefix, string> = {
  "openai/":    "OpenAI",
  "anthropic/": "Anthropic",
  "google/":    "Google",
  "x-ai/":      "xAI",
  "deepseek/":  "DeepSeek",
};

const HIGH_COST_THRESHOLD = 15.0;

type Profile = { label: string; strengths: string; caveats: string };

function getProfile(id: string): Profile {
  const lc = id.toLowerCase();
  if (
    /\/o\d/.test(lc) || lc.includes("-r1") || lc.includes("/o3") || lc.includes("/o4") ||
    lc.includes("reasoning") || lc.includes("think")
  ) {
    return {
      label: "High-Reasoning",
      strengths: "✓ Elite Math & Chronological Consistency",
      caveats: "⚠️ Latency / Processing Delay",
    };
  }
  if (["flash", "mini", "lite", "nano", "haiku", "scout", "small", "fast", "turbo"].some((k) => lc.includes(k))) {
    return {
      label: "Fast Efficiency",
      strengths: "✓ Sub-second Latency / Low-cost Copy",
      caveats: "⚠️ Timeline Hallucination Risk",
    };
  }
  return {
    label: "General Flagship",
    strengths: "✓ High Context / Balanced Strategy Copilot",
    caveats: "",
  };
}

function parseActiveId(stored: string | null): string {
  if (!stored) return "";
  const idx = stored.indexOf(":");
  return idx !== -1 ? stored.slice(idx + 1) : stored;
}

function getDefaultTab(activeConvoId: string): ProviderPrefix {
  for (const p of PROVIDER_ORDER) {
    if (activeConvoId.startsWith(p)) return p;
  }
  return "openai/";
}

function formatCost(price: number): string {
  if (!isFinite(price) || price <= 0) return "—";
  if (price < 0.01) return "<$0.01";
  return `$${price.toFixed(2)}`;
}

type Props = {
  activeBlurb: string | null;
  activeConvo: string | null;
  onSetBlurb: (modelId: string) => Promise<void>;
  onSetConvo: (modelId: string) => Promise<void>;
};

export default function AdminModelMatrix({
  activeBlurb,
  activeConvo,
  onSetBlurb,
  onSetConvo,
}: Props) {
  const [models,       setModels]       = useState<DynamicModel[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [source,       setSource]       = useState<"live" | "fallback" | null>(null);
  const [pendingBlurb, setPendingBlurb] = useState<string | null>(null);
  const [pendingConvo, setPendingConvo] = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState<ProviderPrefix>(() =>
    getDefaultTab(parseActiveId(activeConvo ?? ""))
  );

  const activeConvoId = parseActiveId(activeConvo);
  const activeBlurbId = parseActiveId(activeBlurb);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/openrouter-models")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setModels(data.models ?? []);
        setSource(data.source ?? "live");
      })
      .catch(() => { if (!cancelled) setSource("fallback"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const tabModels = useMemo(() =>
    models
      .filter((m) => m.id.startsWith(activeTab))
      .sort((a, b) => b.pricePerMTok - a.pricePerMTok),
    [models, activeTab]
  );

  const providerCounts = useMemo(() => {
    const counts: Partial<Record<ProviderPrefix, number>> = {};
    for (const p of PROVIDER_ORDER) {
      counts[p] = models.filter((m) => m.id.startsWith(p)).length;
    }
    return counts;
  }, [models]);

  async function handleSetBlurb(modelId: string) {
    setPendingBlurb(modelId);
    try   { await onSetBlurb(modelId); }
    finally { setPendingBlurb(null); }
  }

  async function handleSetConvo(modelId: string) {
    setPendingConvo(modelId);
    try   { await onSetConvo(modelId); }
    finally { setPendingConvo(null); }
  }

  if (loading) {
    return (
      <div className="space-y-1.5 py-1">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-lg bg-neutral-100 animate-pulse"
            style={{ opacity: 1 - i * 0.08 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Data source note */}
      <p className={`text-[10px] ${source === "live" ? "text-neutral-400" : "text-amber-600 font-medium"}`}>
        {source === "live"
          ? `Live from OpenRouter · ${models.length} models · refreshes on every page load`
          : "⚠️ OpenRouter unreachable — showing static fallback configuration"}
      </p>

      {/* Provider tab bar */}
      <div className="flex gap-0.5 border-b border-neutral-200">
        {PROVIDER_ORDER.map((prefix) => {
          const count = providerCounts[prefix] ?? 0;
          const isActive = activeTab === prefix;
          return (
            <button
              key={prefix}
              onClick={() => setActiveTab(prefix)}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-white border border-b-white border-neutral-200 text-neutral-900 -mb-px z-10"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {PROVIDER_LABELS[prefix]}
              {count > 0 && (
                <span className="ml-1.5 text-[10px] text-neutral-400">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Model table for active tab */}
      {tabModels.length === 0 ? (
        <p className="text-xs text-neutral-400 py-3">No models available for this provider.</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[620px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="text-left px-4 py-2 font-medium text-neutral-400 w-[26%]">Model / Identifier</th>
                  <th className="text-left px-3 py-2 font-medium text-neutral-400 w-[40%]">Operational Profile &amp; Known Caveats</th>
                  <th className="text-right px-3 py-2 font-medium text-neutral-400 w-[12%]">Cost / 1M</th>
                  <th className="text-right px-4 py-2 font-medium text-neutral-400 w-[22%]">Allocation</th>
                </tr>
              </thead>
              <tbody>
                {tabModels.map((m) => {
                  const isBlurbActive = m.id === activeBlurbId;
                  const isConvoActive = m.id === activeConvoId;
                  const isAnyActive   = isBlurbActive || isConvoActive;
                  const isSavingBlurb = pendingBlurb === m.id;
                  const isSavingConvo = pendingConvo === m.id;
                  const isHighCost    = m.pricePerMTok > HIGH_COST_THRESHOLD;
                  const profile       = getProfile(m.id);

                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-neutral-50 last:border-0 transition-colors ${
                        isAnyActive ? "bg-primary-base/[0.05]" : "hover:bg-neutral-50/70"
                      }`}
                    >
                      {/* Model name + ID */}
                      <td className={`px-4 py-2.5 ${isAnyActive ? "border-l-2 border-primary-base" : ""}`}>
                        <p className="font-medium text-neutral-800 leading-tight">{m.name}</p>
                        <p className="font-mono text-neutral-400 truncate mt-0.5" style={{ fontSize: "10px" }}>
                          {m.id}
                        </p>
                      </td>

                      {/* Operational profile */}
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-neutral-700 leading-tight" style={{ fontSize: "11px" }}>
                          {profile.label}
                        </p>
                        <p className="text-neutral-500 leading-tight mt-0.5" style={{ fontSize: "10px" }}>
                          {profile.strengths}
                          {profile.caveats && (
                            <span className="text-neutral-400">{"  |  "}{profile.caveats}</span>
                          )}
                        </p>
                      </td>

                      {/* Cost */}
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <span className={isHighCost ? "text-amber-600 font-semibold" : "text-neutral-700"}>
                          {formatCost(m.pricePerMTok)}
                        </span>
                        {isHighCost && <span className="ml-0.5 text-xs">⚠️</span>}
                      </td>

                      {/* Allocation buttons */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => !isBlurbActive && !isSavingBlurb && handleSetBlurb(m.id)}
                            disabled={isBlurbActive || isSavingBlurb}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                              isBlurbActive
                                ? "bg-primary-base text-white cursor-default"
                                : isSavingBlurb
                                ? "border border-neutral-200 text-neutral-400 opacity-50 cursor-wait"
                                : "border border-neutral-200 text-neutral-500 hover:border-primary-base/60 hover:text-primary-base cursor-pointer"
                            }`}
                          >
                            {isBlurbActive ? "Active Blurb ✓" : isSavingBlurb ? "Saving…" : "Set Blurb"}
                          </button>

                          <button
                            onClick={() => !isConvoActive && !isSavingConvo && handleSetConvo(m.id)}
                            disabled={isConvoActive || isSavingConvo}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                              isConvoActive
                                ? "bg-blue-600 text-white cursor-default"
                                : isSavingConvo
                                ? "border border-neutral-200 text-neutral-400 opacity-50 cursor-wait"
                                : "border border-neutral-200 text-neutral-500 hover:border-blue-400/60 hover:text-blue-600 cursor-pointer"
                            }`}
                          >
                            {isConvoActive ? "Active Conv ✓" : isSavingConvo ? "Saving…" : "Set Conv"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
