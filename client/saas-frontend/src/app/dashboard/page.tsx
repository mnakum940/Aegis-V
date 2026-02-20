import DashboardPage from "@/components/DashboardPage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
    title: "Intel Dashboard | Aegis-V",
    description: "Live security intelligence: attack patterns, model accuracy, risk distribution and threat trends from the Aegis-V immune system.",
};

export default function Dashboard() {
    return (
        <main className="relative min-h-screen overflow-hidden">
            {/* Grid bg */}
            <div
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(14,165,233,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.04) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <Navbar />
            <DashboardPage />
            <Footer />
        </main>
    );
}
