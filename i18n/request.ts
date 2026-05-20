import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from './config';

function detectLocaleFromHeader(acceptLanguage: string): Locale {
  const parts = acceptLanguage.split(',').map((p) => p.split(';')[0].trim());
  for (const tag of parts) {
    const match = locales.find(
      (l) => l.toLowerCase() === tag.toLowerCase() || l.toLowerCase().startsWith(tag.toLowerCase().split('-')[0])
    );
    if (match) return match;
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale)
      ? cookieLocale
      : detectLocaleFromHeader(headerStore.get('accept-language') || '');

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
