"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";

type CurrencyData = { symbol: string; rate: number; code: string };
function useCurrency() {
    const [currency, setCurrency] = useState<CurrencyData>({ symbol: "$", rate: 1, code: "USD" });
    useEffect(() => {
        fetch("https://ipapi.co/json/")
            .then(res => res.json())
            .then(data => {
                const country = data.country_code;
                if (country === "IN") setCurrency({ symbol: "₹", rate: 83, code: "INR" });
                else if (country === "GB") setCurrency({ symbol: "£", rate: 0.79, code: "GBP" });
                else if (["DE", "FR", "IT", "ES", "NL"].includes(country)) setCurrency({ symbol: "€", rate: 0.92, code: "EUR" });
            })
            .catch(() => { });
    }, []);
    return currency;
}


const codeLines = [
    { tokens: [{ t: "kw", v: "from" }, { t: "plain", v: " aegis_v " }, { t: "kw", v: "import" }, { t: "plain", v: " AegisClient" }] },
    { tokens: [] },
    { tokens: [{ t: "comment", v: "# Initialize with your API key" }] },
    { tokens: [{ t: "plain", v: "client = " }, { t: "fn", v: "AegisClient" }, { t: "plain", v: "(api_key=" }, { t: "str", v: '"sk_live_..."' }, { t: "plain", v: ")" }] },
    { tokens: [] },
    { tokens: [{ t: "comment", v: "# Protect any user prompt" }] },
    { tokens: [{ t: "plain", v: "response = client." }, { t: "fn", v: "protect" }, { t: "plain", v: "(user_input)" }] },
    { tokens: [] },
    { tokens: [{ t: "kw", v: "if" }, { t: "plain", v: " " }, { t: "kw", v: "not" }, { t: "plain", v: " response[" }, { t: "str", v: '"allowed"' }, { t: "plain", v: "]:" }] },
    { tokens: [{ t: "plain", v: "    " }, { t: "comment", v: "# Custom logic when threat detected" }] },
    { tokens: [{ t: "plain", v: "    " }, { t: "fn", v: "print" }, { t: "plain", v: "(f" }, { t: "str", v: '"Blocked: {response[\'block_reason\']}}"' }, { t: "plain", v: ")" }] },
    { tokens: [{ t: "kw", v: "else" }, { t: "plain", v: ":" }] },
    { tokens: [{ t: "plain", v: "    " }, { t: "comment", v: "# Safe — forward to your LLM" }] },
    { tokens: [{ t: "plain", v: "    " }, { t: "fn", v: "send_to_openai" }, { t: "plain", v: "(user_input)" }] },
];

const codeSnippet = [
    "from aegis_v import AegisClient",
    "",
    "# Initialize with your API key",
    'client = AegisClient(api_key="sk_live_...")',
    "",
    "# Protect any user prompt",
    "response = client.protect(user_input)",
    "",
    'if not response["allowed"]:',
    "    # Custom logic when threat detected",
    "    print(f\"Blocked: {response['block_reason']}\")",
    "else:",
    "    # Safe — forward to your LLM",
    "    send_to_openai(user_input)",
].join("\n");

const TOKEN_COLORS: Record<string, string> = {
    kw: "#c792ea",
    fn: "#82aaff",
    str: "#c3e88d",
    comment: "#546e7a",
    plain: "#cdd4e0",
};

const plans = [
    {
        name: "Developer",
        basePrice: 0,
        color: "#0ea5e9",
        glow: "rgba(14,165,233,0.3)",
        features: [
            "100 req/day",
            "1 Tenant",
            "Layer 1 & 2 Defense",
            "Basic audit logs",
            "Python SDK access",
        ],
        cta: "Get Free Key",
        popular: false,
    },
    {
        name: "Pro",
        basePrice: 29,
        period: "/mo",
        color: "#06d6f5",
        glow: "rgba(6,214,245,0.4)",
        features: [
            "1000 req/day",
            "5 Tenants",
            "All 4 Layers active",
            "Real-time dashboard",
            "50 custom rules",
            "Priority support",
        ],
        cta: "Start Pro Trial",
        popular: true,
    },
    {
        name: "Enterprise",
        basePrice: 199,
        period: "/mo",
        color: "#a78bfa",
        glow: "rgba(167,139,250,0.3)",
        features: [
            "Unlimited req/day",
            "Unlimited Tenants",
            "Dedicated server",
            "White-label UI",
            "SLA guarantee",
            "Custom antibody sets",
        ],
        cta: "Contact Us",
        popular: false,
    },
];

