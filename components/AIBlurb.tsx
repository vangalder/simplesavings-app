"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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
  const [text, setText] = useState(blurb);
  const [opacity, setOpacity] = useState(blurb ? 1 : 0);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const t = useTranslations("insights");

  const ctaLabel =
    goalMet === false && goalShortfall && goalShortfall > 0
      ? t("blurbCtaGoalGap", { amount: fmtCurrency(goalShortfall, currency) })
      : t("blurbCta");

  // Deterministic fallback — derived from the same computed facts as the goal
  // banner, so it can never contradict it. Shown when the LLM blurb fails or the
  // loading state runs long.
  const fallbackText =
    goalMet === true
      ? t("blurbFallbackGoalMet")
      : goalMet === false && goalShortfall && goalShortfall > 0
        ? t("blurbFallbackGoalGap", { amount: fmtCurrency(goalShortfall, currency) })
        : t("blurbFallbackGeneric");

  // A fresh blurb arrived — swap it in and fade it up.
  useEffect(() => {
    if (!loading && blurb) {
      setText(blurb);
      setOpacity(0);
      const timer = setTimeout(() => setOpacity(1), 40);
      return () => clearTimeout(timer);
    }
  }, [blurb, loading]);

  // The user started changing numbers (regeneration began): fade the now-stale
  // blurb out, then clear it so the skeleton bridges the gap until the new one
  // arrives — never leave a stale blurb sitting there.
  useEffect(() => {
    if (loading) {
      setOpacity(0);
      const timer = setTimeout(() => setText(""), 280);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Bound the loading state: if the blurb hasn't arrived within 12s, stop the
  // skeleton and fall back to the deterministic summary.
  useEffect(() => {
    if (loading && !blurb) {
      setLoadTimedOut(false);
      const timer = setTimeout(() => setLoadTimedOut(true), 12_000);
      return () => clearTimeout(timer);
    }
  }, [loading, blurb]);

  const showSkeleton = loading && !text && !loadTimedOut;
  // When there's no text and we're not mid-fade, show the deterministic
  // fallback instead of hiding — the user always gets a coherent line.
  const showFallback = !text && (loadTimedOut || (!loading && !blurb));

  return (
    <div className="mt-3 flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5 shrink-0" aria-hidden>
          ✦
        </span>
        {showSkeleton ? (
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-3 bg-neutral-200 rounded-full animate-pulse w-3/4" />
            <div className="h-3 bg-neutral-200 rounded-full animate-pulse w-1/2" />
          </div>
        ) : text ? (
          <p
            className="flex-1 text-sm text-neutral-500 italic leading-snug transition-opacity duration-300 -ml-0.5 pl-0.5"
            style={{ opacity }}
          >
            {text}
          </p>
        ) : showFallback ? (
          <p className="flex-1 text-sm text-neutral-500 italic leading-snug -ml-0.5 pl-0.5">
            {fallbackText}
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
      {isAdmin && error && !blurb && !loading && (
        <p className="ml-6 text-[10px] text-red-400 font-mono">blurb error: {error}</p>
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
