"use client";

import { AnimatedNumbers } from "react-animated-numbers";

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function AnimatedCurrency({ value, className = "", size = "md" }: AnimatedCurrencyProps) {
  // Determine size classes
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-4xl md:text-5xl",
  };

  // Format the number to extract currency symbol
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const parts = formatter.formatToParts(value);
  const currencySymbol = parts.find((part) => part.type === "currency")?.value || "$";

  // Extract integer and decimal parts
  const integerPart = parts
    .filter((part) => part.type === "integer" || part.type === "group")
    .map((part) => part.value)
    .join("");

  const decimalPart = parts
    .filter((part) => part.type === "fraction")
    .map((part) => part.value)
    .join("");

  // Convert to numbers for animation
  const integerValue = parseInt(integerPart.replace(/,/g, "")) || 0;
  const decimalValue = parseInt(decimalPart) || 0;

  // For decimal, we need to ensure it's always 2 digits
  // Animate each digit separately for better odometer effect
  const decimalTens = Math.floor(decimalValue / 10);
  const decimalOnes = decimalValue % 10;

  return (
    <div className={`inline-flex items-baseline ${sizeClasses[size]} ${className}`}>
      <span className="mr-1">{currencySymbol}</span>
      <AnimatedNumbers
        includeComma={true}
        animateToNumber={integerValue}
        locale="en-US"
        configs={[
          { mass: 1, tension: 220, friction: 100 },
          { mass: 1, tension: 180, friction: 130 },
          { mass: 1, tension: 280, friction: 90 },
          { mass: 1, tension: 180, friction: 135 },
          { mass: 1, tension: 200, friction: 120 },
        ]}
      />
      <span className="mx-0.5">.</span>
      <span className="inline-flex">
        <AnimatedNumbers
          includeComma={false}
          animateToNumber={decimalTens}
          locale="en-US"
          configs={[
            { mass: 1, tension: 220, friction: 100 },
            { mass: 1, tension: 180, friction: 130 },
            { mass: 1, tension: 280, friction: 90 },
            { mass: 1, tension: 180, friction: 135 },
            { mass: 1, tension: 200, friction: 120 },
          ]}
        />
        <AnimatedNumbers
          includeComma={false}
          animateToNumber={decimalOnes}
          locale="en-US"
          configs={[
            { mass: 1, tension: 220, friction: 100 },
            { mass: 1, tension: 180, friction: 130 },
            { mass: 1, tension: 280, friction: 90 },
            { mass: 1, tension: 180, friction: 135 },
            { mass: 1, tension: 200, friction: 120 },
          ]}
        />
      </span>
    </div>
  );
}
