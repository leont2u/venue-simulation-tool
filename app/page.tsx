import { Hero } from "@/components/landing /HeroSection";
import { Navbar } from "@/components/landing /NavBar";
import { DrawioImportSection } from "@/components/landing /UploadSection";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-transparent">
      <Navbar />
      <Hero />
      <DrawioImportSection />
    </main>
  );
}
