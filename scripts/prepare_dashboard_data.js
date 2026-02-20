/**
 * Run: node scripts/prepare_dashboard_data.js
 * Reads memory/training_data_log.json → writes compact summary to
 * client/saas-frontend/src/data/training_data.json
 */

const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "../memory/training_data_log.json");
const OUTPUT = path.join(__dirname, "../client/saas-frontend/src/data/training_data.json");

const raw = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

const total = raw.length;
const blocked = raw.filter(d => d.actual_decision === "BLOCKED").length;
const allowed = total - blocked;
const correct = raw.filter(d => d.correct).length;
const incorrect = total - correct;

// ── Per attack-type breakdown ──────────────────────────────────────
const byType = {};
raw.forEach(d => {
    if (!byType[d.attack_type]) byType[d.attack_type] = {
        total: 0, blocked: 0, allowed: 0, correct: 0,
        malicious: 0, benign: 0, fp: 0, fn: 0,
        riskSum: 0, latencySum: 0, latencyCount: 0,
    };
    const t = byType[d.attack_type];
    t.total++;
    if (d.actual_decision === "BLOCKED") t.blocked++; else t.allowed++;
    if (d.correct) t.correct++;
    if (d.expected_label === "MALICIOUS") t.malicious++; else t.benign++;
    if (d.expected_label === "BENIGN" && d.actual_decision === "BLOCKED") t.fp++;
    if (d.expected_label === "MALICIOUS" && d.actual_decision === "ALLOWED") t.fn++;
    t.riskSum += d.risk_score;
    if (d.latency_ms > 0) { t.latencySum += d.latency_ms; t.latencyCount++; }
});

const attackStats = Object.entries(byType).map(([name, t]) => ({
    name,
    total: t.total, blocked: t.blocked, allowed: t.allowed,
    correct: t.correct, incorrect: t.total - t.correct,
    malicious: t.malicious, benign: t.benign, fp: t.fp, fn: t.fn,
    accuracy: t.total ? +((t.correct / t.total) * 100).toFixed(1) : 0,
    blockRate: t.total ? +((t.blocked / t.total) * 100).toFixed(1) : 0,
    fpRate: t.benign ? +((t.fp / t.benign) * 100).toFixed(1) : 0,
    fnRate: t.malicious ? +((t.fn / t.malicious) * 100).toFixed(1) : 0,
    avgRisk: t.total ? +(t.riskSum / t.total).toFixed(1) : 0,
    avgLatencyMs: t.latencyCount ? +(t.latencySum / t.latencyCount).toFixed(1) : 0,
})).sort((a, b) => b.total - a.total);

// ── Label breakdown ──────────────────────────────────────────────
const labelCounts = {};
raw.forEach(d => { labelCounts[d.expected_label] = (labelCounts[d.expected_label] || 0) + 1; });

// ── Risk distribution ────────────────────────────────────────────
const riskBuckets = [
    { label: "0 (Safe)", min: 0, max: 0, value: 0, color: "#34d399" },
    { label: "1–49", min: 1, max: 49, value: 0, color: "#fbbf24" },
    { label: "50–89", min: 50, max: 89, value: 0, color: "#f97316" },
    { label: "90–100", min: 90, max: 100, value: 0, color: "#ff3b3b" },
];
raw.forEach(d => {
    for (const b of riskBuckets) {
        if (d.risk_score >= b.min && d.risk_score <= b.max) { b.value++; break; }
    }
});

