"use client";

import { useState } from "react";

interface UpgradePromptProps {
  feature: string;
  children?: React.ReactNode;
  onUpgrade?: () => void;
}

export default function UpgradePrompt({ feature, children, onUpgrade }: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return <>{children}</>;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {children && (
        <div className="select-none pointer-events-none" aria-hidden>
          <div className="blur-sm opacity-40">{children}</div>
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg border border-accent-base/30 p-6 mx-4 text-center max-w-xs">
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-accent-orange-base to-accent-base text-neutral-900 mb-3">
            Pro
          </div>
          <h3 className="font-display font-semibold text-neutral-800 text-base mb-1">
            Upgrade to Pro
          </h3>
          <p className="text-sm text-neutral-600 mb-4">
            Unlock {feature} with a Pro subscription.
          </p>
          <button
            onClick={onUpgrade}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-accent-orange-base to-accent-base text-neutral-900 font-semibold text-sm transition-opacity hover:opacity-90"
          >
            Upgrade
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="mt-2 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
