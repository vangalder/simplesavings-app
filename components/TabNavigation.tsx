"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function TabNavigation() {
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

  return (
    <nav className="w-full bg-secondary-light md:bg-header-dark">
      <div className="container mx-auto px-4 md:px-6">
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
                    ? "bg-accent-orange-base md:bg-primary-light text-white rounded-t-lg"
                    : `text-secondary-base md:text-white ${isLast ? "rounded-tr-lg" : ""
                    } ${isFirst ? "rounded-tl-lg" : ""} hover:bg-primary-base/50`
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
