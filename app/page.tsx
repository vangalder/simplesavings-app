import Calculator from "@/components/Calculator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Calculator />
      </main>
      <Footer />
    </div>
  );
}
