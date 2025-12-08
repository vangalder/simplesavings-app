import { Suspense } from "react";
import Calculator from "@/components/Calculator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <main className="flex-1 relative z-10">
        <div className="py-4 md:py-8">
          <Suspense fallback={<div className="container mx-auto px-4 py-6">Loading...</div>}>
            <Calculator />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
