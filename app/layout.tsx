import type { Metadata } from "next";
import { Inter, Space_Grotesk, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import SvgPalmOverlays from "@/components/SvgPalmOverlays";
import { Toaster } from "sonner";
import { Providers } from "@/app/providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
});

const OG_TITLE = "simplesavings.app — Plan your savings, reach your goal faster";
const OG_DESC =
  "A savings calculator that shows your money's future — and helps you plan how to reach your goal faster. Free to start.";

export const metadata: Metadata = {
  metadataBase: new URL("https://simplesavings.app"),
  title: OG_TITLE,
  description: OG_DESC,
  other: { google: "notranslate" },
  openGraph: {
    type: "website",
    siteName: "simplesavings.app",
    url: "https://simplesavings.app",
    title: OG_TITLE,
    description: OG_DESC,
    // Default card; the home page overrides this per shared scenario (see
    // app/page.tsx generateMetadata) so a shared link shows that plan's number.
    images: [{ url: "/og", width: 1200, height: 630, alt: "simplesavings.app" }],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESC,
    images: ["/og"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} translate="no" className="notranslate">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7SSJWHL9D0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7SSJWHL9D0');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${robotoMono.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <SvgPalmOverlays />
            {children}
            <Toaster richColors position="bottom-right" duration={3000} closeButton />
            <Analytics />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
