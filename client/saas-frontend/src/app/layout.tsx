import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aegis-V | Secure Your LLM Before It Thinks",
  description:
    "Aegis-V is a multi-tenant, 4-layer AI security gateway that protects LLMs from prompt injection, jailbreaks, and adversarial attacks — in 3 lines of code.",
  keywords: ["LLM security", "prompt injection", "AI security", "API gateway"],
  openGraph: {
    title: "Aegis-V | AI Security for LLM Startups",
    description: "4-layer immune system for your LLM. Block prompt injections, jailbreaks, and adversarial attacks before they reach your model.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-aegis-bg text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
