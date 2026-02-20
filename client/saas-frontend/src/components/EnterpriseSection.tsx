"use client";
import { motion } from "framer-motion";

const tenants = [
    { id: "org_stark", name: "Stark Industries", tier: "Pro", color: "#06d6f5", req: 84 },
    { id: "org_wayne", name: "Wayne Enterprises", tier: "Enterprise", color: "#34d399", req: 1200 },
    { id: "org_acme", name: "Acme AI", tier: "Developer", color: "#0ea5e9", req: 7 },
];

const isolationFeatures = [
    {
        icon: "🗂️",
        title: "Isolated Memory",
        desc: "Each tenant gets a dedicated antibody database and audit chain. Zero cross-contamination.",
    },
    {
        icon: "🔐",
        title: "Hashed API Keys",
        desc: "SHA-256 hashed keys stored server-side. Even if your server is breached, keys remain safe.",
    },
    {
        icon: "📊",
        title: "Per-Tenant Analytics",
        desc: "Metrics, block rates, and threat logs are scoped strictly to each organization.",
    },
    {
        icon: "⛓️",
        title: "Immutable Audit Trail",
        desc: "Every decision is written to a cryptographic ledger — tamper-proof by design.",
    },
];

export default function EnterpriseSection() {
    return (
        <section id="enterprise" className="relative py-32 px-6">
            {/* bg */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[800px] h-[400px] rounded-full blur-3xl bg-purple-900/10" />
            </div>

            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full border border-purple-800/40 mb-6"
                    >
                        <span className="text-xs text-purple-400 font-medium tracking-widest uppercase">
                            Multi-Tenant Architecture
                        </span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black text-white mb-4"
                    >
                        Built for Enterprise
                    </motion.h2>
                    <p className="text-slate-400 max-w-xl mx-auto">
                        Every startup gets their own isolated Aegis instance. No shared state, no data leakage,
                        guaranteed.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 items-start">
                    {/* Tenant visualization */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="text-sm text-slate-400 mb-4 font-medium">
                            Active Tenants — Isolated Instances
                        </div>
                        <div className="space-y-3">
                            {tenants.map((t, i) => (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="glass rounded-xl p-4 border border-aegis-border group hover:border-opacity-50 transition-all"
                                    style={{ "--tc": t.color } as React.CSSProperties}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-2 h-2 rounded-full animate-pulse"
                                                style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }}
                                            />
                                            <span className="text-sm font-semibold text-white">{t.name}</span>
                                            <span
                                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                style={{ backgroundColor: t.color + "22", color: t.color }}
                                            >
                                                {t.tier}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono">{t.id}</div>
                                    </div>

                                    {/* Usage bar */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: t.color }}
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${(t.req / 1500) * 100}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1, delay: i * 0.2 }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-500 font-mono w-20 text-right">
                                            {t.req} req/min
                                        </span>
                                    </div>

                                    {/* Isolated memory indicator */}
                                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                        <span className="text-green-400">🔒</span>
                                        <span>memory/clients/{t.id}/ — isolated</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Server */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                            className="mt-4 glass rounded-xl p-4 border border-aegis-border"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400 text-sm">●</span>
                                    <span className="text-xs text-slate-400">Aegis-V Server — api.aegis-v.com:8000</span>
                                </div>
                                <span className="text-xs text-aegis-cyan font-mono">AegisTenantManager ✓</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Feature cards */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                        {isolationFeatures.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -2 }}
                                className="glass rounded-xl p-5 border border-aegis-border hover:border-purple-700/40 transition-all"
                            >
                                <div className="text-2xl mb-3">{f.icon}</div>
                                <div className="text-sm font-semibold text-white mb-2">{f.title}</div>
                                <div className="text-xs text-slate-400 leading-relaxed">{f.desc}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
