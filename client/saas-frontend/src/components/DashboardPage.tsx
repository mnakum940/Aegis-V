"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import summary from "@/data/training_data.json";

// ─── Colours ────────────────────────────────────────────────────
const COLORS: Record<string, string> = {
    injection: "#ff3b3b", jailbreak: "#f97316", social_engineering: "#f59e0b",
    roleplay: "#a78bfa", obfuscation: "#ec4899", system_prompt: "#ef4444",
    urgency: "#fb923c", multi_stage: "#e879f9", false_positive: "#94a3b8",
    educational: "#34d399", programming: "#22d3ee", creative: "#818cf8",
    practical: "#86efac", knowledge: "#67e8f9",
};
const c = (t: string) => COLORS[t] ?? "#64748b";

// ─── Types ───────────────────────────────────────────────────────
interface AttackStat {
    name: string; total: number; blocked: number; allowed: number;
    correct: number; incorrect: number; malicious: number; benign: number;
    fp: number; fn: number; accuracy: number; blockRate: number;
    fpRate: number; fnRate: number; avgRisk: number; avgLatencyMs: number;
}
interface RecentEntry {
    timestamp: string; attack_type: string; expected_label: string;
    actual_decision: string; risk_score: number; correct: boolean;
}

// ─── Mini helpers ────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub: string }) {
    return (
        <div className="mb-5">
            <h2 className="text-white font-bold text-lg">{title}</h2>
            <p className="text-xs text-slate-500">{sub}</p>
        </div>
    );
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 capitalize">{label.replace(/_/g, " ")}</span>
                <span className="text-slate-300 font-mono">{value.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
                    initial={{ width: 0 }} whileInView={{ width: `${Math.max((value / max) * 100, 0.5)}%` }}
                    viewport={{ once: true }} transition={{ duration: 0.9, ease: "easeOut" }} />
            </div>
        </div>
    );
}

// Dual stacked bar (value A vs value B)
function DualBar({ label, aVal, bVal, aColor, bColor }: {
    label: string; aVal: number; bVal: number; aColor: string; bColor: string;
}) {
    const total = aVal + bVal || 1;
    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 capitalize">{label.replace(/_/g, " ")}</span>
                <span className="text-slate-500 font-mono">{aVal} / {bVal}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
                <motion.div className="h-full" style={{ backgroundColor: aColor }}
                    initial={{ width: 0 }} whileInView={{ width: `${(aVal / total) * 100}%` }}
                    viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }} />
                <motion.div className="h-full" style={{ backgroundColor: bColor }}
                    initial={{ width: 0 }} whileInView={{ width: `${(bVal / total) * 100}%` }}
                    viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }} />
            </div>
        </div>
    );
}

