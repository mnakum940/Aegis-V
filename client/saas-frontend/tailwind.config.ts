import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "aegis-bg": "#040b1a",
                "aegis-dark": "#070f20",
                "aegis-panel": "rgba(8, 18, 40, 0.85)",
                "aegis-blue": "#0ea5e9",
                "aegis-cyan": "#06d6f5",
                "aegis-glow": "#00f5ff",
                "aegis-red": "#ff3b3b",
                "aegis-red-dark": "#7f1d1d",
                "aegis-green": "#00ff88",
                "aegis-border": "rgba(14, 165, 233, 0.2)",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            backgroundImage: {
                "grid-pattern":
                    "linear-gradient(rgba(14,165,233,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.04) 1px,transparent 1px)",
                "hero-gradient":
                    "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(6,214,245,0.12),transparent)",
                "threat-gradient":
                    "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(255,59,59,0.15),transparent)",
            },
            backgroundSize: {
                grid: "40px 40px",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "spin-slow": "spin 8s linear infinite",
                shimmer: "shimmer 2s linear infinite",
                float: "float 6s ease-in-out infinite",
                "border-flow": "borderFlow 4s ease infinite",
            },
            keyframes: {
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                borderFlow: {
                    "0%, 100%": { borderColor: "rgba(14,165,233,0.3)" },
                    "50%": { borderColor: "rgba(6,214,245,0.8)" },
                },
            },
            boxShadow: {
                glow: "0 0 20px rgba(6,214,245,0.3), 0 0 60px rgba(6,214,245,0.1)",
                "glow-red": "0 0 20px rgba(255,59,59,0.4), 0 0 60px rgba(255,59,59,0.1)",
                "glow-green": "0 0 20px rgba(0,255,136,0.3)",
                glass: "0 8px 32px rgba(0,0,0,0.4)",
            },
        },
    },
    plugins: [],
};

export default config;
