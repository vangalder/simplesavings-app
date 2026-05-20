"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/Modal";

type Props = {
  defaultName?: string;
  onSave: (name: string, description: string, goals: string) => void;
  onClose: () => void;
  saving?: boolean;
};

export default function SaveScenarioModal({ defaultName = "", onSave, onClose, saving }: Props) {
  const t = useTranslations("save");
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, description.trim(), goals.trim());
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-header-dark px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-white">Name Your Scenario</h2>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors text-2xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <p className="text-sm text-neutral-600">
          Give this calculation a name so you can find it later.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("scenarioNamePlaceholder")}
          maxLength={60}
          autoFocus
          className="w-full px-4 py-3 border-2 border-accent-orange-base rounded-xl text-lg font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-orange-base"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={280}
          rows={2}
          className="w-full px-4 py-3 border-2 border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-base resize-none"
        />
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder={t("goalsPlaceholder")}
          maxLength={280}
          rows={2}
          className="w-full px-4 py-3 border-2 border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-base resize-none"
        />
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full py-3 bg-gradient-orange-yellow rounded-xl text-white font-semibold text-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t("saving") : t("saveToCloud")}
        </button>
      </form>
    </Modal>
  );
}
