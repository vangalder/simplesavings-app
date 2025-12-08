"use client";

import { useState, useEffect, useMemo } from "react";
import AnimatedNumber from "react-animated-numbers";

interface AnimatedNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  step?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  shouldAnimate?: boolean;
}

export default function AnimatedNumberInput({
  value,
  onChange,
  step = "0.01",
  min,
  max,
  placeholder = "0",
  className = "",
  shouldAnimate = false,
}: AnimatedNumberInputProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);

  // Animate from 0 to target value on initial load
  useEffect(() => {
    if (shouldAnimate && !hasAnimated) {
      if (value !== 0) {
        setIsAnimating(true);
        setDisplayValue(0);
        // Small delay to ensure state is set, then animate to target
        const timer = setTimeout(() => {
          setDisplayValue(value);
          // Animation duration is controlled by AnimatedNumber transitions
          setTimeout(() => {
            setIsAnimating(false);
            setHasAnimated(true);
          }, 1200);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        // Value is 0, no need to animate
        setHasAnimated(true);
        setDisplayValue(0);
      }
    } else if (!shouldAnimate || hasAnimated) {
      setDisplayValue(value);
    }
  }, [value, shouldAnimate, hasAnimated]);

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === "") {
      onChange(0);
      return;
    }
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
      setHasAnimated(true); // Mark as animated so it doesn't re-animate
    }
  };

  // Format the number for display
  const formatValue = (val: number): string => {
    if (val === 0) return "";
    if (step === "1") {
      return Math.floor(val).toString();
    }
    if (step === "0.1") {
      return val.toFixed(1);
    }
    return val.toFixed(2);
  };

  // Get number parts for animation
  const getNumberParts = (val: number) => {
    const num = Math.abs(val);
    const integer = Math.floor(num);
    const decimal = Math.round((num - integer) * 100);
    return { integer, decimal };
  };

  const { integer, decimal } = getNumberParts(displayValue);

  if (isAnimating && shouldAnimate && !hasAnimated && displayValue > 0) {
    // Show animated display styled like input
    return (
      <div className={`${className} flex items-center justify-center bg-white`}>
        <div className="inline-flex items-baseline">
          <AnimatedNumber
            animateToNumber={integer}
            useThousandsSeparator={true}
            locale="en-US"
            transitions={(index) => ({
              type: "spring",
              mass: 1,
              stiffness: 200 - index * 20,
              damping: 100 + index * 10,
            })}
          />
          {step !== "1" && (
            <>
              <span className="mx-0.5">.</span>
              <AnimatedNumber
                animateToNumber={Math.floor(decimal / 10)}
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
                animateToNumber={decimal % 10}
                useThousandsSeparator={false}
                locale="en-US"
                transitions={(index) => ({
                  type: "spring",
                  mass: 1,
                  stiffness: 200 - index * 20,
                  damping: 100 + index * 10,
                })}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  // Show regular input field
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={formatValue(value) || ""}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
