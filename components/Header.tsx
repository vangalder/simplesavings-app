"use client";

import Image from "next/image";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import CurrencyPicker from "@/components/CurrencyPicker";
import LanguagePicker from "@/components/LanguagePicker";

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AuthControls() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return <div className="w-8 h-8 rounded-full bg-primary-base/30 animate-pulse" />;

  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: { avatarBox: "w-8 h-8" },
        }}
      />
    );
  }

  return (
    <SignInButton mode="modal">
      <button className="text-sm font-medium text-white bg-primary-base/40 hover:bg-primary-base/60 px-3 py-1.5 rounded-lg transition-colors">
        Sign in
      </button>
    </SignInButton>
  );
}

export default function Header() {
  return (
    <header className="w-full bg-header-dark text-white relative z-50">
      <div className="flex items-center justify-between py-2 px-3 md:px-6">
        <div className="flex items-center gap-2 md:gap-3">
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
            className="text-xl md:text-4xl lg:text-5xl font-display font-semibold text-secondary-light leading-none"
            style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          >
            simplesavings.app
          </span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <LanguagePicker compact />
          <CurrencyPicker compact />
          {isClerkConfigured && <AuthControls />}
        </div>
      </div>
    </header>
  );
}
