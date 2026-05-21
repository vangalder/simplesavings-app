"use client";

import { useState, useEffect, useMemo } from "react";

type DynamicModel = {
  id: string;
  name: string;
  tier: "latest" | "penultimate" | "value";
  pricePerMTok: number;
};

const PROVIDER_ORDER  = ["openai/", "anthropic/", "google/", "x-ai/"] as const;
const PROVIDER_LABELS: Record<string, string> = {
  "openai/":    "OpenAI",
  "anthropic/": "Anthropic",
  "google/":    "Google",
  "x-ai/":      "xAI / Grok",
};

const TIER_LABEL: Record<DynamicModel["tier"], string> = {
  latest:      "Latest Gen",
  penultimate: "Penultimate Gen",
  value:       "Value Tier",
};

const TIER_BADGE: Record<DynamicModel["tier"], string> = {
  latest:      "bg-emerald-50 text-emerald-700",
  penultimate: "bg-sky-50 text-sky-700",
  value:       "bg-amber-50 text-amber-700",
};

const TIER_ORDER: Record<DynamicModel["tier"], number> = {
  latest: 0, penultimate: 1, value: 2,
};

const HIGH_COST_THRESHOLD = 15.0;

function parseActiveId(stored: string | null): string {
  if (!stored) return "";
  const idx = stored.indexOf(":");
  return idx !== -1 ? stored.slice(idx + 1) : stored;
}

function formatCost(price: number): string {
  if (!isFinite(price) || price <= 0) return "—";
  if (price < 0.01) return "<$0.01";
  if (price < 10)   return `$${price.toFixed(2)}`;
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

  const activeBlurbId = parseActiveId(activeBlurb);
  const activeConvoId = parseActiveId(activeConvo);

  const grouped = useMemo(() =>
    PROVIDER_ORDER
      .map((prefix) => ({
        prefix,
        label: PROVIDER_LABELS[prefix],
        models: models
          .filter((m) => m.id.startsWith(prefix))
          .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]),
      }))
      .filter((g) => g.models.length > 0),
  [models]);

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
      {/* Data source status */}
      <p className={`text-[10px] ${source === "live" ? "text-neutral-400" : "text-amber-600 font-medium"}`}>
        {source === "live"
          ? `Live from OpenRouter · ${models.length} models · refreshes on every page load`
          : "⚠️ OpenRouter unreachable — showing static fallback configuration"}
      </p>

      {/* Provider groups */}
      {grouped.map((group) => (
        <div key={group.prefix} className="rounded-xl border border-neutral-200 overflow-hidden">
          {/* Provider section header */}
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border-b border-neutral-200">
            <span className="text-xs font-semibold text-neutral-700">{group.label}</span>
            <span className="text-[10px] text-neutral-400">{group.models.length} models</span>
          </div>

          {/* Scrollable table wrapper for narrow viewports */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[580px]">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left   px-4 py-2 font-medium text-neutral-400 w-[34%]">Model / Identifier</th>
                  <th className="text-left   px-3 py-2 font-medium text-neutral-400 w-[17%]">Classification</th>
                  <th className="text-right  px-3 py-2 font-medium text-neutral-400 w-[16%]">Blended Cost / 1M</th>
                  <th className="text-right  px-4 py-2 font-medium text-neutral-400 w-[33%]">Allocation</th>
                </tr>
              </thead>
              <tbody>
                {group.models.map((m) => {
                  const isBlurbActive  = m.id === activeBlurbId;
                  const isConvoActive  = m.id === activeConvoId;
                  const isAnyActive    = isBlurbActive || isConvoActive;
                  const isSavingBlurb  = pendingBlurb === m.id;
                  const isSavingConvo  = pendingConvo === m.id;
                  const isHighCost     = m.pricePerMTok > HIGH_COST_THRESHOLD;

                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-neutral-50 last:border-0 transition-colors ${
                        isAnyActive ? "bg-primary-base/[0.05]" : "hover:bg-neutral-50/70"
                      }`}
                    >
                      {/* Model name + raw ID — active rows get a left accent stripe */}
                      <td
                        className={`px-4 py-2.5 ${
                          isAnyActive ? "border-l-2 border-primary-base" : ""
                        }`}
                      >
                        <p className="font-medium text-neutral-800 leading-tight">{m.name}</p>
                        <p
                          className="font-mono text-neutral-400 truncate mt-0.5"
                          style={{ fontSize: "10px" }}
                        >
                          {m.id}
                        </p>
                      </td>

                      {/* Tier badge */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${TIER_BADGE[m.tier]}`}
                        >
                          {TIER_LABEL[m.tier]}
                        </span>
                      </td>

                      {/* Cost — ⚠️ signals budget threshold breach, no decorative emoji elsewhere */}
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <span className={isHighCost ? "text-amber-600 font-semibold" : "text-neutral-700"}>
                          {formatCost(m.pricePerMTok)}
                        </span>
                        {isHighCost && <span className="ml-0.5 text-xs">⚠️</span>}
                      </td>

                      {/* Allocation buttons */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Blurb allocation */}
                          <button
                            onClick={() =>
                              !isBlurbActive && !isSavingBlurb && handleSetBlurb(m.id)
                            }
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

                          {/* Conversation allocation */}
                          <button
                            onClick={() =>
                              !isConvoActive && !isSavingConvo && handleSetConvo(m.id)
                            }
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
      ))}
    </div>
  );
}
