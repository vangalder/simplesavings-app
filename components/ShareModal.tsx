"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
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
  locale?: string;
}

const LOCALE_STRINGS: Record<string, {
  years: string; year: string; at: string; startingWith: string;
  noContributions: string; moContrib: string; moWithdrawal: string; goal: string;
}> = {
  "en":    { years: "years",  year: "year",  at: "at",  startingWith: "starting with", noContributions: "no contributions", moContrib: "/mo",      moWithdrawal: "/mo withdrawal",       goal: "goal"      },
  "es-ES": { years: "años",   year: "año",   at: "al",  startingWith: "empezando con", noContributions: "sin aportaciones", moContrib: "/mes",     moWithdrawal: "/mes de retiro",        goal: "objetivo"  },
  "es-MX": { years: "años",   year: "año",   at: "al",  startingWith: "empezando con", noContributions: "sin aportaciones", moContrib: "/mes",     moWithdrawal: "/mes de retiro",        goal: "objetivo"  },
  "it":    { years: "anni",   year: "anno",  at: "al",  startingWith: "a partire da",  noContributions: "senza contributi", moContrib: "/mese",    moWithdrawal: "/mese di prelievo",     goal: "obiettivo" },
  "pt-BR": { years: "anos",   year: "ano",   at: "a",   startingWith: "começando com", noContributions: "sem contribuições",moContrib: "/mês",     moWithdrawal: "/mês de retirada",      goal: "objetivo"  },
  "pt-PT": { years: "anos",   year: "ano",   at: "a",   startingWith: "começando com", noContributions: "sem contribuições",moContrib: "/mês",     moWithdrawal: "/mês de levantamento",  goal: "objetivo"  },
  "fr-FR": { years: "ans",    year: "an",    at: "à",   startingWith: "en commençant par", noContributions: "sans apports",  moContrib: "/mois",    moWithdrawal: "/mois de retrait",      goal: "objectif"  },
};

interface ShareModalProps {
  url: string;
  snapshot: CalculatorSnapshot;
  onClose: () => void;
}

