import { Suspense } from "react";
import type { Metadata } from "next";
import Calculator from "@/components/Calculator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingSection from "@/components/PricingSection";

// Personalize the social share card per scenario: shared links carry the plan in
// the query string (sa/mc/ty/ir/ga), so point the OG image at /og with the same
// params — every shared link previews that person's actual projected number.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const qs = new URLSearchParams();
  for (const k of ["sa", "mc", "ty", "ir", "ga"]) {
    const v = searchParams[k];
    if (typeof v === "string" && v !== "") qs.set(k, v);
  }
  if (!qs.toString()) return {};
  const ogUrl = `/og?${qs.toString()}`;
  return {
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <Header />
      <main className="flex-1 relative z-10 pt-3 md:pt-4 pb-4 md:pb-8">
        <Suspense fallback={<div>Loading...</div>}>
          <Calculator />
        </Suspense>
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
