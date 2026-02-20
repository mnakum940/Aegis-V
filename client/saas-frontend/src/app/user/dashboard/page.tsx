"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield, Key, Copy, Check, Eye, EyeOff, Trash2, Plus,
    Loader2, AlertTriangle, User, Zap, Building2, RefreshCw,
    ArrowUpCircle, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const BACKEND = "http://localhost:8000";

type UserInfo = { user_id: string; email: string; organization: string; tier: string };
type ApiKey = {
    key_id: string; hash_prefix: string; client_id: string;
    tier: string; status: string; rate_limit: string;
    created_at: string; expires_at: string | null;
    last_used_at: string | null; request_count: number; has_raw: boolean;
    label?: string;
};

const TIER_COLOR: Record<string, string> = {
    free: "#06d6f5", pro: "#a78bfa", enterprise: "#34d399",
};
const TIER_ICON: Record<string, React.ReactNode> = {
    free: <User className="w-3.5 h-3.5" />,
    pro: <Zap className="w-3.5 h-3.5" />,
    enterprise: <Building2 className="w-3.5 h-3.5" />,
};

type CurrencyData = { symbol: string; rate: number; code: string };
function useCurrency() {
    const [currency, setCurrency] = useState<CurrencyData>({ symbol: "$", rate: 1, code: "USD" });

    useEffect(() => {
        // Simple geo-lookup to set currency
        fetch("https://ipapi.co/json/")
            .then(res => res.json())
            .then(data => {
                const country = data.country_code;
                if (country === "IN") setCurrency({ symbol: "₹", rate: 83, code: "INR" });
                else if (country === "GB") setCurrency({ symbol: "£", rate: 0.79, code: "GBP" });
                else if (["DE", "FR", "IT", "ES", "NL"].includes(country)) setCurrency({ symbol: "€", rate: 0.92, code: "EUR" });
                // fallback is USD
            })
            .catch(() => { });
    }, []);
    return currency;
}

const PLANS = [
    {
        id: "free", label: "Free", color: "#06d6f5",
        icon: <User className="w-4 h-4" />,
        basePrice: 0, period: "forever",
        keys: 3, rate: "100 req/day", expiry: "30 days",
        features: ["3 API keys", "100 req/day", "30-day key lifetime", "Python SDK"],
    },
    {
        id: "pro", label: "Pro", color: "#a78bfa",
        icon: <Zap className="w-4 h-4" />,
        basePrice: 29, period: "/ month",
        keys: 10, rate: "1000 req/day", expiry: "1 year",
        features: ["10 API keys", "1000 req/day", "1-year key lifetime", "Priority support"],
        popular: true,
    },
    {
        id: "enterprise", label: "Enterprise", color: "#34d399",
        icon: <Building2 className="w-4 h-4" />,
        basePrice: 199, period: "/ month",
        keys: 999, rate: "Unlimited", expiry: "Never",
        features: ["Unlimited keys", "Unlimited req/min", "Keys never expire", "Dedicated support"],
    },
];


