import Footer from "@/components/landing/Footer";
import { Hero } from "@/components/landing/HeroSection";
import { LandingSections } from "@/components/landing/LandingSections";
import { Navbar } from "@/components/landing/NavBar";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { EventTypeExplorer } from "@/components/landing/EventTypeExplorer";
import { CommunityShowcase } from "@/components/landing/CommunityShowcase";
import { LandingCta } from "@/components/landing/LandingCta";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfcfb]">
      <Navbar />
      <Hero />
      <StatsStrip />
      <LandingSections />
      <EventTypeExplorer />
      <CommunityShowcase />
      <LandingCta />
      <Footer />
    </main>
  );
}
