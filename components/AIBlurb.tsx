"use client";

import { useEffect, useState } from "react";

export type BlurbMeta = {
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
};

export type InsightContext = {
  question: string;
  pitch: string;
  marketingHook?: string;
};

interface AIBlurbProps {
  blurb: string;
  question?: string;
  pitch?: string;
  loading: boolean;
  meta?: BlurbMeta;
  error?: string;
  isAdmin?: boolean;
  goalMet?: boolean;
  goalShortfall?: number;
  currency?: string;
  onUpsellClick?: (ctx: InsightContext) => void;
}

function fmtCurrency(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export default function AIBlurb({ blurb, question, pitch, loading, meta, error, isAdmin, goalMet, goalShortfall, currency, onUpsellClick }: AIBlurbProps) {
  const [visible, setVisible] = useState(false);

  const ctaLabel =
    goalMet === false && goalShortfall && goalShortfall > 0
      ? `Let AI calculate how to bridge your ${fmtCurrency(goalShortfall, currency)} gap`
      : "Unlock AI Insights to optimize your savings timeline";

  useEffect(() => {
    if (blurb) {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [blurb]);

  // Non-admin: hide silently on failure
  if (!loading && !blurb && (!isAdmin || !meta)) return null;

  return (
    <div className="mt-3 flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5 shrink-0" aria-hidden>
          ✦
        </span>
        {loading ? (
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-3 bg-neutral-200 rounded-full animate-pulse w-3/4" />
            <div className="h-3 bg-neutral-200 rounded-full animate-pulse w-1/2" />
          </div>
        ) : blurb ? (
          <p
            className="flex-1 text-sm text-neutral-500 italic leading-snug transition-opacity duration-500 -ml-0.5 pl-0.5"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {blurb}
          </p>
        ) : isAdmin ? (
          <p className="flex-1 text-xs text-red-400 italic leading-snug">
            blurb failed{error ? `: ${error}` : ""}
          </p>
        ) : null}
      </div>
      {onUpsellClick && blurb && !loading && (
        <button
          onClick={() => onUpsellClick({ question: question ?? "", pitch: pitch ?? "" })}
          className="ml-6 text-xs text-primary-base/60 hover:text-primary-base transition-colors text-left"
        >
          {ctaLabel} →
        </button>
      )}
      {isAdmin && meta && !loading && (
        <p className="ml-6 text-[10px] text-neutral-500 font-mono tabular-nums">
          {meta.provider === "cache"
            ? "served from cache · $0.000000"
            : `${meta.provider} · ${meta.model} · ${meta.tokensIn}↑ ${meta.tokensOut}↓ · ${(meta.latencyMs / 1000).toFixed(2)}s · $${meta.costUsd.toFixed(6)}`}
        </p>
      )}
    </div>
  );
}
