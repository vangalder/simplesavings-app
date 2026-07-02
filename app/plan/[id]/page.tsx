"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InsightsPanel from "@/components/InsightsPanel";
import SkeletonCard from "@/components/SkeletonCard";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PlanDetailPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const clerkId = user?.id ?? "";
  const scenario = useQuery(
    api.scenarios.getScenarioById,
    isSignedIn && clerkId && id
      ? { scenarioId: id as Id<"scenarios"> }
      : "skip"
  );

  // Redirect unauthenticated users (middleware also handles this)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/profile");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <Header />
        <main className="flex-1 relative z-10 pb-4 md:pb-8">
          <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard lines={4} />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <main className="flex-1 relative z-10 pb-4 md:pb-8">
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          {scenario === undefined && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard lines={4} />
            </div>
          )}

          {scenario === null && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
              <p className="text-neutral-500">Plan not found.</p>
              <button
                onClick={() => router.push("/profile")}
                className="mt-4 text-sm text-primary-base hover:underline"
              >
                Back to Profile
              </button>
            </div>
          )}

          {scenario && (
            <div className="space-y-6">
              {/* Plan header */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <button
                    onClick={() => router.push("/profile")}
                    className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
                  >
                    ← Back
                  </button>
                </div>
                <h1 className="text-3xl font-display font-bold text-primary-base">
                  {scenario.name}
                </h1>
                {scenario.description && (
                  <p className="text-neutral-600 mt-1">{scenario.description}</p>
                )}
                {scenario.goals && (
                  <p className="text-sm text-neutral-400 mt-0.5 italic">{scenario.goals}</p>
                )}
              </div>

              {/* Scenario summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Starting Amount", value: formatCurrency(scenario.startingAmount) },
                  { label: "Monthly", value: formatCurrency(scenario.monthlyContribution) },
                  { label: "Timeframe", value: `${scenario.timeframeYears}y` },
                  { label: "Interest Rate", value: `${scenario.interestRate}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
                    <p className="text-xs text-neutral-500">{label}</p>
                    <p className="text-lg font-display font-semibold text-neutral-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Value", value: formatCurrency(scenario.totalValue), accent: true },
                  { label: "Principal Paid", value: formatCurrency(scenario.principalPaid) },
                  { label: "Interest Earned", value: formatCurrency(scenario.interestEarned) },
                ].map(({ label, value, accent }) => (
                  <div key={label} className={`rounded-xl border p-3 text-center ${accent ? "bg-primary-base/5 border-primary-base/20" : "bg-white border-neutral-200"}`}>
                    <p className="text-xs text-neutral-500">{label}</p>
                    <p className={`text-base font-display font-semibold mt-0.5 ${accent ? "text-primary-base" : "text-neutral-900"}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Insights Panel */}
              <div>
                <h2 className="text-xl font-display font-semibold text-primary-base mb-3">
                  AI Insights
                </h2>
                <InsightsPanel
                  scenarioId={scenario._id as Id<"scenarios">}
                  clerkId={clerkId}
                  scenarioData={{
                    startingAmount: scenario.startingAmount,
                    monthlyContribution: scenario.monthlyContribution,
                    timeframeYears: scenario.timeframeYears,
                    interestRate: scenario.interestRate,
                    totalValue: scenario.totalValue,
                    interestEarned: scenario.interestEarned,
                    aiProvider: scenario.aiProvider,
                    aiModel: scenario.aiModel,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
