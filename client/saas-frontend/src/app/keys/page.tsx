"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Copy, Check, Eye, EyeOff, Loader2, AlertTriangle, Zap, Building2, User } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Config ──────────────────────────────────────────────────────────
const BACKEND = "http://localhost:8000";

const TIERS = [
    {
        id: "free",
        label: "Free",
        color: "#06d6f5",
        icon: <User className="w-4 h-4" />,
        expiry: "30 days",
        rate: "10 req/min",
        features: ["Layer 1 & 2 defense", "Basic audit logs", "Python SDK"],
    },
    {
        id: "pro",
        label: "Pro",
        color: "#a78bfa",
        icon: <Zap className="w-4 h-4" />,
        expiry: "1 year",
        rate: "100 req/min",
        features: ["All 4 layers", "Real-time dashboard", "50 custom rules", "Priority support"],
        popular: true,
    },
    {
        id: "enterprise",
        label: "Enterprise",
        color: "#34d399",
        icon: <Building2 className="w-4 h-4" />,
        expiry: "Never",
        rate: "Unlimited",
        features: ["Dedicated server", "White-label UI", "SLA guarantee", "Custom antibodies"],
    },
];

// ── One-time key reveal modal ────────────────────────────────────────
function KeyRevealModal({
    apiKey,
    record,
    onClose,
}: {
    apiKey: string;
    record: { email: string; organization: string; tier: string; expires_at: string | null; rate_limit: string };
    onClose: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const display = visible ? apiKey : apiKey.slice(0, 12) + "•".repeat(apiKey.length - 12);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass border border-aegis-border rounded-2xl p-8 max-w-lg w-full"
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-lg">API Key Generated</h2>
                        <p className="text-slate-400 text-xs">This is shown only once. Store it safely.</p>
                    </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3 mb-5">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-300 text-xs leading-relaxed">
                        We do not store your raw key — only a SHA-256 hash. <strong>Copy it now</strong> and save it in a password manager.
                    </p>
                </div>

                {/* Key display */}
                <div className="bg-slate-900 border border-aegis-border rounded-xl p-4 mb-4 flex items-center gap-3">
                    <code className="text-aegis-cyan font-mono text-sm flex-1 break-all">{display}</code>
                    <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setVisible(!visible)} className="text-slate-400 hover:text-white transition-colors">
                            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={handleCopy} className="text-slate-400 hover:text-green-400 transition-colors">
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                {copied && <p className="text-green-400 text-xs mb-4 font-medium">✓ Copied to clipboard!</p>}

                {/* Key details */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                        { label: "Email", val: record.email },
                        { label: "Org", val: record.organization },
                        { label: "Tier", val: record.tier.toUpperCase() },
                        { label: "Rate Limit", val: record.rate_limit },
                        { label: "Expires", val: record.expires_at ? new Date(record.expires_at).toLocaleDateString() : "Never" },
                    ].map((item) => (
                        <div key={item.label} className="bg-slate-900/50 rounded-lg p-2.5">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</div>
                            <div className="text-slate-200 text-sm font-medium mt-0.5">{item.val}</div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-aegis-cyan text-aegis-bg hover:bg-aegis-cyan/90 transition-colors"
                >
                    I&apos;ve saved my key
                </button>
            </motion.div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function KeysPage() {
    const [tier, setTier] = useState("free");
    const [email, setEmail] = useState("");
    const [org, setOrg] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<{
        raw_key: string;
        record: { email: string; organization: string; tier: string; expires_at: string | null; rate_limit: string };
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!email || !org) { setError("Email and organization are required."); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email."); return; }

        setLoading(true);
        try {
            const res = await fetch(`${BACKEND}/v1/keys/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, organization: org, tier }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail ?? "Registration failed");
            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong. Is the Aegis-V server running?");
        } finally {
            setLoading(false);
        }
    };

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

            <div className="pt-28 pb-20 px-4 md:px-6 max-w-4xl mx-auto">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full border border-aegis-border mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">Developer Access</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
                        Get Your <span className="text-aegis-cyan">API Key</span>
                    </h1>
                    <p className="text-slate-400 max-w-md mx-auto text-sm">
                        Generate a unique key tied to your account. Keys are hashed before storage — only you see the raw key.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">

                    {/* Left: Tier selector + form */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        {/* Tier cards */}
                        <div className="space-y-3 mb-6">
                            {TIERS.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTier(t.id)}
                                    className={`w-full text-left glass rounded-xl border p-4 transition-all duration-200 ${tier === t.id ? "border-opacity-80" : "border-aegis-border hover:border-opacity-50"
                                        }`}
                                    style={tier === t.id ? { borderColor: t.color, boxShadow: `0 0 20px ${t.color}22` } : {}}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.color + "22", color: t.color }}>
                                                {t.icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-semibold text-sm">{t.label}</span>
                                                    {t.popular && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: t.color + "33", color: t.color }}>
                                                            Popular
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-slate-500 text-xs">{t.rate} · Expires: {t.expiry}</div>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${tier === t.id ? "border-transparent" : "border-slate-600"}`}
                                            style={tier === t.id ? { backgroundColor: t.color } : {}} />
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2 pl-11">
                                        {t.features.map((f) => (
                                            <span key={f} className="text-[10px] text-slate-400 bg-slate-800/60 rounded px-1.5 py-0.5">{f}</span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="glass border border-aegis-border rounded-2xl p-6 space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="w-full bg-slate-900 border border-aegis-border rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-aegis-cyan/60 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">Organization</label>
                                <input
                                    type="text"
                                    value={org}
                                    onChange={(e) => setOrg(e.target.value)}
                                    placeholder="Acme Corp"
                                    className="w-full bg-slate-900 border border-aegis-border rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-aegis-cyan/60 transition-colors"
                                />
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                disabled={loading}
                                className="w-full py-3 rounded-xl text-sm font-bold bg-aegis-cyan text-aegis-bg flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                            >
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : "Generate API Key"}
                            </motion.button>
                        </form>
                    </motion.div>

                    {/* Right: Info panel */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
                        <div className="glass border border-aegis-border rounded-2xl p-6">
                            <h3 className="text-white font-bold mb-4">How it works</h3>
                            <div className="space-y-4">
                                {[
                                    { n: "1", t: "Choose your tier", d: "Free (30 days), Pro (1 year), or Enterprise (never expires)" },
                                    { n: "2", t: "Enter your details", d: "Email and organization name to identify your account" },
                                    { n: "3", t: "Copy your key ONCE", d: "We store only a SHA-256 hash — the raw key is shown once and gone" },
                                    { n: "4", t: "Add to requests", d: "Pass as the x-api-key header on every call to /v1/chat" },
                                ].map((s) => (
                                    <div key={s.n} className="flex gap-3">
                                        <div className="w-6 h-6 rounded-full bg-aegis-cyan/20 text-aegis-cyan text-xs font-bold flex items-center justify-center flex-shrink-0">
                                            {s.n}
                                        </div>
                                        <div>
                                            <div className="text-white text-sm font-medium">{s.t}</div>
                                            <div className="text-slate-400 text-xs mt-0.5">{s.d}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Code snippet */}
                        <div className="glass border border-aegis-border rounded-2xl p-5">
                            <div className="text-xs text-slate-500 mb-2 font-mono uppercase tracking-wider">Usage example</div>
                            <pre className="text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto">
                                <span className="text-purple-400">curl</span>{" "}
                                <span className="text-green-300">-X POST</span> \{"\n"}
                                {"  "}http://localhost:8000/v1/chat \{"\n"}
                                {"  "}<span className="text-yellow-300">-H</span>{" "}
                                <span className="text-orange-300">&quot;x-api-key: aegis-v_...&quot;</span> \{"\n"}
                                {"  "}<span className="text-yellow-300">-H</span>{" "}
                                <span className="text-orange-300">&quot;Content-Type: application/json&quot;</span> \{"\n"}
                                {"  "}<span className="text-yellow-300">-d</span>{" "}
                                <span className="text-orange-300">&apos;&#123;&quot;message&quot;: &quot;Hi&quot;&#125;&apos;</span>
                            </pre>
                        </div>

                        <div className="glass border border-aegis-border rounded-2xl p-5">
                            <div className="text-xs text-slate-400 leading-relaxed">
                                <span className="text-white font-medium">🔒 Security note:</span> Your raw key is never logged or stored.
                                If you lose it, generate a new one — old key can be revoked via the API.
                                {" "}<Link href="/dashboard" className="text-aegis-cyan hover:underline">View Intel Dashboard →</Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Key reveal modal */}
            {result && (
                <KeyRevealModal
                    apiKey={result.raw_key}
                    record={result.record}
                    onClose={() => setResult(null)}
                />
            )}

            <Footer />
        </main>
    );
}
