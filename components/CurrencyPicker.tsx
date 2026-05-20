"use client";

import { useState, useEffect, useRef } from "react";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, CURRENCY_STORAGE_KEY, CURRENCY_CHANGED_EVENT, type CurrencyCode } from "@/lib/currency";

interface CurrencyPickerProps {
  value?: string;
  onChange?: (currency: CurrencyCode) => void;
  compact?: boolean;
}

const fiat = SUPPORTED_CURRENCIES.filter((c) => c.group === "fiat");
const crypto = SUPPORTED_CURRENCIES.filter((c) => c.group === "crypto");

export default function CurrencyPicker({ value, onChange, compact = false }: CurrencyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<string>(value ?? DEFAULT_CURRENCY);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) return;
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored) setCurrent(stored);

    const handler = (e: Event) => {
      setCurrent((e as CustomEvent<string>).detail);
    };
    window.addEventListener(CURRENCY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CURRENCY_CHANGED_EVENT, handler);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const select = (code: CurrencyCode) => {
    setCurrent(code);
    localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent(CURRENCY_CHANGED_EVENT, { detail: code }));
    onChange?.(code);
    setIsOpen(false);
  };

  const currentMeta = SUPPORTED_CURRENCIES.find((c) => c.code === current);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary-base/20 hover:bg-primary-base/30 text-white text-sm font-medium transition-colors min-h-[36px]"
        aria-label={`Currency: ${current}`}
      >
        <span className="font-mono text-xs">{currentMeta?.symbol}</span>
        {!compact && <span>{current}</span>}
        <svg className="w-3 h-3 opacity-70" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden z-50">
          <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-100">
            Fiat
          </div>
          {fiat.map((c) => (
            <button
              key={c.code}
              onClick={() => select(c.code as CurrencyCode)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors ${current === c.code ? "text-primary-base font-semibold bg-primary-base/5" : "text-neutral-700"}`}
            >
              <span className="font-mono w-5 text-center">{c.symbol}</span>
              <span>{c.code}</span>
              <span className="ml-auto text-neutral-400 text-xs">{c.name}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-t border-b border-neutral-100">
            Crypto
          </div>
          {crypto.map((c) => (
            <button
              key={c.code}
              onClick={() => select(c.code as CurrencyCode)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors ${current === c.code ? "text-primary-base font-semibold bg-primary-base/5" : "text-neutral-700"}`}
            >
              <span className="font-mono w-5 text-center">{c.symbol}</span>
              <span>{c.code}</span>
              <span className="ml-auto text-neutral-400 text-xs">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
