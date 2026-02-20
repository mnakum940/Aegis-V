"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LayerPipeline from "./LayerPipeline";

const attacks = [
    { id: "safe", label: "Safe Prompt", color: "aegis-cyan" },
    { id: "injection", label: "Prompt Injection", color: "aegis-red" },
    { id: "jailbreak", label: "Jailbreak", color: "orange-500" },
    { id: "exfil", label: "Data Exfiltration", color: "purple-500" },
];

export default function HeroSection() {
    const [activeAttack, setActiveAttack] = useState("safe");

    const isThreat = activeAttack !== "safe";

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 overflow-hidden">
            {/* Radial glow */}
            <div
                className={`pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl transition-colors duration-1000 ${isThreat
                        ? "bg-red-900/20"
                        : "bg-cyan-500/10"
                    }`}
            />

            {/* Badge */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6 flex items-center gap-2 glass px-4 py-2 rounded-full border border-aegis-border"
            >
                <span className="w-2 h-2 rounded-full bg-aegis-green animate-pulse" />
                <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
                    LLM Security Gateway — Live
                </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-center text-5xl md:text-7xl font-black tracking-tight leading-none mb-6"
            >
                <span className="block text-white">Secure Your LLM</span>
                <span
                    className={`block transition-all duration-700 ${isThreat
                            ? "text-red-400 drop-shadow-[0_0_30px_rgba(255,59,59,0.6)]"
                            : "text-aegis-cyan drop-shadow-[0_0_30px_rgba(6,214,245,0.5)]"
                        }`}
                >
                    Before It Thinks
                </span>
            </motion.h1>

            {/* Sub */}
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
            >
                A self‑hardening, 4‑layer AI immune system that blocks prompt injections,
                jailbreaks&nbsp;&amp;&nbsp;adversarial attacks — before they reach your model.
            </motion.p>

            {/* Attack selector */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap justify-center gap-2 mb-12"
            >
                {attacks.map((a) => (
                    <button
                        key={a.id}
                        onClick={() => setActiveAttack(a.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${activeAttack === a.id
                                ? a.id === "safe"
                                    ? "bg-aegis-cyan/20 border-aegis-cyan text-aegis-cyan shadow-glow"
                                    : "bg-red-500/20 border-red-500 text-red-400 shadow-glow-red"
                                : "glass border-aegis-border text-slate-400 hover:border-slate-500"
                            }`}
                    >
                        {a.id !== "safe" && (
                            <span className="mr-1.5">⚡</span>
                        )}
                        {a.label}
                    </button>
                ))}
            </motion.div>

            {/* Pipeline animation */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="w-full max-w-5xl"
            >
                <LayerPipeline attackType={activeAttack} />
            </motion.div>

            {/* CTAs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="mt-12 flex flex-col sm:flex-row gap-4"
            >
                <motion.a
                    href="#api"
                    whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(6,214,245,0.5)" }}
                    whileTap={{ scale: 0.97 }}
                    className="px-8 py-3.5 rounded-xl font-bold text-aegis-bg bg-aegis-cyan text-sm tracking-wide"
                >
                    Get API Access →
                </motion.a>
                <motion.a
                    href="#how-it-works"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-8 py-3.5 rounded-xl font-semibold text-slate-300 glass border border-aegis-border text-sm"
                >
                    See How It Works
                </motion.a>
            </motion.div>

            {/* Stats bar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-16 flex flex-wrap justify-center gap-8 text-center"
            >
                {[
                    { val: "10,001+", label: "Threats Blocked" },
                    { val: "3,182+", label: "Antibodies Learned" },
                    { val: "<1ms", label: "Layer 1 Latency" },
                    { val: "100%", label: "Tenant Isolation" },
                ].map((s) => (
                    <div key={s.label}>
                        <div className="text-2xl font-black text-aegis-cyan">{s.val}</div>
                        <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                    </div>
                ))}
            </motion.div>
        </section>
    );
}
