"use client";

import { useState, useEffect } from "react";

type DynamicModel = {
  id: string;
  name: string;
  tier: "latest" | "penultimate" | "value";
  pricePerMTok: number;
};

const TIER_LABEL: Record<DynamicModel["tier"], string> = {
  latest:      "Dynamic Latest Gen",
  penultimate: "Dynamic Penultimate Gen",
  value:       "Dynamic Value Tier",
};

const OPTGROUP_LABEL: Record<DynamicModel["tier"], string> = {
  latest:      "Latest Generation",
  penultimate: "Penultimate Generation",
  value:       "Bang for Buck",
};

type Props = {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
};

export default function AdminModelPicker({ value, onChange, disabled }: Props) {
  const [models, setModels] = useState<DynamicModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"live" | "fallback" | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/openrouter-models")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setModels(data.models ?? []);
        setSource(data.source ?? "live");
      })
      .catch(() => {
        if (!cancelled) setSource("fallback");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const tiers = (["latest", "penultimate", "value"] as const)
    .map((tier) => ({
      tier,
      models: models.filter((m) => m.tier === tier),
    }))
    .filter((g) => g.models.length > 0);

  const currentInList = models.some((m) => m.id === value);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={loading ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-base disabled:opacity-50 min-w-[300px]"
      >
        {loading && <option value="">Loading live models…</option>}

        {!loading && !currentInList && value && (
          <option value={value}>{value} (current)</option>
        )}

        {!loading &&
          tiers.map((group) => (
            <optgroup key={group.tier} label={OPTGROUP_LABEL[group.tier]}>
              {group.models.map((m) => (
                <option key={`${group.tier}:${m.id}`} value={m.id}>
                  {m.name} ({TIER_LABEL[m.tier]})
                </option>
              ))}
            </optgroup>
          ))}
      </select>

      {!loading && source !== null && (
        <p className={`text-[10px] ${source === "live" ? "text-neutral-400" : "text-amber-500"}`}>
          {source === "live"
            ? `Live from OpenRouter · ${models.length} models`
            : "⚠ OpenRouter unreachable — showing static fallback"}
        </p>
      )}
    </div>
  );
}
