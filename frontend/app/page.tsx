import { Hero } from "@/components/landing/HeroSection";
import { Navbar } from "@/components/landing/NavBar";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--sf-bg)]">
      <Navbar />
      <Hero />
    </main>
  );
}
