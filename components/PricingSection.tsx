"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { startCheckout } from "@/lib/checkout";

export default function PricingSection() {
  const t = useTranslations("pricing");
  const { isSignedIn } = useUser();

  const proSamplePrice = useQuery(api.appConfig.getConfig, { key: "proSamplePriceDisplay" }) ?? "2.99";
  const proPrice = useQuery(api.appConfig.getConfig, { key: "proPriceDisplay" }) ?? "6.99";
  const access = useQuery(api.users.getAiCreditBalance, isSignedIn ? {} : "skip");
  const isPaid = !!access && (access.isPro || access.granted > access.used);

  const freeFeatures = [t("free.f1"), t("free.f2"), t("free.f3")];
  const sampleFeatures = [t("sample.f1"), t("sample.f2")];
  const proFeatures = [t("pro.f1"), t("pro.f2"), t("pro.f3")];

  return (
    <section id="pricing" className="w-full py-12 md:py-16 relative z-10 scroll-mt-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 font-heading">
            {t("headline")}
          </h2>
          <p className="mt-2 text-neutral-600 max-w-2xl mx-auto">{t("subhead")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-stretch">
          {/* Free */}
          <PricingCard
            title={t("free.title")}
            price="$0"
            cadence={t("free.cadence")}
            features={freeFeatures}
            cta={
              <span className="block w-full py-2.5 px-4 rounded-xl bg-neutral-100 text-neutral-500 font-semibold text-sm text-center">
                {t("free.cta")}
              </span>
            }
          />

          {/* Pro Sample */}
          <PricingCard
            title={t("sample.title")}
            price={`$${proSamplePrice}`}
            cadence={t("sample.cadence")}
            features={sampleFeatures}
            cta={
              !isSignedIn ? (
                <SignInButton mode="modal">
                  <button className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                    {t("sample.cta")}
                  </button>
                </SignInButton>
              ) : isPaid ? (
                <PaidBadge label={t("current")} />
              ) : (
                <button
                  onClick={() => startCheckout("one_time")}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  {t("sample.cta")}
                </button>
              )
            }
          />

          {/* Pro — featured */}
          <PricingCard
            title={t("pro.title")}
            price={`$${proPrice}`}
            cadence={t("pro.cadence")}
            features={proFeatures}
            featured
            cta={
              !isSignedIn ? (
                <SignInButton mode="modal">
                  <button className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-accent-orange-base to-accent-base text-neutral-900 font-semibold text-sm hover:opacity-90 transition-opacity">
                    {t("pro.cta")}
                  </button>
                </SignInButton>
              ) : access?.isPro ? (
                <PaidBadge label={t("onPro")} />
              ) : (
                <button
                  onClick={() => startCheckout("subscription")}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-accent-orange-base to-accent-base text-neutral-900 font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  {t("pro.cta")}
                </button>
              )
            }
          />
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">{t("disclaimer")}</p>
      </div>
    </section>
  );
}

function PricingCard({
  title,
  price,
  cadence,
  features,
  cta,
  featured = false,
}: {
  title: string;
  price: string;
  cadence: string;
  features: string[];
  cta: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white/90 backdrop-blur-sm p-6 ${
        featured ? "border-accent-orange-base shadow-lg" : "border-neutral-200"
      }`}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-neutral-900">{price}</span>
        <span className="text-sm text-neutral-500">{cadence}</span>
      </div>
      <ul className="mt-4 space-y-2 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
            <span className="text-primary-base mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}

function PaidBadge({ label }: { label: string }) {
  return (
    <span className="block w-full py-2.5 px-4 rounded-xl bg-primary-base/10 text-primary-base font-semibold text-sm text-center">
      {label}
    </span>
  );
}
