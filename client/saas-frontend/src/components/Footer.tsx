"use client";
import { Shield } from "lucide-react";

const links = {
    Product: ["How It Works", "Attack Simulation", "Pricing", "Changelog"],
    Developers: ["Python SDK", "API Reference", "GitHub", "Postman Collection"],
    Company: ["About", "Blog", "Careers", "Contact"],
};

export default function Footer() {
    return (
        <footer className="relative border-t border-aegis-border py-16 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-4 gap-10 mb-12">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-6 h-6 text-aegis-cyan" />
                            <span className="font-black text-lg text-white">
                                Aegis<span className="text-aegis-cyan">‑V</span>
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            A self‑hardening AI immune system that protects LLMs from prompt injections,
                            jailbreaks, and adversarial attacks.
                        </p>
                    </div>

                    {/* Links */}
                    {Object.entries(links).map(([section, items]) => (
                        <div key={section}>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                                {section}
                            </div>
                            <ul className="space-y-2.5">
                                {items.map((item) => (
                                    <li key={item}>
                                        <a
                                            href="#"
                                            className="text-sm text-slate-500 hover:text-aegis-cyan transition-colors"
                                        >
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom */}
                <div className="border-t border-aegis-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-600">
                        © 2026 Aegis‑V. Built with 4-layer AI security architecture.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        All systems operational
                    </div>
                </div>
            </div>
        </footer>
    );
}