// ── Reveal / Copy row ────────────────────────────────────────────────
function KeyRow({
    k, token, onRevoke, onCopied,
}: {
    k: ApiKey; token: string;
    onRevoke: (id: string) => void;
    onCopied: () => void;
}) {
    const [raw, setRaw] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [revoking, setRevoking] = useState(false);

    const reveal = async () => {
        if (raw) { setVisible(!visible); return; }
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND}/v1/user/keys/reveal/${k.key_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);
            setRaw(data.raw_key);
            setVisible(true);
        } catch { /* silent */ } finally { setLoading(false); }
    };

    const copy = async () => {
        const key = raw ?? k.hash_prefix;
        await navigator.clipboard.writeText(key);
        setCopied(true); onCopied();
        setTimeout(() => setCopied(false), 2000);
    };

    const revoke = async () => {
        if (!confirm("Revoke this key? Any SDK using it will stop working immediately.")) return;
        setRevoking(true);
        try {
            const res = await fetch(`${BACKEND}/v1/user/keys/revoke/${k.key_id}`, {
                method: "POST", headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            onRevoke(k.key_id);
        } catch { setRevoking(false); }
    };

    const isActive = k.status === "active";
    const statusColor = isActive ? "#34d399" : k.status === "expired" ? "#fbbf24" : "#f87171";
    const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

    const displayKey = raw && visible
        ? raw
        : raw
            ? raw.slice(0, 14) + "•".repeat(Math.max(0, raw.length - 14))
            : "aegis-v_" + "•".repeat(32);

    return (
        <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
            className="glass border border-aegis-border rounded-xl p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Key className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-white text-sm font-mono truncate">{k.client_id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                        style={{ background: statusColor + "22", color: statusColor }}>
                        {k.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 flex items-center gap-1"
                        style={{ background: TIER_COLOR[k.tier] + "22", color: TIER_COLOR[k.tier] }}>
                        {TIER_ICON[k.tier]}{k.tier}
                    </span>
                </div>
                {isActive && (
                    <button onClick={revoke} disabled={revoking}
                        className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                        {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* Key display */}
            {isActive && (
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                    <code className="text-aegis-cyan font-mono text-xs flex-1 truncate">{displayKey}</code>
                    <div className="flex gap-2 flex-shrink-0">
                        <button onClick={reveal} className="text-slate-400 hover:text-white transition-colors">
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={copy} className="text-slate-400 hover:text-green-400 transition-colors">
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Meta row */}
            <div className="grid grid-cols-4 gap-2 text-[10px]">
                {[
                    { label: "Rate", val: k.rate_limit },
                    { label: "Created", val: fmtDate(k.created_at) },
                    { label: "Expires", val: k.expires_at ? fmtDate(k.expires_at) : "Never" },
                    { label: "Requests", val: k.request_count.toLocaleString() },
                ].map(m => (
                    <div key={m.label} className="bg-slate-900/50 rounded-lg p-2 text-center">
                        <div className="text-slate-500 uppercase tracking-wider">{m.label}</div>
                        <div className="text-slate-200 font-medium mt-0.5">{m.val}</div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// ── Generate Key Modal ───────────────────────────────────────────────
function GenerateModal({
    token, onClose, onGenerated,
}: {
    token: string;
    onClose: () => void;
    onGenerated: (key: ApiKey, raw: string) => void;
}) {
    const [label, setLabel] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const generate = async () => {
        setError(""); setLoading(true);
        try {
            const res = await fetch(`${BACKEND}/v1/user/keys/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ label }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail ?? "Generation failed");
            const newKey: ApiKey = {
                key_id: data.key_id, hash_prefix: data.key_id.slice(0, 8) + "…",
                client_id: data.client_id, tier: data.record.tier,
                status: "active", rate_limit: data.record.rate_limit,
                created_at: data.record.created_at, expires_at: data.record.expires_at,
                last_used_at: null, request_count: 0, has_raw: true, label,
            };
            onGenerated(newKey, data.raw_key);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="glass border border-aegis-border rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-white font-bold text-lg mb-1">Generate API Key</h3>
                <p className="text-slate-400 text-xs mb-4">Optionally label this key for easy identification.</p>
                {error && (
                    <div className="flex items-center gap-2 bg-red-900/20 border border-red-500/30 text-red-400 text-xs rounded-lg px-3 py-2 mb-3">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                    </div>
                )}
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Production, Development…"
                    className="w-full bg-slate-900 border border-aegis-border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-aegis-cyan/60 mb-4" />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm text-slate-400 border border-aegis-border hover:border-slate-500">
                        Cancel
                    </button>
                    <motion.button onClick={generate} disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-aegis-cyan text-aegis-bg flex items-center justify-center gap-2 disabled:opacity-60">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Generate</>}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}

// ── New Key Reveal Modal ─────────────────────────────────────────────
function NewKeyModal({ rawKey, onClose }: { rawKey: string; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(true);
    const copy = () => { navigator.clipboard.writeText(rawKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const display = visible ? rawKey : rawKey.slice(0, 12) + "•".repeat(rawKey.length - 12);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="glass border border-aegis-border rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-green-400/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">New API Key Created</h3>
                        <p className="text-slate-400 text-xs">This is your key — copy it now!</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-aegis-border rounded-xl px-3 py-3 mb-4">
                    <code className="text-aegis-cyan font-mono text-xs flex-1 break-all">{display}</code>
                    <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setVisible(!visible)} className="text-slate-400 hover:text-white">
                            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={copy} className="text-slate-400 hover:text-green-400">
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div className="flex items-start gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-3 py-2 mb-4">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-300 text-xs">You can copy this key again from your dashboard at any time.</p>
                </div>
                <button onClick={onClose}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-aegis-cyan text-aegis-bg">
                    Got it
                </button>
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  Main Dashboard Page
// ═══════════════════════════════════════════════════════════════════
export default function UserDashboard() {
    const router = useRouter();
    const curr = useCurrency();
    const [user, setUser] = useState<UserInfo | null>(null);
    const [token, setToken] = useState("");
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [limit, setLimit] = useState(3);
    const [atLimit, setAtLimit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showGenerate, setShowGenerate] = useState(false);
    const [newRaw, setNewRaw] = useState<string | null>(null);
    const [toast, setToast] = useState("");
    const [showPlans, setShowPlans] = useState(false);
    const [upgrading, setUpgrading] = useState("");

    // Admin states
    const [adminTargetEmail, setAdminTargetEmail] = useState("");
    const [adminTargetTier, setAdminTargetTier] = useState("pro");
    const [adminLoading, setAdminLoading] = useState(false);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

    const fetchKeys = useCallback(async (tok: string) => {
        const res = await fetch(`${BACKEND}/v1/user/keys`, {
            headers: { Authorization: `Bearer ${tok}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setKeys(data.keys);
        setLimit(data.key_limit);
        setAtLimit(data.at_limit);
    }, []);

    useEffect(() => {
        const tok = localStorage.getItem("aegis_token");
        const raw = localStorage.getItem("aegis_user");
        if (!tok || !raw) { router.replace("/auth/login"); return; }
        const u: UserInfo = JSON.parse(raw);
        setToken(tok); setUser(u);
        fetchKeys(tok).finally(() => setLoading(false));
    }, [router, fetchKeys]);

    const handleLogout = () => {
        localStorage.removeItem("aegis_token");
        localStorage.removeItem("aegis_user");
        router.push("/auth/login");
    };

    const handleRevoke = (id: string) => {
        setKeys(prev => prev.map(k => k.key_id === id ? { ...k, status: "revoked" } : k));
        setAtLimit(false);
        showToast("Key revoked.");
    };

    const handleGenerated = (newKey: ApiKey, raw: string) => {
        setKeys(prev => [newKey, ...prev]);
        setShowGenerate(false);
        setNewRaw(raw);
        const active = keys.filter(k => k.status === "active").length + 1;
        setAtLimit(active >= limit);
    };

    const handleUpgradePlan = async (newTier: string) => {
        if (!token || newTier === user?.tier) return;
        setUpgrading(newTier);

        // Mock payment logic
        showToast("Processing payment...");
        await new Promise(r => setTimeout(r, 2000));

        try {
            const res = await fetch(`${BACKEND}/v1/user/upgrade-plan`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ new_tier: newTier }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail ?? "Upgrade failed");
            // Update local user state + localStorage
            const updated = { ...user!, tier: newTier };
            setUser(updated);
            localStorage.setItem("aegis_user", JSON.stringify(updated));
            // Refresh keys to reflect new rate limits
            await fetchKeys(token);
            const plan = PLANS.find(p => p.id === newTier);
            setShowPlans(false);
            showToast(`✅ Upgraded to ${plan?.label}! ${data.keys_updated} key(s) updated.`);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Upgrade failed.");
        } finally { setUpgrading(""); }
    };

    const handleAdminGrant = async () => {
        if (!adminTargetEmail) return showToast("Enter target email.");
        setAdminLoading(true);
        try {
            const res = await fetch(`${BACKEND}/v1/admin/grant-plan`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ target_email: adminTargetEmail, new_tier: adminTargetTier })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail ?? "Admin grant failed");
            showToast(data.message);
            setAdminTargetEmail("");
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Grant failed");
        } finally {
            setAdminLoading(false);
        }
    };

    const tierColor = TIER_COLOR[user?.tier ?? "free"];
    const activeCount = keys.filter(k => k.status === "active").length;

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-aegis-cyan animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen pt-28 pb-8 px-4 max-w-3xl mx-auto">
            <Navbar />
            <div className="pointer-events-none fixed inset-0 z-0"
                style={{ backgroundImage: "linear-gradient(rgba(14,165,233,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.04) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

            {/* User Info Card */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="glass border border-aegis-border rounded-2xl p-5 mb-4 relative z-10">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold text-lg">{user?.organization}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                                style={{ background: tierColor + "22", color: tierColor }}>
                                {TIER_ICON[user?.tier ?? "free"]}{user?.tier}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm">{user?.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-2xl font-black text-white">{activeCount}<span className="text-slate-500 text-base font-normal"> / {limit}</span></div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Active keys</div>
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${(activeCount / limit) * 100}%`, background: atLimit ? "#f87171" : tierColor }} />
                            </div>
                        </div>
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setShowPlans(!showPlans)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                            style={{ borderColor: tierColor + "60", color: tierColor, background: tierColor + "11" }}>
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            {showPlans ? "Hide plans" : "Change plan"}
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Plan Upgrade Panel (collapsible) */}
            <AnimatePresence>
                {showPlans && (
                    <motion.div key="plans" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4 relative z-10">
                        <div className="grid grid-cols-3 gap-3 pt-1 pb-2">
                            {PLANS.map(plan => {
                                const isCurrent = plan.id === user?.tier;
                                const col = plan.color;
                                return (
                                    <motion.div key={plan.id} layout
                                        className="glass border rounded-xl p-4 flex flex-col gap-3 transition-all"
                                        style={{ borderColor: isCurrent ? col : "rgba(255,255,255,0.06)" }}>
                                        {/* Plan header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5" style={{ color: col }}>
                                                {plan.icon}
                                                <span className="font-bold text-sm">{plan.label}</span>
                                                {plan.popular && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: col + "33" }}>Popular</span>}
                                            </div>
                                            {isCurrent && <CheckCircle2 className="w-4 h-4" style={{ color: col }} />}
                                        </div>
                                        {/* Price */}
                                        <div>
                                            <span className="text-white font-black text-xl">
                                                {plan.basePrice === -1 ? "Custom" : `${curr.symbol}${Math.round(plan.basePrice * curr.rate)}`}
                                            </span>
                                            {plan.basePrice !== -1 && <span className="text-slate-500 text-xs ml-1">{curr.code}{plan.period}</span>}
                                        </div>
                                        {/* Features */}
                                        <ul className="space-y-1 flex-1">
                                            {plan.features.map(f => (
                                                <li key={f} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                    <span style={{ color: col }}>✓</span>{f}
                                                </li>
                                            ))}
                                        </ul>
                                        {/* CTA */}
                                        <motion.button
                                            whileHover={{ scale: isCurrent ? 1 : 1.03 }}
                                            whileTap={{ scale: isCurrent ? 1 : 0.97 }}
                                            onClick={() => !isCurrent && handleUpgradePlan(plan.id)}
                                            disabled={isCurrent || upgrading === plan.id || upgrading !== ""}
                                            className="w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                                            style={isCurrent
                                                ? { background: col + "22", color: col }
                                                : { background: col, color: "#040b1a" }}>
                                            {upgrading === plan.id
                                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                                                : isCurrent ? "Current plan" : "Upgrade"}
                                        </motion.button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Keys Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h2 className="text-white font-bold text-lg">My API Keys</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => fetchKeys(token)} className="text-slate-400 hover:text-white transition-colors p-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <motion.button
                        onClick={() => { if (atLimit) { showToast(`Free plan limit: ${limit} keys. Revoke one or upgrade.`); return; } setShowGenerate(true); }}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${atLimit ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-aegis-cyan text-aegis-bg"}`}>
                        <Plus className="w-4 h-4" /> Generate Key
                    </motion.button>
                </div>
            </div>

            {/* Limit warning */}
            {atLimit && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-400/30 rounded-xl px-4 py-3 mb-4 text-yellow-300 text-xs relative z-10">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    You&apos;ve reached your {limit}-key limit ({user?.tier} plan). Revoke a key to generate a new one.
                </motion.div>
            )}

            {/* Keys list */}
            <div className="space-y-3 relative z-10">
                <AnimatePresence>
                    {keys.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="glass border border-aegis-border rounded-xl p-10 text-center">
                            <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-400 text-sm">No API keys yet.</p>
                            <button onClick={() => setShowGenerate(true)}
                                className="mt-3 text-aegis-cyan text-sm hover:underline">Generate your first key →</button>
                        </motion.div>
                    ) : (
                        keys.map(k => (
                            <KeyRow key={k.key_id} k={k} token={token} onRevoke={handleRevoke} onCopied={() => showToast("Copied!")} />
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Admin Controls */}
            {user?.tier === "admin" && (
                <div className="mt-8 pt-8 border-t border-slate-800">
                    <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-aegis-cyan" /> Admin Controls
                    </h2>
                    <div className="glass border border-slate-700/50 rounded-xl p-5 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">Target Email</label>
                            <input type="email" value={adminTargetEmail} onChange={e => setAdminTargetEmail(e.target.value)}
                                placeholder="user@target.com"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-aegis-cyan" />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">New Tier</label>
                            <select value={adminTargetTier} onChange={e => setAdminTargetTier(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-aegis-cyan">
                                <option value="free">Developer</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <motion.button onClick={handleAdminGrant} disabled={adminLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            className="bg-aegis-cyan text-aegis-bg font-bold text-sm px-6 py-2.5 rounded-lg flex items-center gap-2 h-[42px] disabled:opacity-60">
                            {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Grant Plan"}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showGenerate && <GenerateModal token={token} onClose={() => setShowGenerate(false)} onGenerated={handleGenerated} />}
            {newRaw && <NewKeyModal rawKey={newRaw} onClose={() => setNewRaw(null)} />}

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-aegis-border text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-50">
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
