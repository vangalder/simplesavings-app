export const locales = ['en', 'es-MX', 'es-ES', 'it', 'pt-PT', 'pt-BR'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  'en': 'English',
  'es-MX': 'Español (México)',
  'es-ES': 'Español (España)',
  'it': 'Italiano',
  'pt-PT': 'Português (Portugal)',
  'pt-BR': 'Português (Brasil)',
};

export const localeFlags: Record<Locale, string> = {
  'en': '🇺🇸',
  'es-MX': '🇲🇽',
  'es-ES': '🇪🇸',
  'it': '🇮🇹',
  'pt-PT': '🇵🇹',
  'pt-BR': '🇧🇷',
};

export const localeCurrency: Record<Locale, string> = {
  'en': 'USD',
  'es-MX': 'MXN',
  'es-ES': 'EUR',
  'it': 'EUR',
  'pt-PT': 'EUR',
  'pt-BR': 'BRL',
};

export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const CURRENCY_COOKIE = 'PREFERRED_CURRENCY';
