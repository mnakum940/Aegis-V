"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const navLinks = [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Attack Sim", href: "/#attack-sim" },
    { label: "Pricing", href: "/#api" },
    { label: "Intel Dashboard", href: "/dashboard" },
    { label: "API Keys", href: "/keys" },
];

export default function Navbar() {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        setMounted(true);
        setLoggedIn(!!localStorage.getItem("aegis_token"));
        const handler = () => setScrolled(window.scrollY > 40);
        handler();
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("aegis_token");
        localStorage.removeItem("aegis_user");
        setLoggedIn(false);
        router.push("/");
    };

    if (!mounted) return null;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${scrolled
                ? "bg-[rgba(4,11,26,0.85)] backdrop-blur-xl border-b border-aegis-border shadow-glass"
                : "bg-transparent"
                }`}
        >
            <motion.div
                initial={{ y: -70, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between"
            >
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative">
                        <Shield className="w-7 h-7 text-aegis-cyan transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(6,214,245,0.8)]" />
                        <div className="absolute inset-0 bg-aegis-cyan/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">
                        Aegis<span className="text-aegis-cyan">‑V</span>
                    </span>
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-6">
                    {navLinks.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={`text-sm font-medium transition-colors duration-200 ${l.label === "Intel Dashboard"
                                ? "text-aegis-cyan hover:text-white border border-aegis-border px-3 py-1.5 rounded-lg hover:border-aegis-cyan/50"
                                : "text-slate-400 hover:text-aegis-cyan"
                                }`}
                        >
                            {l.label}
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <div className="hidden md:flex items-center gap-3">
                    {loggedIn ? (
                        <>
                            <Link href="/user/dashboard"
                                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-aegis-cyan transition-colors px-3 py-2">
                                <LayoutDashboard className="w-4 h-4" />My Dashboard
                            </Link>
                            <motion.button onClick={handleLogout} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 border border-aegis-border hover:border-red-400 hover:text-red-400 transition-all">
                                <LogOut className="w-4 h-4" />Logout
                            </motion.button>
                        </>
                    ) : (
                        <>
                            <Link href="/auth/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
                                Sign In
                            </Link>
                            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                                <Link href="/auth/sign-up"
                                    className="px-5 py-2 rounded-lg text-sm font-semibold text-aegis-bg bg-aegis-cyan shadow-glow inline-block">
                                    Get API Access
                                </Link>
                            </motion.div>
                        </>
                    )}
                </div>

                {/* Mobile toggle */}
                <button
                    className="md:hidden text-slate-400 hover:text-white"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </motion.div>

            {/* Mobile drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        key="mobile-menu"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="md:hidden overflow-hidden bg-[rgba(4,11,26,0.95)] backdrop-blur-xl border-t border-aegis-border"
                    >
                        <div className="px-6 py-4 flex flex-col gap-4">
                            {navLinks.map((l) => (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="text-slate-300 hover:text-aegis-cyan transition-colors"
                                >
                                    {l.label}
                                </Link>
                            ))}
                            {loggedIn ? (
                                <>
                                    <Link href="/user/dashboard" onClick={() => setMobileOpen(false)}
                                        className="text-slate-300 hover:text-aegis-cyan transition-colors flex items-center gap-2">
                                        <LayoutDashboard className="w-4 h-4" />My Dashboard
                                    </Link>
                                    <button onClick={() => { handleLogout(); setMobileOpen(false); }}
                                        className="text-left text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2">
                                        <LogOut className="w-4 h-4" />Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                                        className="text-slate-300 hover:text-aegis-cyan transition-colors">Sign In</Link>
                                    <Link href="/auth/sign-up" onClick={() => setMobileOpen(false)}
                                        className="mt-1 text-center px-5 py-2 rounded-lg text-sm font-semibold text-aegis-bg bg-aegis-cyan block">
                                        Get API Access
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
