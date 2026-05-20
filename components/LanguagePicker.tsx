"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { locales, localeNames, localeFlags, LOCALE_COOKIE, type Locale } from "@/i18n/config";

interface LanguagePickerProps {
  currentLocale?: Locale;
  compact?: boolean;
}

export default function LanguagePicker({ currentLocale, compact = false }: LanguagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(currentLocale ?? "en");
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (currentLocale) return;
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith(`${LOCALE_COOKIE}=`));
    if (cookie) {
      const val = cookie.split("=")[1]?.trim() as Locale;
      if (locales.includes(val)) setLocale(val);
    }
  }, [currentLocale]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const select = (loc: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${loc}; path=/; max-age=31536000; SameSite=Lax`;
    setLocale(loc);
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary-base/20 hover:bg-primary-base/30 text-white text-sm font-medium transition-colors min-h-[36px]"
        aria-label={`Language: ${localeNames[locale]}`}
      >
        <span>{localeFlags[locale]}</span>
        {!compact && <span className="hidden sm:inline">{locale.toUpperCase()}</span>}
        <svg className="w-3 h-3 opacity-70" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden z-50">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => select(loc)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-neutral-50 transition-colors ${locale === loc ? "text-primary-base font-semibold bg-primary-base/5" : "text-neutral-700"}`}
            >
              <span className="text-base">{localeFlags[loc]}</span>
              <span>{localeNames[loc]}</span>
              {locale === loc && (
                <svg className="ml-auto w-4 h-4 text-primary-base" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