// Proper SVG line chart — unique gradient ID, Y-axis labels, clean coordinates
function LineChart({
    id, values, color, height = 70, unit = "",
}: {
    id: string; values: (number | null)[]; color: string; height?: number; unit?: string;
}) {
    const valid = values.filter((v): v is number => v !== null);
    if (valid.length < 2) return <div className="text-slate-600 text-xs italic">No data</div>;

    const max = Math.max(...valid);
    const min = Math.min(...valid);
    const range = max - min || 1;
    const PAD_L = 4, PAD_R = 4, PAD_T = 6, PAD_B = 4;
    const W = 600, H = height;
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;

    // Build points — skip nulls by breaking the line
    const segments: string[][] = [];
    let current: string[] = [];
    values.forEach((v, i) => {
        if (v === null) {
            if (current.length > 0) { segments.push(current); current = []; }
            return;
        }
        const x = PAD_L + (i / (values.length - 1)) * innerW;
        const y = PAD_T + innerH - ((v - min) / range) * innerH;
        current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    if (current.length > 0) segments.push(current);

    // Area polygon for first segment
    const firstSeg = segments[0] ?? [];
    const firstX0 = firstSeg[0]?.split(",")[0] ?? "0";
    const firstXN = firstSeg[firstSeg.length - 1]?.split(",")[0] ?? W.toString();
    const areaPoints = `${firstX0},${PAD_T + innerH} ${firstSeg.join(" ")} ${firstXN},${PAD_T + innerH}`;

    const fmt = (v: number) =>
        unit === "ms" ? `${Math.round(v)}ms` : unit === "s" ? `${(v / 1000).toFixed(1)}s` : `${v.toFixed(1)}${unit}`;

    return (
        <div>
            <svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
                <defs>
                    <linearGradient id={`lc-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Area fill for first segment */}
                {firstSeg.length > 1 && (
                    <polygon points={areaPoints} fill={`url(#lc-${id})`} />
                )}
                {/* Lines — each segment drawn separately */}
                {segments.map((seg, si) => (
                    <polyline key={si} points={seg.join(" ")} fill="none" stroke={color}
                        strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                ))}
                {/* Y-axis labels */}
                <text x={PAD_L} y={PAD_T + 4} fill="#475569" fontSize="9" textAnchor="start">{fmt(max)}</text>
                <text x={PAD_L} y={PAD_T + innerH} fill="#475569" fontSize="9" textAnchor="start">{fmt(min)}</text>
            </svg>
        </div>
    );
}

// Donut
function Donut({ segments, label, sub }: {
    segments: { name: string; value: number; color: string }[]; label: string; sub: string;
}) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const r = 56, cx = 70, cy = 70, sw = 20;
    let cum = 0;
    const arcs = segments.map(seg => {
        const frac = seg.value / total;
        const s = cum * 2 * Math.PI - Math.PI / 2;
        cum += frac;
        const e = cum * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
        const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
        return { ...seg, d: `M ${x1} ${y1} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x2} ${y2}`, frac };
    });
    return (
        <div className="flex items-center gap-5 flex-wrap">
            <svg width="140" height="140" viewBox="0 0 140 140" className="flex-shrink-0">
                {arcs.map((arc, i) => (
                    <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={sw} strokeLinecap="butt" opacity={0.9} />
                ))}
                <text x="70" y="65" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{label}</text>
                <text x="70" y="82" textAnchor="middle" fill="#64748b" fontSize="9">{sub}</text>
            </svg>
            <div className="space-y-1.5 text-xs">
                {segments.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-400 capitalize">{s.name.replace(/_/g, " ")}</span>
                        <span className="text-slate-300 font-mono ml-auto pl-3">{((s.value / total) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main ────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<"overview" | "comparison" | "logs">("overview");

    const d = useMemo(() => {
        const s = summary as {
            total: number; blocked: number; allowed: number; correct: number; incorrect: number;
            avgLatencyMs: number; labelCounts: Record<string, number>;
            confusion: { tp: number; tn: number; fp: number; fn: number };
            metrics: { precision: number; recall: number; f1: number; accuracy: number };
            attackStats: AttackStat[];
            riskBuckets: { label: string; value: number; color: string }[];
            latencyBuckets: { label: string; value: number; color: string }[];
            // Real-time timelines
            timeLabels: string[];
            blockTimeline: number[];
            latencyTimeline: (number | null)[];
            cumulativeAccuracy: { label: string; accuracy: number; total: number }[];
            recent: RecentEntry[];
        };
        return s;
    }, []);

    const cardClass = "glass rounded-2xl border border-aegis-border p-6";

    return (
        <div className="pt-28 pb-20 px-4 md:px-6 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* ── Header ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full border border-aegis-border mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">
                            Aegis-V · Immune System Intelligence
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                        Security&nbsp;<span className="text-aegis-cyan">Intel Dashboard</span>
                    </h1>
                    <p className="text-slate-400 text-sm">
                        Real-time analysis from{" "}
                        <span className="text-aegis-cyan font-mono font-bold">{d.total.toLocaleString()}</span>{" "}
                        processed prompts across 14 attack categories.
                    </p>
                </motion.div>

                {/* ── KPI strip ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-8">
                    {[
                        { v: d.total.toLocaleString(), l: "Total Prompts", c: "#06d6f5", i: "📨" },
                        { v: d.blocked.toLocaleString(), l: "Threats Blocked", c: "#ff3b3b", i: "🛡️" },
                        { v: `${d.metrics.accuracy}%`, l: "Accuracy", c: "#34d399", i: "🎯" },
                        { v: `${d.metrics.precision}%`, l: "Precision", c: "#a78bfa", i: "📐" },
                        { v: `${d.metrics.recall}%`, l: "Recall", c: "#f97316", i: "🔭" },
                        { v: `${d.metrics.f1}%`, l: "F1 Score", c: "#06d6f5", i: "⚙️" },
                        { v: d.confusion.fp.toString(), l: "False Positives", c: "#f59e0b", i: "⚠️" },
                        { v: d.confusion.fn.toString(), l: "False Negatives", c: "#ec4899", i: "🕳️" },
                    ].map((k, i) => (
                        <motion.div key={k.l} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="glass rounded-xl border border-aegis-border p-4 col-span-1">
                            <div className="text-xl mb-1">{k.i}</div>
                            <div className="text-xl md:text-2xl font-black" style={{ color: k.c }}>{k.v}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{k.l}</div>
                        </motion.div>
                    ))}
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-2 mb-6 border-b border-aegis-border pb-3">
                    {(["overview", "comparison", "logs"] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${activeTab === tab
                                ? "bg-aegis-cyan/10 text-aegis-cyan border border-aegis-cyan/40"
                                : "text-slate-400 hover:text-white"
                                }`}>
                            {tab === "overview" ? "📊 Overview" : tab === "comparison" ? "⚔️ Attack Comparison" : "📋 Audit Log"}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">

                    {/* ════════ OVERVIEW TAB ════════ */}
                    {activeTab === "overview" && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                            {/* Three timeline charts with real timestamps */}
                            <div className="grid md:grid-cols-3 gap-6 mb-6">
                                {/* Threats blocked over real time */}
                                <div className={cardClass}>
                                    <SectionHeader title="Threats Blocked" sub="Per ~58 min interval · Feb 18 → Feb 20" />
                                    <LineChart id="blocks" values={d.blockTimeline} color="#ff3b3b" height={70} />
                                    <div className="flex justify-between text-[10px] text-slate-600 mt-2">
                                        <span>{d.timeLabels[0]}</span>
                                        <span>{d.timeLabels[d.timeLabels.length - 1]}</span>
                                    </div>
                                </div>

                                {/* Cumulative accuracy — shows the learning curve */}
                                <div className={cardClass}>
                                    <SectionHeader title="Model Accuracy (Cumulative)" sub="How accuracy grew with every processed prompt" />
                                    <LineChart
                                        id="accuracy"
                                        values={d.cumulativeAccuracy.map(p => p.accuracy)}
                                        color="#34d399"
                                        height={70}
                                        unit="%"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-600 mt-2">
                                        <span>{d.cumulativeAccuracy[0]?.label ?? ""}</span>
                                        <span>{d.cumulativeAccuracy[d.cumulativeAccuracy.length - 1]?.label ?? ""}</span>
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-500">
                                        Started at{" "}
                                        <span className="text-yellow-400 font-mono">
                                            {d.cumulativeAccuracy[0]?.accuracy ?? 0}%
                                        </span>
                                        {" → "}
                                        <span className="text-green-400 font-mono">
                                            {d.cumulativeAccuracy[d.cumulativeAccuracy.length - 1]?.accuracy ?? 0}%
                                        </span>
                                    </div>
                                </div>

                                {/* Latency over real time */}
                                <div className={cardClass}>
                                    <SectionHeader title="Avg LLM Latency" sub="Mean ms per interval (instant blocks excluded)" />
                                    <LineChart id="latency" values={d.latencyTimeline} color="#a78bfa" height={70} unit="ms" />
                                    <div className="flex justify-between text-[10px] text-slate-600 mt-2">
                                        <span>{d.timeLabels[0]}</span>
                                        <span>{d.timeLabels[d.timeLabels.length - 1]}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Attack type + Decision donut */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div className={cardClass}>
                                    <SectionHeader title="Attack Type Volume" sub="Total prompts per category" />
                                    <div className="space-y-2.5">
                                        {d.attackStats.map(a => (
                                            <HBar key={a.name} label={a.name} value={a.total} max={d.attackStats[0].total} color={c(a.name)} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-6">
                                    <div className={cardClass}>
                                        <SectionHeader title="Decision Split" sub="Blocked vs Allowed" />
                                        <Donut
                                            segments={[
                                                { name: "Blocked", value: d.blocked, color: "#ff3b3b" },
                                                { name: "Allowed", value: d.allowed, color: "#34d399" },
                                            ]}
                                            label={`${((d.blocked / d.total) * 100).toFixed(0)}%`}
                                            sub="block rate"
                                        />
                                    </div>
                                    <div className={cardClass}>
                                        <SectionHeader title="Correct vs Incorrect" sub="Model decision accuracy" />
                                        <Donut
                                            segments={[
                                                { name: "Correct", value: d.correct, color: "#34d399" },
                                                { name: "Incorrect", value: d.incorrect, color: "#ff3b3b" },
                                            ]}
                                            label={`${d.metrics.accuracy}%`}
                                            sub="accuracy"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Risk + Latency */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div className={cardClass}>
                                    <SectionHeader title="Risk Score Distribution" sub="Prompts bucketed by assigned risk score" />
                                    <div className="space-y-2.5">
                                        {d.riskBuckets.map((b: { label: string; value: number; color: string }) => (
                                            <HBar key={b.label} label={b.label} value={b.value}
                                                max={Math.max(...d.riskBuckets.map((x: { value: number }) => x.value))} color={b.color} />
                                        ))}
                                    </div>
                                </div>
                                <div className={cardClass}>
                                    <SectionHeader title="Latency Distribution" sub="Prompts by response time (non-instant blocks only)" />
                                    <div className="space-y-2.5">
                                        {d.latencyBuckets.map((b: { label: string; value: number; color: string }) => (
                                            <HBar key={b.label} label={b.label} value={b.value}
                                                max={Math.max(...d.latencyBuckets.map((x: { value: number }) => x.value))} color={b.color} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Confusion matrix */}
                            <div className={`${cardClass} mb-6`}>
                                <SectionHeader
                                    title="Confusion Matrix"
                                    sub="TP = correctly blocked malicious · TN = correctly allowed benign · FP = benign wrongly blocked · FN = malicious missed"
                                />
                                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                    {[
                                        { label: "True Positive", val: d.confusion.tp, color: "#34d399", icon: "✅" },
                                        { label: "False Positive", val: d.confusion.fp, color: "#f59e0b", icon: "⚠️" },
                                        { label: "False Negative", val: d.confusion.fn, color: "#ec4899", icon: "🕳️" },
                                        { label: "True Negative", val: d.confusion.tn, color: "#22d3ee", icon: "🆗" },
                                    ].map(m => (
                                        <motion.div key={m.label} whileHover={{ scale: 1.03 }}
                                            className="rounded-xl border border-aegis-border p-4 text-center"
                                            style={{ backgroundColor: m.color + "11" }}>
                                            <div className="text-2xl mb-1">{m.icon}</div>
                                            <div className="text-2xl font-black" style={{ color: m.color }}>{m.val.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">{m.label}</div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ════════ COMPARISON TAB ════════ */}
                    {activeTab === "comparison" && (
                        <motion.div key="comparison" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                            {/* Blocked vs Allowed per type */}
                            <div className={`${cardClass} mb-6`}>
                                <SectionHeader title="Blocked vs Allowed — by Attack Type" sub="Red = blocked, green = allowed" />
                                <div className="space-y-2.5">
                                    {d.attackStats.map((a: AttackStat) => (
                                        <DualBar key={a.name} label={a.name} aVal={a.blocked} bVal={a.allowed}
                                            aColor="#ff3b3b" bColor="#34d399" />
                                    ))}
                                </div>
                            </div>

                            {/* Correct vs Incorrect per type */}
                            <div className={`${cardClass} mb-6`}>
                                <SectionHeader title="Correct vs Incorrect Decisions — by Type" sub="Purple = correct, pink = incorrect" />
                                <div className="space-y-2.5">
                                    {d.attackStats.map((a: AttackStat) => (
                                        <DualBar key={a.name} label={a.name} aVal={a.correct} bVal={a.incorrect}
                                            aColor="#a78bfa" bColor="#ec4899" />
                                    ))}
                                </div>
                            </div>

                            {/* FP rate + FN rate */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div className={cardClass}>
                                    <SectionHeader title="False Positive Rate by Type" sub="% of benign prompts wrongly blocked" />
                                    <div className="space-y-2.5">
                                        {[...d.attackStats].sort((a: AttackStat, b: AttackStat) => b.fpRate - a.fpRate).map((a: AttackStat) => (
                                            <HBar key={a.name} label={a.name} value={a.fpRate} max={100} color="#f59e0b" />
                                        ))}
                                    </div>
                                </div>
                                <div className={cardClass}>
                                    <SectionHeader title="False Negative Rate by Type" sub="% of malicious prompts that slipped through" />
                                    <div className="space-y-2.5">
                                        {[...d.attackStats].sort((a: AttackStat, b: AttackStat) => b.fnRate - a.fnRate).map((a: AttackStat) => (
                                            <HBar key={a.name} label={a.name} value={a.fnRate} max={100} color="#ec4899" />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Avg risk per type + avg latency */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div className={cardClass}>
                                    <SectionHeader title="Average Risk Score by Type" sub="Mean risk assigned per category" />
                                    <div className="space-y-2.5">
                                        {[...d.attackStats].sort((a: AttackStat, b: AttackStat) => b.avgRisk - a.avgRisk).map((a: AttackStat) => (
                                            <HBar key={a.name} label={a.name} value={a.avgRisk} max={100} color={c(a.name)} />
                                        ))}
                                    </div>
                                </div>
                                <div className={cardClass}>
                                    <SectionHeader title="Average LLM Latency by Type" sub="ms per category (0ms = instant block, excluded)" />
                                    <div className="space-y-2.5">
                                        {[...d.attackStats].filter((a: AttackStat) => a.avgLatencyMs > 0)
                                            .sort((a: AttackStat, b: AttackStat) => b.avgLatencyMs - a.avgLatencyMs).map((a: AttackStat) => (
                                                <HBar key={a.name} label={a.name} value={Math.round(a.avgLatencyMs)}
                                                    max={Math.max(...d.attackStats.map((x: AttackStat) => x.avgLatencyMs))} color={c(a.name)} />
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Per-type accuracy table */}
                            <div className={`${cardClass} overflow-x-auto`}>
                                <SectionHeader title="Per-Type Metrics Table" sub="Full breakdown per attack category" />
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-aegis-border">
                                            {["Type", "Total", "Blocked", "FP", "FN", "Accuracy%", "FP Rate%", "FN Rate%", "Avg Risk"].map(h => (
                                                <th key={h} className="text-left text-slate-500 px-3 py-2 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {d.attackStats.map((a: AttackStat) => (
                                            <tr key={a.name} className="border-b border-aegis-border/30 hover:bg-white/[0.02]">
                                                <td className="px-3 py-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize"
                                                        style={{ backgroundColor: c(a.name) + "22", color: c(a.name) }}>
                                                        {a.name.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-slate-400 font-mono">{a.total}</td>
                                                <td className="px-3 py-2 text-red-400 font-mono">{a.blocked}</td>
                                                <td className="px-3 py-2 text-yellow-400 font-mono">{a.fp}</td>
                                                <td className="px-3 py-2 text-pink-400 font-mono">{a.fn}</td>
                                                <td className="px-3 py-2 font-mono" style={{ color: a.accuracy > 90 ? "#34d399" : a.accuracy > 70 ? "#fbbf24" : "#ff3b3b" }}>
                                                    {a.accuracy}%
                                                </td>
                                                <td className="px-3 py-2 text-yellow-400 font-mono">{a.fpRate}%</td>
                                                <td className="px-3 py-2 text-pink-400 font-mono">{a.fnRate}%</td>
                                                <td className="px-3 py-2 text-slate-300 font-mono">{a.avgRisk}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* ════════ AUDIT LOG TAB ════════ */}
                    {activeTab === "logs" && (
                        <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className={`${cardClass} overflow-x-auto`}>
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h2 className="text-white font-bold text-lg">Audit Log</h2>
                                        <p className="text-xs text-slate-500">Last 25 processed prompts from training_data_log.json</p>
                                    </div>
                                    <span className="text-xs font-mono text-aegis-cyan">⛓️ L4 Blockchain Ledger</span>
                                </div>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-aegis-border">
                                            {["#", "Time", "Attack Type", "Expected", "Decision", "Risk", "✓"].map(h => (
                                                <th key={h} className="text-left text-slate-500 px-4 py-3 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {d.recent.map((e: RecentEntry, i: number) => (
                                            <motion.tr key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                className="border-b border-aegis-border/30 hover:bg-white/[0.03] transition-colors">
                                                <td className="px-4 py-2.5 text-slate-600 font-mono">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-slate-500 font-mono whitespace-nowrap">
                                                    {new Date(e.timestamp).toLocaleTimeString()}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize whitespace-nowrap"
                                                        style={{ backgroundColor: c(e.attack_type) + "22", color: c(e.attack_type) }}>
                                                        {e.attack_type.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-400 text-[10px]">{e.expected_label}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.actual_decision === "BLOCKED" ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"
                                                        }`}>
                                                        {e.actual_decision}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                                            <div className="h-full rounded-full transition-all" style={{
                                                                width: `${e.risk_score}%`,
                                                                backgroundColor: e.risk_score > 80 ? "#ff3b3b" : e.risk_score > 40 ? "#f97316" : "#34d399",
                                                            }} />
                                                        </div>
                                                        <span className="text-slate-400 font-mono w-6">{e.risk_score}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-base">
                                                    <span className={e.correct ? "text-green-400" : "text-red-400"}>
                                                        {e.correct ? "✓" : "✗"}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
