"use client";

import { useUser, SignInButton, SignOutButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TabNavigation from "@/components/TabNavigation";
import TabContentContainer from "@/components/TabContentContainer";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isConvexConfigured = !!process.env.NEXT_PUBLIC_CONVEX_URL;

type Scenario = {
  _id: Id<"scenarios">;
  name: string;
  startingAmount: number;
  monthlyContribution: number;
  timeframeYears: number;
  interestRate: number;
  totalValue: number;
  updatedAt: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SignedInProfile({ clerkId }: { clerkId: string }) {
  const { user } = useUser();
  const router = useRouter();
  const scenarios = useQuery(api.scenarios.getScenariosByUser, { clerkId }) as Scenario[] | undefined;
  const deleteScenario = useMutation(api.scenarios.deleteScenario);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleLoad = (scenario: Scenario) => {
    const params = new URLSearchParams({
      sa: scenario.startingAmount.toString(),
      mc: scenario.monthlyContribution.toString(),
      ty: scenario.timeframeYears.toString(),
      ir: scenario.interestRate.toString(),
    });
    router.push(`/?${params.toString()}`);
    toast.success(`Loaded "${scenario.name}"`);
  };

  const handleDelete = async (scenario: Scenario) => {
    if (deletingId) return;
    setDeletingId(scenario._id);
    try {
      await deleteScenario({ scenarioId: scenario._id, clerkId });
      toast.success(`Deleted "${scenario.name}"`);
    } catch {
      toast.error("Failed to delete scenario");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* User info */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center gap-4">
        {user?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt={user.fullName ?? "Profile"}
            className="w-14 h-14 rounded-full object-cover"
          />
        )}
        <div>
          <p className="text-lg font-semibold text-neutral-900">{user?.fullName ?? "—"}</p>
          <p className="text-sm text-neutral-500">{user?.primaryEmailAddress?.emailAddress ?? "—"}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Free plan</p>
        </div>
        <div className="ml-auto">
          <SignOutButton>
            <button className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Saved scenarios */}
      <div>
        <h2 className="text-xl font-display font-semibold text-primary-base mb-3">
          Saved Scenarios
        </h2>

        {scenarios === undefined && (
          <div className="text-neutral-400 text-sm py-4">Loading…</div>
        )}

        {scenarios?.length === 0 && (
          <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 text-center">
            <p className="text-neutral-500 text-sm">No saved scenarios yet.</p>
            <p className="text-neutral-400 text-xs mt-1">
              Use the Save button on the Calculator to save your current scenario.
            </p>
          </div>
        )}

        {scenarios && scenarios.length > 0 && (
          <div className="space-y-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario._id}
                className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900 truncate">{scenario.name}</p>
                  <p className="text-sm text-neutral-500">
                    {formatCurrency(scenario.totalValue)} · {scenario.timeframeYears}yr · {scenario.interestRate}%
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">Saved {formatDate(scenario.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleLoad(scenario)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary-base rounded-xl hover:bg-primary-base/90 transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(scenario)}
                    disabled={deletingId === scenario._id}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-500 border border-neutral-200 rounded-xl hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {deletingId === scenario._id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SignedOutProfile() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
      <div className="w-16 h-16 bg-primary-base/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-base">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <h2 className="text-xl font-display font-semibold text-neutral-900 mb-2">Sign in to save scenarios</h2>
      <p className="text-sm text-neutral-500 mb-6">
        Save your calculator scenarios to the cloud and access them from any device.
      </p>
      <SignInButton mode="modal">
        <button className="inline-flex items-center gap-3 px-5 py-3 bg-white border-2 border-neutral-200 rounded-xl font-semibold text-neutral-700 hover:border-neutral-400 transition-colors shadow-sm">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>
      </SignInButton>
    </div>
  );
}

export default function ProfilePage() {
  const { isSignedIn, isLoaded, user } = useUser();

  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <TabNavigation />
      <main className="flex-1 relative z-10 pt-0 pb-4 md:pb-8">
        <TabContentContainer>
          <h1 className="text-3xl font-display font-bold text-primary-base mb-6">Profile</h1>

          {!isClerkConfigured && (
            <p className="text-neutral-500">Authentication not configured.</p>
          )}

          {isClerkConfigured && !isLoaded && (
            <div className="text-neutral-400 text-sm">Loading…</div>
          )}

          {isClerkConfigured && isLoaded && !isSignedIn && <SignedOutProfile />}

          {isClerkConfigured && isLoaded && isSignedIn && isConvexConfigured && (
            <SignedInProfile clerkId={user.id} />
          )}

          {isClerkConfigured && isLoaded && isSignedIn && !isConvexConfigured && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <p className="font-semibold text-neutral-900">
                Signed in as {user?.primaryEmailAddress?.emailAddress}
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                Cloud save is not yet configured.
              </p>
            </div>
          )}
        </TabContentContainer>
      </main>
      <Footer />
    </div>
  );
}
