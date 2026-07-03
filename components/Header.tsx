"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk, SignInButton } from "@clerk/nextjs";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import CurrencyPicker from "@/components/CurrencyPicker";
import LanguagePicker from "@/components/LanguagePicker";

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ── Tier helpers ──────────────────────────────────────────────────────────────

type Tier = "Pro" | "Pro Sample" | "Free";

function resolveTier(balance: { granted: number; used: number; isPro?: boolean } | null | undefined): Tier {
  if (!balance) return "Free";
  if (balance.isPro) return "Pro";
  if (balance.granted > 0) return "Pro Sample";
  return "Free";
}

const TIER_STYLES: Record<Tier, string> = {
  "Pro":        "bg-gradient-to-r from-accent-orange-base to-accent-base text-neutral-900",
  "Pro Sample": "bg-amber-100 text-amber-800",
  "Free":       "bg-neutral-200 text-neutral-600",
};

// ── Custom user dropdown ───────────────────────────────────────────────────────

function UserDropdown() {
  const { user, isSignedIn } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const clerkId = user?.id ?? "";

  // Provision a Convex user row once the Convex token is attached (self-healing;
  // independent of the Clerk webhook). Gate on isConvexAuthed, not isSignedIn, or
  // it fires before auth and throws "Not authenticated".
  const { isAuthenticated: isConvexAuthed } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  useEffect(() => {
    if (isConvexAuthed) ensureUser({}).catch(() => {});
  }, [isConvexAuthed, ensureUser]);

  const creditBalance = useQuery(
    api.users.getAiCreditBalance,
    isConvexAuthed ? {} : "skip"
  );
  // Admins can set test mode in the admin panel — read it so the tier badge
  // reflects the active test mode even before a test checkout is triggered.
  const testMode = useQuery(
    api.appConfig.getConfig,
    isAdmin ? { key: "paymentTestMode" } : "skip"
  );
  const tokenStats = useQuery(
    api.users.getTokenStats,
    isAdmin && isConvexAuthed ? {} : "skip"
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="text-sm font-medium text-white bg-primary-base/40 hover:bg-primary-base/60 px-3 py-1.5 rounded-lg transition-colors">
          Sign in
        </button>
      </SignInButton>
    );
  }

  // Only use imageUrl when it's a real photo (uploaded or from Google), not
  // Clerk's generated default — for photo-less accounts we render initials.
  const avatarUrl = user.hasImage ? user.imageUrl : null;
  const initials = (
    user.firstName?.[0] ??
    user.fullName?.[0] ??
    user.primaryEmailAddress?.emailAddress?.[0] ??
    "?"
  ).toUpperCase();
  // Admins: if test mode is active, show the test tier rather than the real balance tier
  const baseTier = resolveTier(creditBalance);
  const isProSampleTestMode = testMode === "sample" || testMode === "true";
  const tier: Tier =
    isAdmin && testMode === "pro"   ? "Pro"        :
    isAdmin && isProSampleTestMode  ? "Pro Sample" :
    baseTier;
  const granted = creditBalance?.granted ?? 0;
  const used = creditBalance?.used ?? 0;
  const pct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;
  const showUsage = tier === "Pro Sample";

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-white/40 transition-all focus:outline-none focus-visible:ring-white/60"
        aria-label="Open account menu"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={user.fullName ?? "Account"} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-base to-secondary-base flex items-center justify-center text-white text-sm font-semibold">
            {initials}
          </div>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-[200]">

          {/* Identity row */}
          <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-neutral-100">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-base to-secondary-base flex items-center justify-center shrink-0 text-white font-semibold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{user.fullName ?? "—"}</p>
              <p className="text-xs text-neutral-500 truncate">{user.primaryEmailAddress?.emailAddress}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${TIER_STYLES[tier]}`}>
                {tier}
              </span>
            </div>
          </div>

          {/* Usage block — Pro Sample tier only */}
          {showUsage && (
            <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50/70">
              <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1.5">Usage</p>
              {isAdmin && (
                <p className="text-[10px] text-neutral-500 font-mono tabular-nums mb-1.5">
                  {(tokenStats?.tokensUsed ?? 0).toLocaleString()} tokens · ${(used / 100).toFixed(4)} / ${(granted / 100).toFixed(2)} ({pct}%)
                </p>
              )}
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${pct > 80 ? "bg-gradient-to-r from-red-400 to-red-500" : "bg-gradient-to-r from-primary-base to-primary-base/80"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Nav actions */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); openUserProfile(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 shrink-0">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
              Manage account
            </button>
            <button
              onClick={() => { setOpen(false); router.push("/profile"); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 shrink-0">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Profile
            </button>
          </div>

          {/* Sign out */}
          <div className="border-t border-neutral-100 py-1">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors text-left"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 shrink-0">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────

export default function Header() {
  return (
    <header className="w-full bg-header-dark text-white relative z-50">
      <div className="flex items-center justify-between py-2 px-3 md:px-6">
        <Link href="/" className="flex items-center gap-2 md:gap-3 hover:opacity-90 transition-opacity min-w-0">
          <div className="w-9 h-9 md:w-14 md:h-14 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="Simple Savings Logo"
              width={56}
              height={56}
              unoptimized
            />
          </div>
          <span
            className="text-xl md:text-4xl lg:text-5xl font-display font-semibold text-secondary-light leading-none truncate"
            style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          >
            simplesavings.app
          </span>
        </Link>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <LanguagePicker compact />
          <CurrencyPicker compact />
          {isClerkConfigured && <UserDropdown />}
        </div>
      </div>
    </header>
  );
}
