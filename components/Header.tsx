"use client";

import Image from "next/image";
import { toast } from "sonner";

export default function Header() {
  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Simple Savings Calculator",
          text: "Check out this savings calculator!",
          url: url,
        });
      } catch (err) {
        // User cancelled or error occurred - silent failure expected
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    <header className="w-full bg-header-dark text-white relative z-10">
      {/* Status bar placeholder for mobile */}
      <div className="h-6 md:hidden bg-header-dark"></div>

      {/* Logo and branding */}
      <div className="flex items-center justify-between py-2 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Simple Savings Logo"
              width={64}
              height={64}
              unoptimized
            />
          </div>
          <span
            className="text-4xl md:text-5xl font-display font-semibold text-secondary-light"
            style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          >
            simplesavings.app
          </span>
        </div>

        {/* Share icon - Desktop only */}
        <button
          onClick={handleShare}
          className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-primary-base/50 transition-colors"
          aria-label="Share"
        >
          <Image
            src="/Icon-share.svg"
            alt="Share"
            width={20}
            height={20}
            className="brightness-0 invert"
            unoptimized
          />
        </button>
      </div>
    </header>
  );
}