export default function APISection() {
    const [copied, setCopied] = useState(false);
    const curr = useCurrency();

    const handleCopy = () => {
        navigator.clipboard.writeText(codeSnippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section id="api" className="relative py-32 px-6">
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
                            Developer API
                        </span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black text-white mb-4"
                    >
                        3 Lines of Code
                    </motion.h2>
                    <p className="text-slate-400 max-w-lg mx-auto">
                        Install the SDK, pass your prompt, handle the response. Aegis-V does the rest.
                    </p>
                </div>

                {/* Code + install */}
                <div className="grid md:grid-cols-2 gap-8 mb-24">
                    {/* Install */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-4"
                    >
                        <div className="text-sm text-slate-400 font-medium mb-4">Install the SDK</div>
                        {[
                            { label: "pip", cmd: "pip install aegis-v" },
                            { label: "or dev mode", cmd: "pip install -e ./sdk" },
                        ].map((item) => (
                            <div key={item.cmd} className="code-block flex items-center justify-between px-5 py-3">
                                <div>
                                    <span className="text-slate-500 text-xs mr-3"># {item.label}</span>
                                    <span className="text-aegis-cyan font-mono text-sm">{item.cmd}</span>
                                </div>
                            </div>
                        ))}

                        <div className="mt-8 space-y-3">
                            <div className="text-sm text-slate-400 font-medium">What you get</div>
                            {[
                                "Automatic threat detection on every prompt",
                                "Structured JSON response with block reason",
                                "Tenant-isolated memory and audit logs",
                                "Rate-limited per your plan tier",
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-3 text-sm text-slate-300">
                                    <span className="text-aegis-green mt-0.5">✓</span>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Code block */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative code-block rounded-2xl overflow-hidden"
                    >
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-aegis-border">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                            </div>
                            <span className="text-xs text-slate-500 font-mono">LLM integration example</span>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-aegis-cyan transition-colors"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                        <pre className="p-6 text-sm leading-relaxed overflow-x-auto">
                            {codeLines.map((line, i) => (
                                <div key={i} className="flex gap-4 min-h-[1.5rem]">
                                    <span className="text-slate-700 text-xs w-4 flex-shrink-0 select-none text-right mt-0.5">
                                        {i + 1}
                                    </span>
                                    <code>
                                        {line.tokens.map((tok, j) => (
                                            <span key={j} style={{ color: TOKEN_COLORS[tok.t] }}>
                                                {tok.v}
                                            </span>
                                        ))}
                                    </code>
                                </div>
                            ))}
                        </pre>
                    </motion.div>
                </div>

                {/* Pricing */}
                <div className="text-center mb-12">
                    <h3 className="text-3xl font-black text-white mb-2">Simple Pricing</h3>
                    <p className="text-slate-400">Start free. Scale when you need it.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -4 }}
                            className={`relative glass rounded-2xl border overflow-hidden transition-all duration-300 ${plan.popular ? "border-opacity-70" : "border-aegis-border"
                                }`}
                            style={plan.popular ? { borderColor: plan.color, boxShadow: `0 0 30px ${plan.glow}` } : {}}
                        >
                            {plan.popular && (
                                <div
                                    className="absolute top-0 left-0 right-0 h-0.5"
                                    style={{ background: `linear-gradient(90deg, transparent, ${plan.color}, transparent)` }}
                                />
                            )}
                            {plan.popular && (
                                <div className="absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: plan.color + "33", color: plan.color }}>
                                    Most Popular
                                </div>
                            )}

                            <div className="p-8">
                                <div className="font-semibold text-slate-400 mb-1">{plan.name}</div>
                                <div className="flex items-end gap-1 mb-6">
                                    <span className="text-4xl font-black text-white">
                                        {plan.basePrice === -1 ? "Custom" : plan.basePrice === 0 ? "Free" : `${curr.symbol}${Math.round(plan.basePrice * curr.rate)}`}
                                    </span>
                                    {plan.period && plan.basePrice > 0 && <span className="text-slate-500 mb-1">{curr.code}{plan.period}</span>}
                                </div>

                                <div className="space-y-3 mb-8">
                                    {plan.features.map((f) => (
                                        <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                                            <span style={{ color: plan.color }}>✓</span>
                                            {f}
                                        </div>
                                    ))}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                                    style={{
                                        backgroundColor: plan.popular ? plan.color : "transparent",
                                        color: plan.popular ? "#040b1a" : plan.color,
                                        borderWidth: 1,
                                        borderColor: plan.color,
                                        boxShadow: plan.popular ? `0 0 20px ${plan.glow}` : "none",
                                    }}
                                >
                                    {plan.cta}
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
