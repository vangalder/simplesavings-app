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
  // When set, display up to this many decimals with trailing zeros trimmed
  // (e.g. 5.25 → "5.25", 10 → "10"). Overrides the step-based formatting.
  maxFractionDigits?: number;
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
  maxFractionDigits,
}: AnimatedNumberInputProps) {
  const rawFormat = useCallback((val: number): string => {
    if (maxFractionDigits !== undefined) {
      return parseFloat(val.toFixed(maxFractionDigits)).toString();
    }
    if (step === "1") return Math.floor(val).toString();
    if (step === "0.1") return val.toFixed(1);
    return val.toFixed(2);
  }, [step, maxFractionDigits]);

  const withSeparators = (formatted: string): string => {
    const parts = formatted.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const formatValue = useCallback((val: number): string => {
    return withSeparators(rawFormat(val));
  }, [rawFormat]);

  const getInitialValue = (val: number): string => {
    return withSeparators(rawFormat(val));
  };

  const [showAnimation, setShowAnimation] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [inputValue, setInputValue] = useState<string>(() => getInitialValue(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  const pendingCursorRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setInputValue(formatValue(value));
    }
  }, [value, formatValue]);

  useEffect(() => {
    if (shouldAnimate && !hasAnimated && value !== 0) {
      setShowAnimation(true);
      const timer = setTimeout(() => {
        setShowAnimation(false);
        setHasAnimated(true);
        setInputValue(formatValue(value));
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setShowAnimation(false);
      setHasAnimated(true);
    }
  }, [shouldAnimate, hasAnimated, value, formatValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    setInputValue(raw);
    if (raw === "" || raw === "-") { onChange(0); return; }
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      let clamped = num;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      onChange(clamped);
    }
  };

  // Keep commas on focus so the cursor position the user clicked on stays accurate for arrow keys.
  const handleFocus = () => { isFocusedRef.current = true; };

  const handleBlur = () => {
    isFocusedRef.current = false;
    setInputValue(formatValue(value));
  };

  // Restore cursor after arrow-key updates re-render the input value.
  useEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const pos = pendingCursorRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      pendingCursorRef.current = null;
    }
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();

    const input = inputRef.current;
    if (!input) return;

    const direction = e.key === "ArrowUp" ? 1 : -1;
    const cursorPos = input.selectionStart ?? 0;
    // Read the live DOM value — may have commas (before first arrow press) or not.
    const displayVal = input.value;
    const rawVal = displayVal.replace(/,/g, "");
    const dotIdx = displayVal.indexOf(".");

    let increment: number;
    if (dotIdx !== -1 && cursorPos > dotIdx) {
      // Decimal region: distance after dot determines the decimal place.
      const decimalPos = cursorPos - dotIdx; // 1 = tenths, 2 = hundredths, …
      increment = Math.max(Math.pow(10, -decimalPos), parseFloat(step));
    } else {
      // Integer region: count digit characters to the right of the cursor (before the dot).
      // That count IS the place-value exponent: 4 digits to the right → 10^3 = 1,000.
      const intPart = dotIdx !== -1 ? displayVal.slice(0, dotIdx) : displayVal;
      const digitCount = (intPart.slice(cursorPos).match(/\d/g) ?? []).length;
      increment = digitCount > 0 ? Math.pow(10, digitCount - 1) : 1;
    }

    const current = parseFloat(rawVal) || 0;
    let newValue = current + direction * increment;
    // Eliminate floating-point noise from decimal steps.
    newValue = Math.round(newValue * 1e9) / 1e9;
    if (min !== undefined && newValue < min) newValue = min;
    if (max !== undefined && newValue > max) newValue = max;

    onChange(newValue);
    const newFormatted = formatValue(newValue);
    setInputValue(newFormatted);

    // Restore cursor to the same logical place in the new formatted string.
    const newDotIdx = newFormatted.indexOf(".");

    if (dotIdx !== -1 && cursorPos > dotIdx) {
      // Decimal: keep same distance from the dot.
      pendingCursorRef.current = newDotIdx !== -1
        ? Math.min(newDotIdx + (cursorPos - dotIdx), newFormatted.length)
        : newFormatted.length;
    } else {
      // Integer: anchor by "N digit-chars remain to the right of cursor before the dot".
      const intPart = dotIdx !== -1 ? displayVal.slice(0, dotIdx) : displayVal;
      const digitCount = (intPart.slice(cursorPos).match(/\d/g) ?? []).length;

      if (digitCount === 0) {
        pendingCursorRef.current = newDotIdx !== -1 ? newDotIdx : newFormatted.length;
      } else {
        const newIntPart = newDotIdx !== -1 ? newFormatted.slice(0, newDotIdx) : newFormatted;
        const totalDigits = (newIntPart.match(/\d/g) ?? []).length;
        // Find the position of the (totalDigits − digitCount + 1)-th digit from the left.
        const targetFromLeft = totalDigits - digitCount + 1;
        let seen = 0;
        let pos = newIntPart.length; // fallback: end of integer part
        for (let i = 0; i < newIntPart.length; i++) {
          if (/\d/.test(newIntPart[i])) {
            seen++;
            if (seen === targetFromLeft) { pos = i; break; }
          }
        }
        pendingCursorRef.current = pos;
      }
    }
  };

  if (showAnimation && shouldAnimate && !hasAnimated) {
    const num = Math.abs(value);
    const integer = Math.floor(num);
    const decimal = Math.round((num - integer) * 100);
    return (
      <div className={`${className} flex items-center justify-center bg-white`}>
        <div
          className="inline-flex items-baseline"
          style={{
            fontSize: "36px",
            fontFamily: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "#F58634",
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

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      style={{
        fontSize: "36px",
        fontFamily: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#F58634",
        fontWeight: 600,
      }}
    />
  );
}
