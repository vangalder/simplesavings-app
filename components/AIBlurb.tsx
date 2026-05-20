"use client";

import { useEffect, useState } from "react";

export type BlurbMeta = {
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
};

interface AIBlurbProps {
  blurb: string;
  question?: string;
  loading: boolean;
  meta?: BlurbMeta;
  isAdmin?: boolean;
  onUpsellClick?: () => void;
}

export default function AIBlurb({ blurb, question, loading, meta, isAdmin, onUpsellClick }: AIBlurbProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (blurb) {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [blurb]);

  if (!loading && !blurb) return null;

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
        ) : (
          <p
            className="flex-1 text-sm text-neutral-500 italic leading-snug transition-opacity duration-500"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {blurb}
          </p>
        )}
      </div>
      {onUpsellClick && blurb && !loading && (
        <button
          onClick={onUpsellClick}
          className="ml-6 text-xs text-primary-base/60 hover:text-primary-base transition-colors text-left"
        >
          {question || "Want deeper analysis?"} →
        </button>
      )}
      {isAdmin && meta && !loading && (
        <p className="ml-6 text-[10px] text-neutral-300 font-mono tabular-nums">
          {meta.provider} · {meta.model} · {meta.tokensIn}↑ {meta.tokensOut}↓ · ${(meta.costCents / 100).toFixed(4)}
        </p>
      )}
    </div>
  );
}
