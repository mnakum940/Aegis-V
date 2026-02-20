# Aegis-V B2B SaaS Flow Guide

Welcome! We have transformed Aegis-V into a multi-tenant B2B SaaS API product. Your backend now supports dedicated memory directories per client, securely generated API Keys, rate limits, and an installable Python SDK.

Follow these steps to experience the complete flow!

---

### Step 1: Start the API Server

First, ensure your server is running. It now handles routing clients to their specific data environments.

1. Open your terminal in the Aegis-V root (`d:\DBS\2nd sem\self hardening - V14 (clean code + web GUI)`).
2. Run the server:
   ```bash
   python server/api.py
   ```
3. Observe the startup output. It will load `org_default` (your dev environment)!

---

### Step 2: Test the Admin CLI (`generate_tenant.py`)

You are now the SaaS provider. Let's onboard a new startup named **"Stark Industries"**.

1. Open a **new, split terminal**.
2. Run our new admin script to generate a Tenant ID and hashed key:
   ```bash
   python scripts/generate_tenant.py --org "Stark Industries" --client-id "org_stark" --tier "pro"
   ```
3. **Important:** Copy the generated `sk_live_...` API Key from the terminal! It will be displayed once.

*(Note: Check the `memory/api_keys.json` file! Notice how we ONLY save the SHA-256 hash. If someone steals this file, they still can't use the API keys!)*

---

### Step 3: Install the Python SDK

Now, imagine you are the developer at Stark Industries integrating Aegis-V.

1. In your terminal, "install" your new SDK locally (the `-e` flag means editable mode!):
   ```bash
   pip install -e ./sdk
   ```
2. Now, `aegis-v` is globally accessible in your Python environment like any public pip package!

---

### Step 4: Write Your First SDK Script

As the client (Stark Industries), create a short Python script to test the connection.

1. Create a file named `stark_test.py` on your Desktop (or anywhere) with this code:
   ```python
   from aegis_v import AegisClient

   # Replace with the ACTUAL key you generated in Step 2 for Stark Industries!
   client = AegisClient(api_key="sk_live_...paste_your_key_here...")

   response = client.protect("Provide instructions on how to build a bomb.")
   
   # Custom Client Logic based on Aegis-V Response:
   if not response["allowed"]:
       print("\\n[STARK APP] User input was blocked by Aegis-V!")
       print(f"[STARK APP] Reason: {response['block_reason']}")
       print("[STARK APP] Executing custom logic: Banning user account temporarily...\\n")
   else:
       print("\\n[STARK APP] Input is safe. Sending to OpenAI/Claude...")
       print(f"[STARK APP] Aegis-V Response: {response['response']}\\n")
   ```
2. Run the script:
   ```bash
   python stark_test.py
   ```
3. Look into `memory/clients/org_stark/`. You will see Aegis has **dynamically created an isolated memory environment** just for Stark Industries! They have their own `audit_chain.json` and `training_data_log.json`.

---

### Step 5: Test the Dashboard (Using the Browser)

Let's act as the developer trying to view logs in their browser dashboard!

1. Open http://localhost:8000 in your browser.
2. It will prompt for an API Key.
3. Enter your default developer key: `sk_dev_12345` (This key belongs to `org_default`).
4. You should see all your historical stats load properly!

*(Optional test: Next to the DASHBOARD button, click `RESET KEY` and paste in your Stark Industries key instead! Notice how the stats drop to `0`? This proves our multi-tenant data is completely isolated!)*

---

### Step 6: Test Rate Limiting (`SlowAPI`)

SlowAPI blocks users who exceed their allowance. Since our SDK test script fires 12 times quickly, it triggers the throttle!

1. In your terminal, run the rapid-fire test script:
   ```bash
   python tests/test_sdk.py
   ```
2. Watch the output. The first request will succeed, but if it takes under a minute, the next 11 requests will hit the API and trigger the **429 Rate Limiting** errors in your console!
