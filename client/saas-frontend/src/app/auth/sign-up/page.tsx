"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BACKEND = "http://localhost:8000";

export default function SignUpPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "", confirm: "", organization: "", tier: "free" });
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!form.email || !form.password || !form.organization)
            return setError("All fields are required.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            return setError("Enter a valid email address.");
        if (form.password.length < 8)
            return setError("Password must be at least 8 characters.");
        if (form.password !== form.confirm)
            return setError("Passwords do not match.");

        setLoading(true);
        try {
            const res = await fetch(`${BACKEND}/v1/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: form.email, password: form.password, organization: form.organization, tier: form.tier }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail ?? "Signup failed");
            setSuccess(true);
            setTimeout(() => router.push("/auth/login"), 1800);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative">
            <div className="pointer-events-none fixed inset-0 z-0"
                style={{ backgroundImage: "linear-gradient(rgba(14,165,233,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.04) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                className="glass border border-aegis-border rounded-2xl p-8 w-full max-w-md relative z-10">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 mb-8">
                    <Shield className="w-7 h-7 text-aegis-cyan" />
                    <span className="font-bold text-xl text-white">Aegis<span className="text-aegis-cyan">‑V</span></span>
                </Link>

                <h1 className="text-2xl font-black text-white mb-1">Create account</h1>
                <p className="text-slate-400 text-sm mb-6">Get your API keys and secure your AI stack.</p>

                <AnimatePresence>
                    {success && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 bg-green-900/30 border border-green-500/40 rounded-xl px-4 py-3 mb-4 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" /> Account created! Redirecting to login…
                        </motion.div>
                    )}
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-red-400 text-xs">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                        { label: "Email", key: "email", type: "email", placeholder: "you@company.com" },
                        { label: "Organization", key: "organization", type: "text", placeholder: "Acme Corp" },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">{f.label}</label>
                            <input type={f.type} value={form[f.key as keyof typeof form]} onChange={set(f.key)}
                                placeholder={f.placeholder}
                                className="w-full bg-slate-900 border border-aegis-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-aegis-cyan/60 transition-colors" />
                        </div>
                    ))}

                    <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">Plan</label>
                        <select value={form.tier} onChange={set("tier")}
                            className="w-full bg-slate-900 border border-aegis-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-aegis-cyan/60 transition-colors">
                            <option value="free">Free — 3 keys, 100 req/day, 30 days</option>
                            <option value="pro">Pro — 10 keys, 1000 req/day, 1 year</option>
                            <option value="enterprise">Enterprise — Unlimited keys, no expiry</option>
                        </select>
                    </div>

                    {["Password", "Confirm Password"].map((label, i) => (
                        <div key={label}>
                            <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">{label}</label>
                            <div className="relative">
                                <input type={show ? "text" : "password"}
                                    value={i === 0 ? form.password : form.confirm}
                                    onChange={set(i === 0 ? "password" : "confirm")}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900 border border-aegis-border rounded-xl px-4 py-3 pr-10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-aegis-cyan/60 transition-colors" />
                                {i === 0 && (
                                    <button type="button" onClick={() => setShow(!show)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="w-full py-3 mt-2 rounded-xl text-sm font-bold bg-aegis-cyan text-aegis-bg flex items-center justify-center gap-2 disabled:opacity-60">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</> : "Create account"}
                    </motion.button>
                </form>

                <p className="text-center text-slate-500 text-xs mt-6">
                    Already have an account?{" "}
                    <Link href="/auth/login" className="text-aegis-cyan hover:underline">Sign in</Link>
                </p>
            </motion.div>
        </div>
    );
}