type View = "picker" | "auth" | "form" | "narrative" | "success";

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
  const t = useTranslations("share");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<View>("picker");

  // narrative state
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState("");
  const [narrativeCopied, setNarrativeCopied] = useState(false);
  const [narrativeUsage, setNarrativeUsage] = useState<{ inputTokens: number; outputTokens: number; model: string; provider: string } | null>(null);
  const [narrativeStyle, setNarrativeStyle] = useState<"simple" | "expanded" | "bare bones">("simple");
  const [refreshesUsed, setRefreshesUsed] = useState(0);
  const MAX_REFRESHES = 3;

  const currentView: View = (() => {
    if (view === "picker") return "picker";
    if (view === "narrative") return "narrative";
    if (view === "success") return "success";
    if (!isLoaded) return "auth";
    if (isSignedIn) return "form";
    return "auth";
  })();

  const buildBareBonesNarrative = useCallback((): string => {
    const { startingAmount, monthlyContribution, timeframeYears, interestRate, totalValue, currency = "USD", goalAmount, locale = "en" } = snapshot;
    const intlLocale = locale === "en" ? "en-US" : locale;
    const s = LOCALE_STRINGS[locale] ?? LOCALE_STRINGS["en"];
    const exact = (n: number) => new Intl.NumberFormat(intlLocale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    const timeStr = timeframeYears % 1 === 0
      ? `${timeframeYears} ${timeframeYears === 1 ? s.year : s.years}`
      : `${timeframeYears.toFixed(1)} ${s.years}`;
    const contrib = monthlyContribution === 0
      ? s.noContributions
      : monthlyContribution > 0
      ? `+ ${exact(monthlyContribution)}${s.moContrib}`
      : `- ${exact(Math.abs(monthlyContribution))}${s.moWithdrawal}`;
    const goalPart = goalAmount ? `, ${s.goal} ${exact(goalAmount)}` : "";
    return `${timeStr} ${s.at} ${interestRate}%, ${s.startingWith} ${exact(startingAmount)}${goalPart} ${contrib}: ${exact(totalValue)} (https://simplesavings.app)`;
  }, [snapshot]);

  const generateNarrative = useCallback(async (style: "simple" | "expanded" | "bare bones", isRefresh = false) => {
    setNarrativeError("");
    setNarrativeCopied(false);
    if (isRefresh) setRefreshesUsed((n) => n + 1);

    if (style === "bare bones") {
      setNarrative(buildBareBonesNarrative());
      setNarrativeUsage(null);
      return;
    }

    setNarrativeLoading(true);
    try {
      const res = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...snapshot, style, locale: snapshot.locale ?? "en" }),
      });
      const data = await res.json();
      if (data.error || !data.narrative) throw new Error(data.error ?? "Empty response");
      setNarrative(data.narrative);
      if (data.usage) setNarrativeUsage(data.usage);
    } catch {
      setNarrativeError(t("narrativeError"));
    } finally {
      setNarrativeLoading(false);
    }
  }, [snapshot, buildBareBonesNarrative]);

  const handleStyleChange = useCallback((style: "simple" | "expanded" | "bare bones") => {
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
      setEmailError(t("invalidEmail"));
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

  // ── Picker view ────────────────────────────────────────────────────────────
  if (currentView === "picker") {
    return (
      <Modal onClose={onClose}>
        <ModalHeader title={t("modalTitle")} onClose={onClose} />
        <div className="px-6 py-6 space-y-3">
          <button
            onClick={() => setView(isSignedIn ? "form" : "auth")}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-neutral-200 hover:border-primary-base hover:bg-primary-base/5 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-primary-base/10 flex items-center justify-center shrink-0 group-hover:bg-primary-base/20 transition-colors">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-base">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-800 text-sm">{t("shareLink")}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{t("shareLinkDesc")}</p>
            </div>
          </button>

          <button
            onClick={() => setView("narrative")}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-neutral-200 hover:border-accent-orange-base hover:bg-accent-orange-base/5 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-accent-orange-base/10 flex items-center justify-center shrink-0 group-hover:bg-accent-orange-base/20 transition-colors">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-orange-base">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-800 text-sm">{t("shareNarrative")}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{t("shareNarrativeDesc")}</p>
            </div>
          </button>
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors">
            {t("cancel")}
          </button>
        </div>
      </Modal>
    );
  }

  // ── Narrative view ─────────────────────────────────────────────────────────
  if (currentView === "narrative") {
    const canRefresh = !narrativeLoading && refreshesUsed < MAX_REFRESHES && narrativeStyle !== "bare bones";
    return (
      <Modal onClose={onClose}>
        <ModalHeader title={t("modalTitle")} onClose={onClose} />
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
          <div className="flex items-center justify-between flex-wrap gap-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {(["simple", "expanded", "bare bones"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStyleChange(s)}
                  disabled={narrativeLoading}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    narrativeStyle === s
                      ? "bg-primary-base text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:opacity-40"
                  }`}
                >
                  {s === "simple" ? t("narrativeSimple") : s === "expanded" ? t("narrativeExpanded") : t("narrativeBareBones")}
                </button>
              ))}
            </div>
            {narrativeStyle !== "bare bones" && (
              <button
                onClick={() => generateNarrative(narrativeStyle, true)}
                disabled={!canRefresh || !!narrativeError}
                title={t("regenerateHint")}
                aria-label={t("regenerateHint")}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                {t("regenerateLeft", { n: MAX_REFRESHES - refreshesUsed })}
              </button>
            )}
          </div>

          {isAdmin && narrativeUsage && !narrativeLoading && (
            <p className="text-[10px] text-neutral-400 font-mono tabular-nums">
              {narrativeUsage.provider} · {narrativeUsage.model} · {narrativeUsage.inputTokens}↑ {narrativeUsage.outputTokens}↓ · ${((narrativeUsage.inputTokens * 0.25 + narrativeUsage.outputTokens * 1.25) / 1_000_000).toFixed(6)}
            </p>
          )}
        </div>

        <div className="px-6 pb-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-neutral-600 font-medium rounded-xl hover:bg-neutral-100 transition-colors">
            {t("cancel")}
          </button>
          <button
            onClick={handleCopyNarrative}
            disabled={narrativeLoading || !narrative}
            className={`px-6 py-2.5 font-semibold rounded-xl shadow transition-all disabled:opacity-40 ${
              narrativeCopied ? "bg-secondary-base text-white" : "bg-gradient-orange-yellow text-white hover:shadow-md"
            }`}
          >
            {narrativeCopied ? t("copied") : t("copyText")}
          </button>
        </div>

        <div className="px-6 pb-5 text-center">
          <button
            onClick={() => setView("picker")}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline underline-offset-2"
          >
            {t("back")}
          </button>
        </div>
      </Modal>
    );
  }

  // ── Auth view ──────────────────────────────────────────────────────────────
  if (currentView === "auth") {
    return (
      <Modal onClose={onClose}>
        <ModalHeader title={t("signInToShare")} onClose={onClose} />
        <div className="px-6 py-5 space-y-4">
          {!isLoaded ? (
            <div className="flex justify-center py-4">
              <div className="w-7 h-7 border-4 border-primary-light border-t-primary-base rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-neutral-600 text-sm leading-relaxed">
                {t("signInToShareDesc")}
              </p>
              <SignInButton mode="modal">
                <button className="w-full py-3 px-4 border-2 border-neutral-300 rounded-xl flex items-center justify-center gap-3 hover:bg-neutral-50 transition-colors font-medium text-neutral-800">
                  <span className="text-lg font-bold w-5 text-center" style={{ color: "#4285F4" }}>G</span>
                  {t("signInWithGoogle")}
                </button>
              </SignInButton>
            </>
          )}
        </div>
        <div className="px-6 pb-4 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-neutral-600 font-medium rounded-xl hover:bg-neutral-100 transition-colors">
            {t("cancel")}
          </button>
        </div>
      </Modal>
    );
  }

  // ── Success view ───────────────────────────────────────────────────────────
  if (currentView === "success") {
    return (
      <Modal onClose={onClose}>
        <ModalHeader title={t("linkShared")} onClose={onClose} />
        <div className="px-6 py-6 space-y-3">
          <div className="flex items-start gap-3 p-4 bg-secondary-light/20 border border-secondary-light rounded-xl">
            <span className="text-secondary-base text-xl mt-0.5">✓</span>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {t("linkCopiedTo")}{" "}
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
            {t("done")}
          </button>
        </div>
      </Modal>
    );
  }

  // ── Form view (signed in) ──────────────────────────────────────────────────
  return (
    <Modal onClose={onClose}>
      <ModalHeader title={t("modalTitle")} onClose={onClose} />
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t("yourShareableLink")}
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
              {linkCopied ? t("copied") : t("copyLink")}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t("shareWithEmail")}
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => { setRecipientEmail(e.target.value); if (emailError) setEmailError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleShare(); }}
            placeholder={t("emailPlaceholder")}
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
          {t("cancel")}
        </button>
        <button
          onClick={handleShare}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-gradient-orange-yellow text-white font-semibold rounded-xl shadow hover:shadow-md transition-shadow disabled:opacity-60"
        >
          {isSubmitting ? t("sharing") : t("shareLink")}
        </button>
      </div>

    </Modal>
  );
}
