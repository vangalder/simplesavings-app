"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { formatCurrency } from "@/lib/currency";

export type ScenarioCardData = {
  _id: Id<"scenarios">;
  name: string;
  startingAmount: number;
  monthlyContribution: number;
  timeframeYears: number;
  interestRate: number;
  totalValue: number;
  description?: string;
  goals?: string;
  type?: string;
  updatedAt: number;
};

interface ScenarioCardProps {
  scenario: ScenarioCardData;
  onLoad: (scenario: ScenarioCardData) => void;
  onDelete: (scenario: ScenarioCardData) => void;
  onOpen?: (scenario: ScenarioCardData) => void;
  isDeleting?: boolean;
  currency?: string;
  locale?: string;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ScenarioCard({
  scenario,
  onLoad,
  onDelete,
  onOpen,
  isDeleting = false,
  currency = "USD",
  locale = "en",
}: ScenarioCardProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* 4px accent top-border per DS spec */}
      <div className="h-1 bg-secondary-base" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-neutral-900 truncate">{scenario.name}</p>
              {scenario.type && scenario.type !== "simple_savings" && (
                <span className="text-xs px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded font-mono shrink-0">
                  {scenario.type}
                </span>
              )}
            </div>
            {scenario.description && (
              <p className="text-xs text-neutral-500 line-clamp-1 mb-1">{scenario.description}</p>
            )}
            <p className="text-sm text-neutral-600">
              {formatCurrency(scenario.totalValue, currency, locale)}
              {" · "}
              {scenario.timeframeYears}yr
              {" · "}
              {scenario.interestRate}%
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">Saved {formatDate(scenario.updatedAt)}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpen && (
              <button
                onClick={() => onOpen(scenario)}
                className="px-2.5 py-1.5 text-xs font-medium text-primary-base border border-primary-base/30 rounded-lg hover:bg-primary-base/5 transition-colors"
                title="Open plan"
              >
                Open
              </button>
            )}
            <button
              onClick={() => onLoad(scenario)}
              className="px-2.5 py-1.5 text-xs font-medium text-white bg-primary-base rounded-lg hover:bg-primary-dark transition-colors"
            >
              Load
            </button>
            <button
              onClick={() => onDelete(scenario)}
              disabled={isDeleting}
              className="px-2.5 py-1.5 text-xs font-medium text-neutral-500 border border-neutral-200 rounded-lg hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
