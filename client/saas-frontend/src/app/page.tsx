import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import AttackPanel from "@/components/AttackPanel";
import APISection from "@/components/APISection";
import EnterpriseSection from "@/components/EnterpriseSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Global grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(14,165,233,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.04) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <Navbar />
      <HeroSection />
      <HowItWorks />
      <AttackPanel />
      <APISection />
      <EnterpriseSection />
      <Footer />
    </main>
  );
}
