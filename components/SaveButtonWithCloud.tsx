"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import SaveScenarioModal from "@/components/SaveScenarioModal";
import type { CalculatorState } from "@/lib/defaultValues";

type Results = {
  totalValue: number;
  principalPaid: number;
  interestEarned: number;
};

type Props = {
  state: CalculatorState;
  results: Results;
  onLocalSave: () => void;
};

export default function SaveButtonWithCloud({ state, results, onLocalSave }: Props) {
  const { isSignedIn, user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const clerkId = user?.id ?? "";
  const scenarios = useQuery(
    api.scenarios.getScenariosByUser,
    isSignedIn && clerkId ? {} : "skip"
  );
  const saveScenario = useMutation(api.scenarios.saveScenario);

  const handleClick = () => {
    onLocalSave();

    if (!isSignedIn) return;

    // If user has a saved scenario, overwrite it silently (preserve name/description/goals)
    if (scenarios && scenarios.length > 0) {
      const existing = scenarios[0] as { name: string; description?: string; goals?: string };
      handleCloudSave(existing.name, existing.description ?? "", existing.goals ?? "");
      return;
    }

    // First cloud save — prompt for a name
    setShowModal(true);
  };

  const handleCloudSave = async (name: string, description = "", goals = "") => {
    if (!clerkId) return;
    setSaving(true);
    try {
      await saveScenario({
        name,
        description: description || undefined,
        goals: goals || undefined,
        startingAmount: state.startingAmount,
        monthlyContribution: state.monthlyContribution,
        timeframeYears: state.timeframeYears,
        interestRate: state.interestRate,
        totalValue: results.totalValue,
        principalPaid: results.principalPaid,
        interestEarned: results.interestEarned,
      });
      toast.success("Saved to cloud");
      setShowModal(false);
    } catch {
      toast.error("Cloud save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full py-3 bg-gradient-orange-yellow rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow mt-2"
      >
        Save Calculation
      </button>

      {showModal && (
        <SaveScenarioModal
          onSave={handleCloudSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}
    </>
  );
}
