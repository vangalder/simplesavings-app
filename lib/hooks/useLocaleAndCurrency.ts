"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { CURRENCY_STORAGE_KEY, CURRENCY_CHANGED_EVENT, DEFAULT_CURRENCY } from "@/lib/currency";
import { localeCurrency, type Locale } from "@/i18n/config";

export function useLocaleAndCurrency() {
  const locale = useLocale();
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    // On mount or locale change: read stored preference, fall back to locale default
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    setCurrency(stored || localeCurrency[locale as Locale] || DEFAULT_CURRENCY);

    const handler = (e: Event) => {
      setCurrency((e as CustomEvent<string>).detail);
    };
    window.addEventListener(CURRENCY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CURRENCY_CHANGED_EVENT, handler);
  }, [locale]);

  return { locale, currency };
}
