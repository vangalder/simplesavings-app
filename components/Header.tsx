"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Calculator");

  const tabs = useMemo(
    () => [
      { id: "Calculator", label: "Calculator", path: "/" },
      { id: "Insights", label: "Insights ✨", path: "/insights" },
      { id: "Profile", label: "Profile", path: "/profile" },
    ],
    []
  );

  useEffect(() => {
    // Set active tab based on current pathname
    const currentTab = tabs.find(tab => tab.path === pathname) || tabs[0];
    setActiveTab(currentTab.id);
  }, [pathname, tabs]);

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

      {/* Navigation tabs - Mobile: light green bg with orange active, Desktop: dark green bg with lighter green active */}
      <nav className={`w-full ${activeTab === "Calculator" && "md:bg-header-dark"} bg-secondary-light md:bg-header-dark`}>
        <div className="flex w-full">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const isLast = index === tabs.length - 1;
            const isFirst = index === 0;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${isActive
                  ? "bg-accent-orange-base md:bg-primary-light text-white rounded-t-lg md:rounded-lg"
                  : `text-secondary-base md:text-white ${isLast ? "rounded-tr-lg md:rounded-r-lg" : ""
                  } ${isFirst ? "rounded-tl-lg md:rounded-l-lg" : ""
                  } hover:bg-primary-base/50`
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
