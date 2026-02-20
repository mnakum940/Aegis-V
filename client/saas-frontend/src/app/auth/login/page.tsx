"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BACKEND = "http://localhost:8000";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!email || !password) return setError("Enter your email and password.");

        setLoading(true);
        try {
            const res = await fetch(`${BACKEND}/v1/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail ?? "Login failed");

            localStorage.setItem("aegis_token", data.token);
            localStorage.setItem("aegis_user", JSON.stringify({
                user_id: data.user_id, email: data.email,
                organization: data.organization, tier: data.tier,
            }));
            router.push("/user/dashboard");
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

                <Link href="/" className="flex items-center gap-2 mb-8">
                    <Shield className="w-7 h-7 text-aegis-cyan" />
                    <span className="font-bold text-xl text-white">Aegis<span className="text-aegis-cyan">‑V</span></span>
                </Link>

                <h1 className="text-2xl font-black text-white mb-1">Welcome back</h1>
                <p className="text-slate-400 text-sm mb-6">Sign in to manage your API keys.</p>

                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-red-400 text-xs">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                            className="w-full bg-slate-900 border border-aegis-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-aegis-cyan/60 transition-colors" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">Password</label>
                        <div className="relative">
                            <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-900 border border-aegis-border rounded-xl px-4 py-3 pr-10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-aegis-cyan/60 transition-colors" />
                            <button type="button" onClick={() => setShow(!show)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="w-full py-3 mt-2 rounded-xl text-sm font-bold bg-aegis-cyan text-aegis-bg flex items-center justify-center gap-2 disabled:opacity-60">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : "Sign in"}
                    </motion.button>
                </form>

                <p className="text-center text-slate-500 text-xs mt-6">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/sign-up" className="text-aegis-cyan hover:underline">Create one</Link>
                </p>
            </motion.div>
        </div>
    );
}
