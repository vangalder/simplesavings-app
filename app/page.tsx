import { Suspense } from "react";
import Calculator from "@/components/Calculator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TabNavigation from "@/components/TabNavigation";
import TabContentContainer from "@/components/TabContentContainer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <TabNavigation />
      <main className="flex-1 relative z-10 pb-4 md:pb-8">
        <TabContentContainer>
          <Suspense fallback={<div>Loading...</div>}>
            <Calculator />
          </Suspense>
        </TabContentContainer>
      </main>
      <Footer />
    </div>
  );
}
