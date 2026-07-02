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

export const metadata: Metadata = {
  title: "simplesavings.app — Your AI Savings Strategist",
  description:
    "A savings calculator with an AI strategist built in: model your money, then talk through how to reach your goal faster. Free to start.",
  other: { google: "notranslate" },
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
