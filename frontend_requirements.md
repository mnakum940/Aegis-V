# B2B SaaS Frontend Architecture & User Flows

To commercialize Aegis-V, you need a full "Developer Portal" website (like Stripe or OpenAI's dashboard). Here are the exact requirements and step-by-step user flows you will need to build the frontend.

## 1. Core Pages & UI Components

### 🛒 1. Landing Page (Marketing)
*   **Hero Section:** "Secure your LLM in 3 lines of code."
*   **Features:** Multi-Modal Defense, Zero-Latency Architecture, Blockchain Auditing.
*   **Pricing Table:**
    *   **Developer Tier (Free):** 10 req/min, 1 custom antibody rule, basic logging.
    *   **Pro Tier ($49/mo):** 100 req/min, 50 custom rules, advanced analytics.
    *   **Enterprise Tier (Custom):** 10,000 req/min, dedicated server, white-label UI.

### 🔐 2. Authentication (Auth0 / Firebase / NextAuth)
*   OAuth Login (Google, GitHub) for developers.
*   Email/Password registration.
*   Organization creation (e.g., User belongs to "Stark Industries").

### 🎛️ 3. Client Dashboard (The Core Product)
*   **Overview Tab:** Real-time metrics (Threats blocked vs. safe, Latency, Total API Calls).
*   **API Keys Tab:**
    *   "Generate New Key" button.
    *   List of active keys (showing only `sk_live_...` prefix and creation date).
    *   "Revoke Key" button for security breaches.
*   **Billing / Plans Tab:**
    *   Current plan usage progress bar (e.g., 8,000 / 10,000 monthly requests).
    *   Stripe Integration ("Upgrade to Pro" button).
*   **Logs / Audit Tab:**
    *   Searchable table of the Blockchain Audit Ledger showing precisely what was blocked and why.
    *   Option to flag "False Positives" to train the Immune System.

---

## 2. Step-by-Step User Flows

### Flow A: The Onboarding Flow (User registers and gets a key)
1.  **Visit:** Developer visits `aegis-v.com` and clicks "Get Started".
2.  **Auth:** Developer signs up via GitHub OAuth.
3.  **Onboarding:** Modal asks: "What is your company name?" (User enters "Stark Industries").
4.  **Auto-Generation:** 
    *   Frontend calls Backend `/api/admin/create-tenant`.
    *   Backend generates a Tenant ID (`org_stark`) and hashes an API Key.
    *   Backend creates an isolated `memory/clients/org_stark` directory.
5.  **Success:** User is dumped into the Dashboard. A pop-up shows: "Here is your API Key. It will only be shown once. Copy it now."

### Flow B: Upgrade to Pro (Billing Flow)
1.  **Trigger:** User hits their Free Tier rate limit and clicks "Upgrade to Pro".
2.  **Stripe Checkout:** Frontend redirects the user to a Stripe Checkout Session.
3.  **Payment Success:** Stripe sends a Webhook to your Backend saying "Stark Industries paid."
4.  **Configuration Update:** Backend automatically updates `memory/api_keys.json`, changing `"tier": "pro"` and `"rate_limit_config": "100/minute"`.
5.  **Confirmation:** User returns to Dashboard, UI shows "Pro Active." Next SDK request automatically scales to 100/min.

### Flow C: Key Compromise (Security Flow)
1.  **Panic:** Developer accidentally pushes their `sk_live_...` key to public GitHub.
2.  **Action:** Developer clicks "Revoke Key" in the Aegis Dashboard.
3.  **Backend Update:** Frontend tells Backend to change the key status to `"status": "revoked"`.
4.  **Halt:** Any hacker trying to use the old SDK key gets an immediate `403 Forbidden` from Aegis Server.
5.  **Reset:** Developer clicks "Generate New Key" to get back online safely.

---

## 3. Technology Stack Recommendation

To build this quickly and securely:
*   **Frontend Framework:** Next.js (React) or Vite (React).
*   **Styling:** Tailwind CSS + Shadcn UI (for fast, beautiful dashboard components).
*   **Authentication:** Clerk or Supabase Auth (handles multi-tenant organizations perfectly).
*   **Payments:** Stripe Billing (Customer Portal).
*   **Charts:** Recharts or Chart.js (for the Overview Tab telemetry).
