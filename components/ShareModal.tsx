"use client";

import { useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import Modal from "@/components/Modal";

interface ShareModalProps {
  url: string;
  onClose: () => void;
}

type View = "auth" | "form" | "success";

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

export default function ShareModal({ url, onClose }: ShareModalProps) {
  const { isSignedIn, isLoaded, user } = useUser();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<View>("auth");

  // Advance from auth to form once signed in
  const currentView: View = (() => {
    if (view === "success") return "success";
    if (!isLoaded) return "auth";
    if (isSignedIn) return "form";
    return "auth";
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

    // Record the share — non-blocking; Sprint 2 will persist this to Convex
    fetch("/api/shares/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharedBy, sharedWith: trimmed, url }),
    }).catch(console.warn);

    await navigator.clipboard.writeText(url).catch(() => {});

    setIsSubmitting(false);
    setView("success");
  };

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
                  <span
                    className="text-lg font-bold w-5 text-center"
                    style={{ color: "#4285F4" }}
                  >
                    G
                  </span>
                  Sign in with Google
                </button>
              </SignInButton>
            </>
          )}
        </div>
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-neutral-600 font-medium rounded-xl hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>
    );
  }

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

  // form view
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Share Your Calculation" onClose={onClose} />
      <div className="px-6 py-5 space-y-4">
        {/* URL row */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Your shareable link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0 px-3 py-2.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-xs text-neutral-500 font-mono truncate flex items-center">
              {url}
            </div>
            <button
              onClick={handleCopy}
              className={`shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                copied
                  ? "bg-secondary-base text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Recipient email */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Share with (email address)
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => {
              setRecipientEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleShare();
            }}
            placeholder="friend@example.com"
            autoFocus
            className={`w-full px-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 transition-colors ${
              emailError
                ? "border-error-base focus:ring-error-light"
                : "border-accent-orange-base focus:ring-accent-orange-base focus:ring-opacity-40"
            }`}
          />
          {emailError && (
            <p className="text-sm text-error-base mt-1">{emailError}</p>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-neutral-600 font-medium rounded-xl hover:bg-neutral-100 transition-colors"
        >
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
    </Modal>
  );
}
