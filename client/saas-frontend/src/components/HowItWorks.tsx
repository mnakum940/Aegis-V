"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const layers = [
    {
        num: "01",
        name: "Cognitive Membrane",
        description:
            "The first line of defense. Uses vector embeddings to compare every incoming prompt against a learned database of threat antibodies. If the cosine distance to a known attack pattern is below threshold, the prompt is instantly blocked — no LLM call needed.",
        color: "#0ea5e9",
        glow: "rgba(14,165,233,0.4)",
        icon: "🧬",
        animation: "Sharp red threat fragments dissolve as antibody vectors absorb them.",
        stat: "<0.1ms",
        statLabel: "Avg Block Time",
    },
    {
        num: "02",
        name: "Intent Tracker",
        description:
            "A contextual risk scorer that evaluates the semantic intent behind a prompt. It assigns a risk score based on goal analysis, jailbreak indicators, and role-override patterns — going beyond simple keyword matching to understand what the user is actually trying to do.",
        color: "#06d6f5",
        glow: "rgba(6,214,245,0.4)",
        icon: "🎯",
        animation: "A scanning membrane flows and compresses the adversarial intent signal into a risk score.",
        stat: "3,182+",
        statLabel: "Antibodies",
    },
    {
        num: "03",
        name: "Self-Hardening Core",
        description:
            "When a threat is blocked, the SelfHardeningCore Red Team engine generates adversarial prompt variations automatically. New antibodies are synthesized and injected back into Layer 1 — making Aegis-V immune to future variants of the same attack without any human intervention.",
        color: "#a78bfa",
        glow: "rgba(167,139,250,0.4)",
        icon: "🔬",
        animation: "A neural threat-mesh reconfigures dynamically, synthesizing new immune antibodies.",
        stat: "100%",
        statLabel: "Auto-Hardening",
    },
    {
        num: "04",
        name: "Blockchain Audit Ledger",
        description:
            "Every decision — safe or blocked — is permanently recorded on an immutable cryptographic ledger. Provides tamper-proof audit trails for compliance, explainability, and billing.",
        color: "#34d399",
        glow: "rgba(52,211,153,0.4)",
        icon: "⛓️",
        animation: "Geometric chain nodes lock into place with cryptographic finality.",
        stat: "10,001+",
        statLabel: "Blocks Minted",
    },
];

export default function HowItWorks() {
    return (
        <section
            id="how-it-works"
            className="relative py-32 px-6"
        >
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full border border-aegis-border mb-6"
                    >
                        <span className="text-xs text-aegis-cyan font-medium tracking-widest uppercase">
                            4-Layer Architecture
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-black text-white mb-4"
                    >
                        How Aegis‑V Works
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-lg max-w-xl mx-auto"
                    >
                        Each layer adds a distinct defense mechanism — together forming an
                        adaptive immune system that gets smarter with every attack.
                    </motion.p>
                </div>

                {/* Layer cards */}
                <div className="space-y-6">
                    {layers.map((layer, i) => (
                        <LayerCard key={layer.num} layer={layer} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function LayerCard({ layer, index }: { layer: typeof layers[0]; index: number }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="relative glass rounded-2xl overflow-hidden border border-aegis-border group hover:border-opacity-60 transition-all duration-300"
            style={{
                "--layer-color": layer.color,
                "--layer-glow": layer.glow,
            } as React.CSSProperties}
        >
            {/* Left accent bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
                style={{ backgroundColor: layer.color, boxShadow: `0 0 20px ${layer.glow}` }}
            />

            {/* Hover glow */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{
                    background: `radial-gradient(ellipse 60% 60% at 10% 50%, ${layer.glow}, transparent)`,
                }}
            />

            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 p-8 pl-10">
                {/* Number + icon */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-4xl">{layer.icon}</div>
                    <div>
                        <div className="text-xs font-mono text-slate-500 mb-1">LAYER {layer.num}</div>
                        <div
                            className="text-2xl font-black"
                            style={{ color: layer.color, textShadow: `0 0 20px ${layer.glow}` }}
                        >
                            {layer.name.split(" ")[0]}
                        </div>
                        <div className="text-sm text-slate-400">{layer.name.split(" ").slice(1).join(" ")}</div>
                    </div>
                </div>

                {/* Description */}
                <div className="flex-1">
                    <p className="text-slate-300 leading-relaxed mb-3">{layer.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="text-aegis-cyan">✦</span>
                        <span className="italic">{layer.animation}</span>
                    </div>
                </div>

                {/* Stat */}
                <div className="flex-shrink-0 text-center min-w-[80px]">
                    <div
                        className="text-3xl font-black"
                        style={{ color: layer.color, textShadow: `0 0 16px ${layer.glow}` }}
                    >
                        {layer.stat}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{layer.statLabel}</div>
                </div>
            </div>
        </motion.div>
    );
}
