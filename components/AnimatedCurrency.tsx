"use client";

import AnimatedNumber from "react-animated-numbers";

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
      <AnimatedNumber
        animateToNumber={integerValue}
        useThousandsSeparator={true}
        locale="en-US"
        transitions={(index) => ({
          type: "spring",
          mass: 1,
          stiffness: 200 - index * 20,
          damping: 100 + index * 10,
        })}
      />
      <span className="mx-0.5">.</span>
      <span className="inline-flex">
        <AnimatedNumber
          animateToNumber={decimalTens}
          useThousandsSeparator={false}
          locale="en-US"
          transitions={(index) => ({
            type: "spring",
            mass: 1,
            stiffness: 200 - index * 20,
            damping: 100 + index * 10,
          })}
        />
        <AnimatedNumber
          animateToNumber={decimalOnes}
          useThousandsSeparator={false}
          locale="en-US"
          transitions={(index) => ({
            type: "spring",
            mass: 1,
            stiffness: 200 - index * 20,
            damping: 100 + index * 10,
          })}
        />
      </span>
    </div>
  );
}
