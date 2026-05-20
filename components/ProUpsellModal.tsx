"use client";

import { useEffect, useRef } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type InsightContext = {
  question: string;
  pitch: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  insightContext?: InsightContext | null;
};

async function handleCheckout(type: "one_time" | "subscription") {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

const FALLBACK_SUBTITLE = "An interactive, intelligent co-pilot for your financial strategy.";

export default function ProUpsellModal({ open, onClose, insightContext }: Props) {
  const pitch = insightContext?.pitch || FALLBACK_SUBTITLE;
  const { isSignedIn, user } = useUser();
  const clerkId = user?.id ?? "";
  const creditBalance = useQuery(
    api.users.getAiCreditBalance,
    isSignedIn && clerkId ? { clerkId } : "skip"
  );
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const isPro = creditBalance?.isPro;
  const hasCredits = (creditBalance?.granted ?? 0) > (creditBalance?.used ?? 0);
  const hasAccess = isPro || hasCredits;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-bold text-neutral-900">
                AI Insights ✦
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                {pitch}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-300 hover:text-neutral-500 transition-colors mt-0.5 shrink-0"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* What's included */}
          <ul className="mt-4 space-y-2">
            {[
              "Ask anything — your numbers, your goals, your timeline",
              "Financial freedom targets, safe withdrawal limits, compounding milestones",
              "Powered by your choice of AI model",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-neutral-600">
                <span className="text-primary-base mt-0.5 shrink-0">✦</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="px-6 pb-6 space-y-2">
          {!isSignedIn ? (
            <>
              <p className="text-xs text-neutral-400 text-center mb-3">Sign in first to unlock AI Insights.</p>
              <SignInButton mode="modal">
                <button className="w-full py-3 px-4 rounded-xl bg-primary-base text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                  Sign in to continue
                </button>
              </SignInButton>
            </>
          ) : hasAccess ? (
            <>
              <p className="text-xs text-neutral-400 text-center mb-1">
                {isPro ? "You have Pro — save a scenario to start chatting." : `You have $${(((creditBalance?.granted ?? 0) - (creditBalance?.used ?? 0)) / 100).toFixed(2)} remaining — save a scenario to use it.`}
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-primary-base text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleCheckout("one_time")}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-orange-base to-accent-base text-neutral-900 font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Try it — $4.99
                <span className="block text-xs font-normal opacity-70 mt-0.5">Includes up to 30 messages of deep analysis on one plan</span>
              </button>
              <button
                onClick={() => handleCheckout("subscription")}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-200 text-neutral-600 text-sm hover:bg-neutral-50 transition-colors"
              >
                Go Pro — $9.99/month
                <span className="ml-1 text-xs text-neutral-400">Unlimited conversations</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
