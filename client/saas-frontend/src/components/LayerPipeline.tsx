"use client";
import { motion, AnimatePresence } from "framer-motion";

// Layer names match actual Aegis-V source code (src/core/system.py)
const LAYERS = [
    {
        id: "l1",
        label: "L1",
        name: "Cognitive Membrane",
        shortName: "CognitiveMembrane",
        icon: "🧬",
        color: "#0ea5e9",
        glowColor: "rgba(14,165,233,0.6)",
        safeDesc: "Antibody scan passed",
        threatDesc: "Semantic match — blocked",
    },
    {
        id: "l2",
        label: "L2",
        name: "Intent Tracker",
        shortName: "IntentTracker",
        icon: "🎯",
        color: "#06d6f5",
        glowColor: "rgba(6,214,245,0.6)",
        safeDesc: "Intent verified benign",
        threatDesc: "Dangerous intent detected",
    },
    {
        id: "l3",
        label: "L3",
        name: "Self-Hardening",
        shortName: "SelfHardeningCore",
        icon: "🔬",
        color: "#a78bfa",
        glowColor: "rgba(167,139,250,0.6)",
        safeDesc: "No threat pattern",
        threatDesc: "Red-team variants synthesized",
    },
    {
        id: "l4",
        label: "L4",
        name: "Blockchain Ledger",
        shortName: "Blockchain",
        icon: "⛓️",
        color: "#34d399",
        glowColor: "rgba(52,211,153,0.6)",
        safeDesc: "Block minted ✓",
        threatDesc: "Threat recorded immutably",
    },
];

interface Props {
    attackType: string;
}

