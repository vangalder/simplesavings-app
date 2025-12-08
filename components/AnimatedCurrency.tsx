"use client";

import { useRef, useEffect } from "react";
import AnimatedNumber from "react-animated-numbers";

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function AnimatedCurrency({ value, className = "", size = "md" }: AnimatedCurrencyProps) {
  const prevValueRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  // Determine size classes
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-4xl md:text-5xl",
  };

  // Ensure value is a valid number
  const safeValue = isNaN(value) || !isFinite(value) ? 0 : Math.max(0, value);

  // Extract integer and decimal parts directly from the number
  const integerValue = Math.floor(safeValue);
  const decimalValue = Math.round((safeValue - integerValue) * 100);

  // Format to get currency symbol
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const parts = formatter.formatToParts(safeValue);
  const currencySymbol = parts.find((part) => part.type === "currency")?.value || "$";

  // For decimal, we need to ensure it's always 2 digits
  const decimalTens = Math.floor(decimalValue / 10);
  const decimalOnes = decimalValue % 10;

  // Calculate previous values for comparison
  const prevValue = prevValueRef.current ?? 0;
  const prevInteger = Math.floor(prevValue);
  const prevDecimal = Math.round((prevValue - prevInteger) * 100);
  const prevDecimalTens = Math.floor(prevDecimal / 10);
  const prevDecimalOnes = prevDecimal % 10;

  // Update ref after render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    prevValueRef.current = value;
  }, [value]);

  // Always render AnimatedNumber - it will only animate when animateToNumber changes
  // Use keys to ensure proper re-rendering when values change
  return (
    <div className={`inline-flex items-baseline font-display ${sizeClasses[size]} ${className}`}>
      <span className="mr-1">{currencySymbol}</span>
      <AnimatedNumber
        key={`int-${integerValue}`}
        animateToNumber={integerValue}
        useThousandsSeparator={true}
        locale="en-US"
        fontStyle={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
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
          key={`dec-tens-${decimalTens}`}
          animateToNumber={decimalTens}
          useThousandsSeparator={false}
          locale="en-US"
          fontStyle={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          transitions={(index) => ({
            type: "spring",
            mass: 1,
            stiffness: 200 - index * 20,
            damping: 100 + index * 10,
          })}
        />
        <AnimatedNumber
          key={`dec-ones-${decimalOnes}`}
          animateToNumber={decimalOnes}
          useThousandsSeparator={false}
          locale="en-US"
          fontStyle={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
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
