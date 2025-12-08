"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  // Format the number for display (only when not focused)
  const formatValue = useCallback((val: number): string => {
    let formatted: string;
    if (step === "1") {
      formatted = Math.floor(val).toString();
    } else if (step === "0.1") {
      formatted = val.toFixed(1);
    } else {
      formatted = val.toFixed(2);
    }

    // Add comma separators for thousands, millions, etc.
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }, [step]);

  // Helper to format initial value
  const getInitialValue = (val: number): string => {
    let formatted: string;
    if (step === "1") {
      formatted = Math.floor(val).toString();
    } else if (step === "0.1") {
      formatted = val.toFixed(1);
    } else {
      formatted = val.toFixed(2);
    }

    // Add comma separators for thousands, millions, etc.
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const [showAnimation, setShowAnimation] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [inputValue, setInputValue] = useState<string>(() => getInitialValue(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);

  // Initialize input value from prop
  useEffect(() => {
    if (!isFocusedRef.current) {
      const formatted = formatValue(value);
      setInputValue(formatted);
    }
  }, [value, formatValue]);

  // Only show animation on initial load when shouldAnimate is true
  useEffect(() => {
    if (shouldAnimate && !hasAnimated && value !== 0) {
      setShowAnimation(true);
      // After animation completes, switch to normal input
      const timer = setTimeout(() => {
        setShowAnimation(false);
        setHasAnimated(true);
        const formatted = formatValue(value);
        setInputValue(formatted);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setShowAnimation(false);
      setHasAnimated(true);
    }
  }, [shouldAnimate, hasAnimated, value, formatValue]);

  // Handle input changes - preserve cursor position
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Strip commas for easier editing while typing
    const valueWithoutCommas = newValue.replace(/,/g, '');
    setInputValue(valueWithoutCommas);

    if (valueWithoutCommas === "" || valueWithoutCommas === "-") {
      onChange(0);
      return;
    }

    const numValue = parseFloat(valueWithoutCommas);
    if (!isNaN(numValue)) {
      // Clamp to min/max if specified
      let clampedValue = numValue;
      if (min !== undefined && clampedValue < min) clampedValue = min;
      if (max !== undefined && clampedValue > max) clampedValue = max;
      onChange(clampedValue);
    }
  };

  // Handle focus - allow free typing (strip commas for easier editing)
  const handleFocus = () => {
    isFocusedRef.current = true;
    // Strip commas when focusing for easier editing
    const valueWithoutCommas = inputValue.replace(/,/g, '');
    setInputValue(valueWithoutCommas);
  };

  // Handle blur - format the value
  const handleBlur = () => {
    isFocusedRef.current = false;
    const formatted = formatValue(value);
    setInputValue(formatted);
  };

  // Show animation only on initial load
  if (showAnimation && shouldAnimate && !hasAnimated) {
    const num = Math.abs(value);
    const integer = Math.floor(num);
    const decimal = Math.round((num - integer) * 100);

    return (
      <div className={`${className} flex items-center justify-center bg-white`}>
        <div
          className="inline-flex items-baseline"
          style={{
            fontSize: '36px',
            fontFamily: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: '#F58634',
            fontWeight: 600,
          }}
        >
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

  // Show normal input field - uncontrolled during typing
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={handleInputChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      style={{
        fontSize: '36px',
        fontFamily: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#F58634',
        fontWeight: 600,
      }}
    />
  );
}
