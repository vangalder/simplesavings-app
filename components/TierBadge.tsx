"use client";

type Tier = "anonymous" | "registered" | "pro";

const styles: Record<Tier, string> = {
  anonymous: "bg-neutral-200 text-neutral-600",
  registered: "bg-primary-base text-white",
  pro: "bg-gradient-to-r from-accent-orange-base to-accent-base text-neutral-900",
};

const labels: Record<Tier, string> = {
  anonymous: "Free",
  registered: "Registered",
  pro: "Pro",
};

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export default function TierBadge({ tier, className = "" }: TierBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${styles[tier]} ${className}`}
    >
      {labels[tier]}
    </span>
  );
}
