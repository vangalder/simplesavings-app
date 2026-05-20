"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TabNavigation from "@/components/TabNavigation";
import TabContentContainer from "@/components/TabContentContainer";
import ScenarioCard from "@/components/ScenarioCard";
import SkeletonCard from "@/components/SkeletonCard";
import { api } from "@/convex/_generated/api";
import type { ScenarioCardData } from "@/components/ScenarioCard";
import { toast } from "sonner";

const isConvexConfigured = !!process.env.NEXT_PUBLIC_CONVEX_URL;

function InsightsList({ clerkId }: { clerkId: string }) {
  const router = useRouter();
  const scenarios = useQuery(api.scenarios.getScenariosByUser, { clerkId }) as ScenarioCardData[] | undefined;

  const handleLoad = (scenario: ScenarioCardData) => {
    const params = new URLSearchParams({
      sa: scenario.startingAmount.toString(),
      mc: scenario.monthlyContribution.toString(),
      ty: scenario.timeframeYears.toString(),
      ir: scenario.interestRate.toString(),
    });
    router.push(`/?${params.toString()}`);
    toast.success(`Loaded "${scenario.name}"`);
  };

  if (scenarios === undefined) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
        <p className="text-2xl mb-3">✨</p>
        <h2 className="text-lg font-display font-semibold text-neutral-900 mb-2">
          Save a plan to get AI Insights
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          Use the Calculator to build a scenario, then save it to unlock AI-powered analysis.
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-medium text-primary-base hover:underline"
        >
          Go to Calculator →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">Select a plan to open its AI Insights panel.</p>
      {scenarios.map((scenario) => (
        <ScenarioCard
          key={scenario._id}
          scenario={scenario}
          onLoad={handleLoad}
          onOpen={(s) => router.push(`/plan/${s._id}`)}
          onDelete={() => {}}
        />
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const { isSignedIn, isLoaded, user } = useUser();

  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <TabNavigation />
      <main className="flex-1 relative z-10 pt-0 pb-4 md:pb-8">
        <TabContentContainer>
          <h1 className="text-3xl font-display font-bold text-primary-base mb-6">
            Insights ✨
          </h1>

          {!isLoaded && <SkeletonCard />}

          {isLoaded && !isSignedIn && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
              <p className="text-2xl mb-3">✨</p>
              <h2 className="text-lg font-display font-semibold text-neutral-900 mb-2">
                Sign in to access AI Insights
              </h2>
              <p className="text-sm text-neutral-500">
                Save scenarios and get AI-powered analysis of your savings plans.
              </p>
            </div>
          )}

          {isLoaded && isSignedIn && isConvexConfigured && (
            <InsightsList clerkId={user.id} />
          )}
        </TabContentContainer>
      </main>
      <Footer />
    </div>
  );
}