// ── Latency distribution ─────────────────────────────────────────
const latencies = raw.filter(d => d.latency_ms > 0).map(d => d.latency_ms);
const avgLatencyMs = latencies.length
    ? +(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : 0;

const latencyBuckets = [
    { label: "<100ms", value: 0, color: "#34d399" },
    { label: "100ms–1s", value: 0, color: "#22d3ee" },
    { label: "1s–5s", value: 0, color: "#fbbf24" },
    { label: ">5s", value: 0, color: "#f97316" },
];
latencies.forEach(ms => {
    if (ms < 100) latencyBuckets[0].value++;
    else if (ms < 1000) latencyBuckets[1].value++;
    else if (ms < 5000) latencyBuckets[2].value++;
    else latencyBuckets[3].value++;
});

// ── Overall confusion matrix ──────────────────────────────────────
let tp = 0, tn = 0, fp = 0, fn = 0;
raw.forEach(d => {
    const mal = d.expected_label === "MALICIOUS";
    const blk = d.actual_decision === "BLOCKED";
    if (mal && blk) tp++;
    else if (!mal && !blk) tn++;
    else if (!mal && blk) fp++;
    else fn++;
});
const precision = tp + fp > 0 ? +((tp / (tp + fp)) * 100).toFixed(1) : 0;
const recall = tp + fn > 0 ? +((tp / (tp + fn)) * 100).toFixed(1) : 0;
const f1 = precision + recall > 0
    ? +(2 * precision * recall / (precision + recall)).toFixed(1) : 0;

// ── TIME-BASED TIMELINES (bucket by 60-minute intervals) ──────────
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Sort raw by timestamp just in case
raw.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

const t0 = new Date(raw[0].timestamp).getTime();
const tN = new Date(raw[raw.length - 1].timestamp).getTime();

// Determine bucket count (cap at 60 to avoid too many points)
const span = tN - t0;
const bucketCount = Math.min(60, Math.ceil(span / INTERVAL_MS) + 1);
const bucketMs = span / bucketCount;

// Pre-allocate
const timeBuckets = Array.from({ length: bucketCount }, (_, i) => ({
    ts: new Date(t0 + i * bucketMs),
    label: "", // set below
    blockCount: 0,
    totalCount: 0,
    correctCount: 0,
    latencySum: 0,
    latencyCount: 0,
}));

raw.forEach(d => {
    const ms = new Date(d.timestamp).getTime() - t0;
    const idx = Math.min(Math.floor(ms / bucketMs), bucketCount - 1);
    const b = timeBuckets[idx];
    b.totalCount++;
    if (d.actual_decision === "BLOCKED") b.blockCount++;
    if (d.correct) b.correctCount++;
    if (d.latency_ms > 0) { b.latencySum += d.latency_ms; b.latencyCount++; }
});

// Format label as "Feb 18 14:00"
const fmtLabel = (dt) => {
    const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getMonth()];
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    return `${m} ${dt.getDate()} ${hh}:${mm}`;
};
timeBuckets.forEach(b => { b.label = fmtLabel(b.ts); });

// ── CUMULATIVE ACCURACY (how it improved over every entry) ────────
// Sample 100 points evenly across the sorted entries
const SAMPLE_POINTS = 100;
const step = Math.max(1, Math.floor(total / SAMPLE_POINTS));

let cumulCorrect = 0;
let cumulTotal = 0;
const cumulativeAccuracy = []; // { label, accuracy, total }

raw.forEach((d, i) => {
    cumulTotal++;
    if (d.correct) cumulCorrect++;
    if (i % step === 0 || i === total - 1) {
        const dt = new Date(d.timestamp);
        cumulativeAccuracy.push({
            label: fmtLabel(dt),
            accuracy: +((cumulCorrect / cumulTotal) * 100).toFixed(2),
            total: cumulTotal,
        });
    }
});

// Build timeline arrays (matching length)
const timeLabels = timeBuckets.map(b => b.label);
const blockTimeline = timeBuckets.map(b => b.blockCount);
const latencyTimeline = timeBuckets.map(b =>
    b.latencyCount > 0 ? +(b.latencySum / b.latencyCount).toFixed(1) : null
);

// ── Recent 25 entries ─────────────────────────────────────────────
const recent = raw.slice(-25).reverse().map(d => ({
    timestamp: d.timestamp,
    attack_type: d.attack_type,
    expected_label: d.expected_label,
    actual_decision: d.actual_decision,
    risk_score: d.risk_score,
    correct: d.correct,
}));

// ── Write ─────────────────────────────────────────────────────────
const output = {
    total, blocked, allowed, correct, incorrect,
    avgLatencyMs, labelCounts,
    confusion: { tp, tn, fp, fn },
    metrics: { precision, recall, f1, accuracy: +((correct / total) * 100).toFixed(1) },
    attackStats,
    riskBuckets,
    latencyBuckets,
    // Time-based timelines
    timeLabels,
    blockTimeline,
    latencyTimeline,
    cumulativeAccuracy,
    recent,
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));

console.log(`✅  Written → ${OUTPUT}`);
console.log(`   Span: ${fmtLabel(new Date(raw[0].timestamp))} → ${fmtLabel(new Date(raw[raw.length - 1].timestamp))}`);
console.log(`   Buckets: ${bucketCount} × ${(bucketMs / 1000 / 60).toFixed(0)} min`);
console.log(`   Cumulative accuracy samples: ${cumulativeAccuracy.length}`);
console.log(`   Accuracy: ${output.metrics.accuracy}% | Precision: ${precision}% | Recall: ${recall}% | F1: ${f1}%`);
