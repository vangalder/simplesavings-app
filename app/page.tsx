import { Suspense } from "react";
import Calculator from "@/components/Calculator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <main className="flex-1 relative z-10 pt-3 md:pt-4 pb-4 md:pb-8">
        <Suspense fallback={<div>Loading...</div>}>
          <Calculator />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
