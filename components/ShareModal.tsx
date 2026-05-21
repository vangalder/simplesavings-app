"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import Modal from "@/components/Modal";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface CalculatorSnapshot {
  startingAmount: number;
  monthlyContribution: number;
  timeframeYears: number;
  interestRate: number;
  totalValue: number;
  interestEarned: number;
  goalAmount?: number;
  currency?: string;
}

interface ShareModalProps {
  url: string;
  snapshot: CalculatorSnapshot;
  onClose: () => void;
}

type View = "auth" | "form" | "narrative" | "success";

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="bg-header-dark px-6 py-4 flex items-center justify-between">
      <h2 className="text-white font-display font-semibold text-lg">{title}</h2>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white transition-colors text-2xl leading-none pb-0.5"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}

export default function ShareModal({ url, snapshot, onClose }: ShareModalProps) {
  const { isSignedIn, isLoaded, user } = useUser();
  const isAdmin = useIsAdmin();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<View>("auth");

  // narrative state
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState("");
  const [narrativeCopied, setNarrativeCopied] = useState(false);
  const [narrativeUsage, setNarrativeUsage] = useState<{ inputTokens: number; outputTokens: number; model: string; provider: string } | null>(null);
  const [narrativeStyle, setNarrativeStyle] = useState<"simple" | "expanded">("simple");
  const [refreshesUsed, setRefreshesUsed] = useState(0);
  const MAX_REFRESHES = 3;

  const currentView: View = (() => {
    if (view === "narrative") return "narrative";
    if (view === "success") return "success";
    if (!isLoaded) return "auth";
    if (isSignedIn) return "form";
    return "auth";
  })();

  const generateNarrative = useCallback(async (style: "simple" | "expanded", isRefresh = false) => {
    setNarrativeLoading(true);
    setNarrativeError("");
    setNarrativeCopied(false);
    if (isRefresh) setRefreshesUsed((n) => n + 1);
    try {
      const res = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...snapshot, style }),
      });
      const data = await res.json();
      if (data.error || !data.narrative) throw new Error(data.error ?? "Empty response");
      setNarrative(data.narrative);
      if (data.usage) setNarrativeUsage(data.usage);
    } catch {
      setNarrativeError("Something went wrong. Try again.");
    } finally {
      setNarrativeLoading(false);
    }
  }, [snapshot]);

  const handleStyleChange = useCallback((style: "simple" | "expanded") => {
    setNarrativeStyle(style);
    setRefreshesUsed(0);
    generateNarrative(style);
  }, [generateNarrative]);

  useEffect(() => {
    if (view === "narrative" && !narrative && !narrativeLoading) {
      generateNarrative(narrativeStyle);
    }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
  };

  const handleCopyNarrative = async () => {
    try {
      await navigator.clipboard.writeText(narrative);
      setNarrativeCopied(true);
      setTimeout(() => setNarrativeCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    const trimmed = recipientEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setIsSubmitting(true);

    const sharedBy = user?.primaryEmailAddress?.emailAddress ?? "";
    fetch("/api/shares/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharedBy, sharedWith: trimmed, url }),
    }).catch(console.warn);

    await navigator.clipboard.writeText(url).catch(() => {});
    setIsSubmitting(false);
    setView("success");
  };

  // ── Narrative view ─────────────────────────────────────────────────────────
  if (currentView === "narrative") {
    const canRefresh = !narrativeLoading && refreshesUsed < MAX_REFRESHES;
    return (
      <Modal onClose={onClose}>
        <ModalHeader title="Share Your Calculation" onClose={onClose} />
        <div className="px-6 py-5 space-y-3">
          {/* Narrative text box */}
          <div className="min-h-[88px] rounded-xl border-2 border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 leading-relaxed">
            {narrativeLoading && (
              <span className="inline-flex gap-1 items-center h-5 text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            )}
            {!narrativeLoading && narrativeError && <span className="text-error-base">{narrativeError}</span>}
            {!narrativeLoading && !narrativeError && narrative}
          </div>

          {/* Style pills + refresh */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {(["simple", "expanded"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStyleChange(s)}
                  disabled={narrativeLoading}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                    narrativeStyle === s
                      ? "bg-primary-base text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:opacity-40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => generateNarrative(narrativeStyle, true)}
              disabled={!canRefresh || !!narrativeError}
              title={refreshesUsed >= MAX_REFRESHES ? "No more regenerations" : `Regenerate (${MAX_REFRESHES - refreshesUsed} left)`}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              {refreshesUsed < MAX_REFRESHES ? `${MAX_REFRESHES - refreshesUsed} left` : "used up"}
            </button>
          </div>

          {isAdmin && narrativeUsage && !narrativeLoading && (
            <p className="text-[10px] text-neutral-400 font-mono tabular-nums">
              {narrativeUsage.provider} · {narrativeUsage.model} · {narrativeUsage.inputTokens}↑ {narrativeUsage.outputTokens}↓ · ${((narrativeUsage.inputTokens * 0.25 + narrativeUsage.outputTokens * 1.25) / 1_000_000).toFixed(6)}
            </p>
          )}
        </div>

        <div className="px-6 pb-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-neutral-600 font-medium rounded-xl hover:bg-neutral-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCopyNarrative}
            disabled={narrativeLoading || !narrative}
            className={`px-6 py-2.5 font-semibold rounded-xl shadow transition-all disabled:opacity-40 ${
              narrativeCopied ? "bg-secondary-base text-white" : "bg-gradient-orange-yellow text-white hover:shadow-md"
            }`}
          >
            {narrativeCopied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="px-6 pb-5 text-center">
          <button
            onClick={() => setView(isSignedIn ? "form" : "auth")}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline underline-offset-2"
          >
            Share Link
          </button>
        </div>
      </Modal>
    );
  }

  // ── Auth view ──────────────────────────────────────────────────────────────
  if (currentView === "auth") {
    return (
      <Modal onClose={onClose}>
        <ModalHeader title="Sign in to Share" onClose={onClose} />
        <div className="px-6 py-5 space-y-4">
          {!isLoaded ? (
            <div className="flex justify-center py-4">
              <div className="w-7 h-7 border-4 border-primary-light border-t-primary-base rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Sign in to create a shareable link for your savings calculation
                and track who you&apos;ve shared it with.
              </p>
              <SignInButton mode="modal">
                <button className="w-full py-3 px-4 border-2 border-neutral-300 rounded-xl flex items-center justify-center gap-3 hover:bg-neutral-50 transition-colors font-medium text-neutral-800">
                  <span className="text-lg font-bold w-5 text-center" style={{ color: "#4285F4" }}>G</span>
                  Sign in with Google
                </button>
              </SignInButton>
            </>
          )}
        </div>
        <div className="px-6 pb-4 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-neutral-600 font-medium rounded-xl hover:bg-neutral-100 transition-colors">
            Cancel
          </button>
        </div>
        <div className="px-6 pb-5 text-center">
          <button
            onClick={() => setView("narrative")}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline underline-offset-2"
          >
            Share Narrative Only
          </button>
        </div>
      </Modal>
    );
  }

  // ── Success view ───────────────────────────────────────────────────────────
  if (currentView === "success") {
    return (
      <Modal onClose={onClose}>
        <ModalHeader title="Link Shared!" onClose={onClose} />
        <div className="px-6 py-6 space-y-3">
          <div className="flex items-start gap-3 p-4 bg-secondary-light/20 border border-secondary-light rounded-xl">
            <span className="text-secondary-base text-xl mt-0.5">✓</span>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Your link has been copied to clipboard. Send it to{" "}
              <strong className="text-neutral-900">{recipientEmail}</strong>.
            </p>
          </div>
          <p className="text-xs text-neutral-500 text-center">
            Share link: <span className="font-mono">{url}</span>
          </p>
        </div>
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-orange-yellow text-white font-semibold rounded-xl shadow hover:shadow-md transition-shadow"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // ── Form view (signed in) ──────────────────────────────────────────────────
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Share Your Calculation" onClose={onClose} />
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Your shareable link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0 px-3 py-2.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-xs text-neutral-500 font-mono truncate flex items-center">
              {url}
            </div>
            <button
              onClick={handleCopyLink}
              className={`shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                linkCopied ? "bg-secondary-base text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {linkCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Share with (email address)
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => { setRecipientEmail(e.target.value); if (emailError) setEmailError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleShare(); }}
            placeholder="friend@example.com"
            autoFocus
            className={`w-full px-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 transition-colors ${
              emailError
                ? "border-error-base focus:ring-error-light"
                : "border-accent-orange-base focus:ring-accent-orange-base focus:ring-opacity-40"
            }`}
          />
          {emailError && <p className="text-sm text-error-base mt-1">{emailError}</p>}
        </div>
      </div>

      <div className="px-6 pb-4 flex justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 text-neutral-600 font-medium rounded-xl hover:bg-neutral-100 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleShare}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-gradient-orange-yellow text-white font-semibold rounded-xl shadow hover:shadow-md transition-shadow disabled:opacity-60"
        >
          {isSubmitting ? "Sharing…" : "Share Link"}
        </button>
      </div>

      <div className="px-6 pb-5 text-center">
        <button
          onClick={() => setView("narrative")}
          className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline underline-offset-2"
        >
          Share Narrative Only
        </button>
      </div>
    </Modal>
  );
}
