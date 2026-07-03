"use client";

import { useRef, useEffect } from "react";
import AnimatedNumber from "react-animated-numbers";
import { getCurrencyMeta, isCryptoCurrency, formatCurrency } from "@/lib/currency";

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  locale?: string;
  currency?: string;
}

const sizeClasses = { sm: "text-lg", md: "text-xl", lg: "text-2xl", xl: "text-4xl md:text-5xl" };

function getDecimalSeparator(locale: string): string {
  return (
    new Intl.NumberFormat(locale).formatToParts(1.1).find((p) => p.type === "decimal")?.value ?? "."
  );
}

function getGroupSeparator(locale: string): string {
  return (
    new Intl.NumberFormat(locale).formatToParts(1234567).find((p) => p.type === "group")?.value ?? ","
  );
}

const DISPLAY_FONT = { fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" };

interface FiatSymbolInfo {
  symbol: string;
  position: "before" | "after";
  spacing: string;
}

function getFiatSymbolInfo(locale: string, currencyCode: string): FiatSymbolInfo {
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).formatToParts(1234);
    const symIdx = parts.findIndex((p) => p.type === "currency");
    const intIdx = parts.findIndex((p) => p.type === "integer");
    const isBefore = symIdx < intIdx;
    const symbol = parts[symIdx]?.value ?? currencyCode;
    const adjacentIdx = isBefore ? symIdx + 1 : symIdx - 1;
    const adjacent = parts[adjacentIdx];
    const spacing = adjacent?.type === "literal" ? adjacent.value : "";
    return { symbol, position: isBefore ? "before" : "after", spacing };
  } catch {
    return { symbol: currencyCode, position: "before", spacing: "" };
  }
}

export default function AnimatedCurrency({
  value,
  className = "",
  size = "md",
  locale = "en",
  currency = "USD",
}: AnimatedCurrencyProps) {
  const prevValueRef = useRef<number | null>(null);

  const safeValue = isNaN(value) || !isFinite(value) ? 0 : Math.max(0, value);

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  // Crypto: no animation complexity, just a static formatted string that updates
  if (isCryptoCurrency(currency)) {
    return (
      <div className={`inline-flex items-baseline font-display ${sizeClasses[size]} ${className}`}>
        <span>{formatCurrency(safeValue, currency, locale)}</span>
      </div>
    );
  }

  // Fiat: animated digit-by-digit with locale-aware separators, symbol, and symbol position
  const meta = getCurrencyMeta(currency);
  const decimalSep = getDecimalSeparator(locale);
  const { symbol, position, spacing } = getFiatSymbolInfo(locale, meta.code);

  // When a locale groups thousands with a space (fr, ru, pl, sv…), react-animated-numbers
  // renders that space in a full digit-width column, leaving an oversized gap. For those
  // locales we render the integer digit-by-digit with a tight, native-width separator.
  // Comma/period locales stay on the library path (the glyph fills the column fine).
  const sepIsSpace = /\s/.test(getGroupSeparator(locale));

  const integerValue = Math.floor(safeValue);
  const decimalValue = Math.round((safeValue - integerValue) * 100);
  const decimalTens = Math.floor(decimalValue / 10);
  const decimalOnes = decimalValue % 10;

  const springProps = (index: number) => ({
    type: "spring" as const,
    mass: 1,
    stiffness: 200 - index * 20,
    damping: 100 + index * 10,
  });

  return (
    <div className={`inline-flex items-baseline font-display ${sizeClasses[size]} ${className}`}>
      {position === "before" && <span className="mr-0.5">{symbol}{spacing}</span>}
      {sepIsSpace ? (
        // Space-separator locales: render digit-by-digit with a tight native gap.
        <span className="inline-flex items-baseline">
          {String(integerValue).split("").map((d, i, arr) => (
            <span key={`ig-${i}`} className="inline-flex items-baseline">
              {i > 0 && (arr.length - i) % 3 === 0 && (
                <span aria-hidden style={{ display: "inline-block", width: "0.22em" }} />
              )}
              <AnimatedNumber
                key={`id-${i}-${d}`}
                animateToNumber={Number(d)}
                useThousandsSeparator={false}
                locale={locale}
                fontStyle={DISPLAY_FONT}
                transitions={springProps}
              />
            </span>
          ))}
        </span>
      ) : (
        <AnimatedNumber
          key={`int-${integerValue}`}
          animateToNumber={integerValue}
          useThousandsSeparator={true}
          locale={locale}
          fontStyle={DISPLAY_FONT}
          transitions={springProps}
        />
      )}
      <span className="mx-0.5">{decimalSep}</span>
      <span className="inline-flex">
        <AnimatedNumber
          key={`dec-tens-${decimalTens}`}
          animateToNumber={decimalTens}
          useThousandsSeparator={false}
          locale={locale}
          fontStyle={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          transitions={springProps}
        />
        <AnimatedNumber
          key={`dec-ones-${decimalOnes}`}
          animateToNumber={decimalOnes}
          useThousandsSeparator={false}
          locale={locale}
          fontStyle={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          transitions={springProps}
        />
      </span>
      {position === "after" && <span className="ml-0.5">{spacing}{symbol}</span>}
    </div>
  );
}
