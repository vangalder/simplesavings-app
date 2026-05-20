export type CurrencyCode = 'USD' | 'MXN' | 'EUR' | 'BRL' | 'BTC' | 'ETH' | 'SOL';

interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  isCrypto: boolean;
  decimals: number;
  group: 'fiat' | 'crypto';
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'USD', name: 'US Dollar',       symbol: '$',   isCrypto: false, decimals: 2, group: 'fiat' },
  { code: 'MXN', name: 'Mexican Peso',    symbol: 'MX$', isCrypto: false, decimals: 2, group: 'fiat' },
  { code: 'EUR', name: 'Euro',            symbol: '€',   isCrypto: false, decimals: 2, group: 'fiat' },
  { code: 'BRL', name: 'Brazilian Real',  symbol: 'R$',  isCrypto: false, decimals: 2, group: 'fiat' },
  { code: 'BTC', name: 'Bitcoin',         symbol: '₿',   isCrypto: true,  decimals: 8, group: 'crypto' },
  { code: 'ETH', name: 'Ethereum',        symbol: 'Ξ',   isCrypto: true,  decimals: 6, group: 'crypto' },
  { code: 'SOL', name: 'Solana',          symbol: '◎',   isCrypto: true,  decimals: 4, group: 'crypto' },
];

export function isCryptoCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code)?.isCrypto ?? false;
}

export function getCurrencyMeta(code: string): CurrencyMeta {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0];
}

function formatCrypto(value: number, meta: CurrencyMeta, locale: string = 'en'): string {
  // Intl.NumberFormat gives proper thousands grouping and locale-aware decimal separator
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: meta.decimals,
  }).format(value);
  return `${meta.symbol} ${formatted}`;
}

export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en'
): string {
  const meta = getCurrencyMeta(currency);
  if (meta.isCrypto) return formatCrypto(value, meta, locale);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: meta.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${meta.symbol}${value.toFixed(2)}`;
  }
}

export function formatCurrencyCompact(
  value: number,
  currency: string = 'USD',
  locale: string = 'en'
): string {
  const meta = getCurrencyMeta(currency);
  if (meta.isCrypto) {
    // Compact crypto: show fewer decimals for readability on chart axes
    const formatted = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
    return `${meta.symbol} ${formatted}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: meta.code,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatCurrency(value, currency, locale);
  }
}

export const DEFAULT_CURRENCY = 'USD';
export const CURRENCY_STORAGE_KEY = 'simplesavings-currency';
export const CURRENCY_CHANGED_EVENT = 'simplesavings:currency-changed';
