"use client";

import { useState } from "react";

export default function Header() {
  const [activeTab, setActiveTab] = useState("Calculator");

  const tabs = [
    { id: "Calculator", label: "Calculator" },
    { id: "Insights", label: "Insights ✨" },
    { id: "Profile", label: "Profile" },
  ];

  return (
    <header className="w-full">
      {/* Status bar placeholder for mobile */}
      <div className="h-6 md:hidden bg-neutral-50"></div>
      
      {/* Logo and branding */}
      <div className="flex items-center justify-center py-4 px-4">
        <div className="flex items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary-base"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="currentColor"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xl font-display font-semibold text-primary-base">
            simplesavings.app
          </span>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="border-b border-neutral-200">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary-base border-b-2 border-primary-base"
                  : "text-neutral-600 hover:text-neutral-900"
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
