import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function InsightsPage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <main className="flex-1 relative z-10">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
            <h1 className="text-3xl font-display font-bold text-primary-base mb-4">
              Insights ✨
            </h1>
            <p className="text-neutral-600">
              Insights and analytics coming soon...
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
