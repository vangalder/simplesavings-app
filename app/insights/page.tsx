import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TabNavigation from "@/components/TabNavigation";
import TabContentContainer from "@/components/TabContentContainer";

export default function InsightsPage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <TabNavigation />
      <main className="flex-1 relative z-10 pt-0 pb-4 md:pb-8">
        <TabContentContainer>
          <h1 className="text-3xl font-display font-bold text-primary-base mb-4">
            Insights ✨
          </h1>
          <p className="text-neutral-600">
            Insights and analytics coming soon...
          </p>
        </TabContentContainer>
      </main>
      <Footer />
    </div>
  );
}