export default function LayerPipeline({ attackType }: Props) {
    const isThreat = attackType !== "safe";

    return (
        <div className="relative w-full overflow-x-auto">
            <div className="flex items-center justify-center gap-0 min-w-[640px] px-4 py-10">

                {/* ── User / Prompt node ── */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <motion.div
                        animate={{
                            borderColor: isThreat ? "#ff3b3b" : "#0ea5e9",
                            boxShadow: isThreat
                                ? "0 0 24px rgba(255,59,59,0.55)"
                                : "0 0 16px rgba(14,165,233,0.35)",
                        }}
                        transition={{ duration: 0.6 }}
                        className="w-14 h-14 rounded-full border-2 glass flex items-center justify-center text-2xl"
                    >
                        👤
                    </motion.div>
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={isThreat ? "threat-label" : "safe-label"}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`text-[10px] font-semibold ${isThreat ? "text-red-400" : "text-slate-500"}`}
                        >
                            {isThreat ? `⚡ ${attackType}` : "Prompt"}
                        </motion.span>
                    </AnimatePresence>
                </div>

                {/* ── Layer nodes ── */}
                {LAYERS.map((layer, i) => (
                    <div key={layer.id} className="flex items-center flex-shrink-0">

                        {/* Flow connector line */}
                        <div className="relative w-8 h-px bg-slate-700">
                            <motion.div
                                className="absolute inset-0 origin-left"
                                animate={{
                                    scaleX: [0, 1, 0],
                                    backgroundColor: isThreat ? "#ff3b3b" : layer.color,
                                }}
                                transition={{
                                    scaleX: {
                                        delay: i * 0.35,
                                        duration: 0.7,
                                        repeat: Infinity,
                                        repeatDelay: 2.8,
                                        ease: "easeInOut",
                                    },
                                    backgroundColor: { duration: 0.5 },
                                }}
                            />
                        </div>

                        {/* Layer card */}
                        <motion.div className="flex flex-col items-center gap-1.5">
                            <motion.div
                                className="relative w-[76px] h-[76px] rounded-xl glass flex flex-col items-center justify-center gap-0.5 border overflow-hidden"
                                animate={{
                                    borderColor: isThreat ? "rgba(255,59,59,0.55)" : layer.color + "66",
                                    boxShadow: isThreat
                                        ? "0 0 22px rgba(255,59,59,0.4)"
                                        : `0 0 22px ${layer.glowColor}`,
                                    // Cascading shake on threat — each layer staggers
                                    x: isThreat ? [0, -3, 3, -2, 2, 0] : 0,
                                }}
                                transition={{
                                    borderColor: { duration: 0.5 },
                                    boxShadow: { duration: 0.5 },
                                    x: isThreat
                                        ? {
                                            delay: 0.3 + i * 0.25,
                                            duration: 0.45,
                                            repeat: Infinity,
                                            repeatDelay: 3,
                                            ease: "easeInOut",
                                        }
                                        : { duration: 0.3 },
                                }}
                            >
                                {/* Morphing blob bg */}
                                <motion.div
                                    className="absolute inset-0 opacity-[0.18]"
                                    animate={{
                                        backgroundColor: isThreat ? "#7f1d1d" : layer.color,
                                        borderRadius: isThreat
                                            ? ["12px", "18px 8px 16px 10px", "10px 18px 8px 16px", "12px"]
                                            : ["12px", "14px 10px 16px 12px", "12px"],
                                    }}
                                    transition={{
                                        duration: isThreat ? 1.2 : 2.5,
                                        repeat: Infinity,
                                        delay: i * 0.15,
                                        ease: "easeInOut",
                                    }}
                                />

                                {/* Icon */}
                                <span className="relative z-10 text-base">{layer.icon}</span>

                                {/* Label */}
                                <span
                                    className="relative z-10 text-sm font-black"
                                    style={{ color: isThreat ? "#ff5555" : layer.color }}
                                >
                                    {layer.label}
                                </span>

                                {/* Pass / Block badge */}
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={isThreat ? "block" : "pass"}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="relative z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                        style={{
                                            color: isThreat ? "#ff5555" : "#00ff88",
                                            backgroundColor: isThreat
                                                ? "rgba(255,59,59,0.15)"
                                                : "rgba(0,255,136,0.12)",
                                        }}
                                    >
                                        {isThreat ? "BLOCK" : "PASS ✓"}
                                    </motion.span>
                                </AnimatePresence>
                            </motion.div>

                            {/* Layer name below */}
                            <div className="text-center">
                                <div className="text-[10px] text-slate-400 font-medium">{layer.name}</div>
                                <div className="text-[8px] text-slate-600 font-mono">{layer.shortName}</div>
                            </div>
                        </motion.div>
                    </div>
                ))}

                {/* ── Final connector to LLM ── */}
                <div className="relative w-8 h-px bg-slate-700 flex-shrink-0">
                    <motion.div
                        className="absolute inset-0 origin-left"
                        animate={{
                            scaleX: isThreat ? 0 : [0, 1, 0],
                            backgroundColor: "#00ff88",
                        }}
                        transition={{
                            scaleX: {
                                delay: 1.4,
                                duration: 0.7,
                                repeat: Infinity,
                                repeatDelay: 2.8,
                                ease: "easeInOut",
                            },
                            backgroundColor: { duration: 0.5 },
                        }}
                    />
                </div>

                {/* ── LLM node ── */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <motion.div
                        animate={{
                            borderColor: isThreat ? "#374151" : "#00ff88",
                            boxShadow: isThreat
                                ? "0 0 0px transparent"
                                : "0 0 28px rgba(0,255,136,0.55)",
                            opacity: isThreat ? 0.35 : 1,
                            scale: isThreat ? 1 : [1, 1.04, 1],
                        }}
                        transition={{
                            duration: 0.7,
                            scale: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
                        }}
                        className="w-16 h-16 rounded-full border-2 glass flex items-center justify-center text-2xl"
                    >
                        🧠
                    </motion.div>
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={isThreat ? "lm-blocked" : "lm-secure"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`text-[10px] font-semibold ${isThreat ? "text-red-500" : "text-green-400"}`}
                        >
                            {isThreat ? "🔒 Protected" : "✓ Secure LLM"}
                        </motion.span>
                    </AnimatePresence>
                </div>

            </div>

            {/* Legend */}
            <div className="mt-1 flex justify-center gap-5 flex-wrap px-4">
                {LAYERS.map((layer) => (
                    <div key={layer.id} className="flex items-center gap-1.5">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{
                                backgroundColor: layer.color,
                                boxShadow: `0 0 6px ${layer.glowColor}`,
                            }}
                        />
                        <span className="text-[9px] text-slate-500">{layer.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
