import Footer from "@/components/landing/Footer";
import { Hero } from "@/components/landing/HeroSection";
import { LandingSections } from "@/components/landing/LandingSections";
import { Navbar } from "@/components/landing/NavBar";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfcfb]">
      <Navbar />
      <Hero />
      <LandingSections />
      <Footer />
    </main>
  );
}
