"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Calculator");

  const tabs = [
    { id: "Calculator", label: "Calculator", path: "/" },
    { id: "Insights", label: "Insights ✨", path: "/insights" },
    { id: "Profile", label: "Profile", path: "/profile" },
  ];

  useEffect(() => {
    // Set active tab based on current pathname
    const currentTab = tabs.find(tab => tab.path === pathname) || tabs[0];
    setActiveTab(currentTab.id);
  }, [pathname]);

  const handleTabClick = (tab: typeof tabs[0]) => {
    setActiveTab(tab.id);
    router.push(tab.path);
  };

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
        // User cancelled or error occurred
        console.log("Share cancelled or failed");
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
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
      <div className="flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="Simple Savings Logo"
              width={32}
              height={32}
              className="brightness-0 invert"
            />
          </div>
          <span className="text-xl font-display font-semibold text-white">
            simplesavings.app
          </span>
        </div>

        {/* Share icon on desktop */}
        <button
          onClick={handleShare}
          className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-primary-base transition-colors"
          aria-label="Share"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
      </div>

      {/* Navigation tabs */}
      <nav className="border-t border-primary-base">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === tab.id
                  ? "bg-accent-orange-base md:bg-primary-base text-white"
                  : "text-neutral-300 hover:text-white hover:bg-primary-base"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
