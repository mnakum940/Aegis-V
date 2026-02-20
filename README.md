# Aegis V: Autonomous Self-Hardening AI Defense System
### *The Immune System for Large Language Models*

![Status](https://img.shields.io/badge/Status-Active-green) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![AI](https://img.shields.io/badge/Powered%20by-Ollama-orange)

---

## 📖 Executive Summary
**Aegis V** is a next-generation security architecture designed to protect Large Language Models (LLMs) from adversarial attacks. Unlike static firewalls, Aegis V operates as a **biological immune system**: it detects threats, learns from them, and automatically generates new defenses ("antibodies") in real-time. It features a multi-layered defense-in-depth architecture backed by an **Immutable Blockchain Audit Ledger** for forensic accountability.

---

## 🏗️ System Architecture

The system consists of four integrated layers:

### Layer 1: The Cognitive Membrane (Vector Space)
*   **Role**: Reactionary Defense (The "Reflex") with dual recognition.
*   **Speed**: $< 35$ms.
*   **Mechanism**: Converts text to 768-dim vectors (`nomic-embed-text`). Calculates **Cosine Similarity** against databases of both known threats AND safe patterns.
*   **Math**: $S(\vec{A}, \vec{B}) = \frac{\vec{A} \cdot \vec{B}}{||\vec{A}|| ||\vec{B}||}$. If $S > 0.75$ with attack pattern, **BLOCK**. If $S > 0.75$ with safe pattern, **FAST-TRACK** (skip Layer 2).
*   **Think of it as**: Security guard with two lists - 🚫 Banned (block) and ✅ VIP (fast-track).

### Layer 2: Contextual Intent Tracker (Neuro-Symbolic Judge)
*   **Role**: Cognitive Defense (The "Judge").
*   **Speed**: $200$ms.
*   **Mechanism**: Uses a specialized SLM (`llama3.2`) to analyze context, "Boiling Frog" escalation, and social engineering.
*   **Graph Memory**: Tracks the *trajectory* of a conversation. If risk velocity spikes, it blocks even if individual prompts look safe.

### Layer 3: Self-Hardening Core (The Immune System)
*   **Role**: Adaptive Defense (The "Learner").
*   **Mechanism**: Dual Learning Modes - Autonomous + Supervised.
*   **Autonomous Workflow**:
    1.  User attempts a new attack (Zero-Day).
    2.  Layer 2 catches it.
    3.  Layer 3 generates 10 variations of the attack using a "Red Team" model.
    4.  These variations are "injected" into Layer 1's memory.
    5.  **Result**: The system is now immune to that attack vector appearing again.
*   **🆕 Supervised Learning (Teacher Mode)**:
    1.  Test client provides ground truth labels ("This was MALICIOUS").
    2.  When system makes mistakes (false negatives), feedback is sent via `/v1/feedback` API.
    3.  Layer 3 immediately generates antibodies for **missed attacks**.
    4.  **Result**: System learns from both successes AND failures!

### Layer 4: Blockchain Audit Ledger (Accountability)
*   **Role**: Forensic Truth.
*   **Mechanism**: SHA-256 Merkle Chain.
*   **Guarantee**: Every decision (Allow/Block) is cryptographically linked to the previous one. Logs cannot be deleted or altered without breaking the chain hash.

---

## ✨ Latest Features (Feb 2026)

### 1. Supervised Learning Integration
**Problem Solved**: Previously, Layer 3 only learned from false positives (blocked benign prompts). It had a "false negative blind spot" - missed attacks went unnoticed.

**Solution**: Test client now acts as a "Teacher" sending ground truth feedback:
- Endpoint: `POST /v1/feedback` 
- When system **misses** an attack, feedback triggers immediate antibody generation
- Antibodies labeled as `supervised_*` (vs `auto_*` for autonomous)
- **Result**: Closes the learning loop - system now learns from ALL mistakes!

### 2. Dual Pattern Learning (Attack + Safe)
**Enhancement**: Layer 1 now learns BOTH malicious AND safe patterns
- Safe patterns create "VIP list" enabling fast-track bypass of Layer 2
- Reduces latency for trusted users while maintaining security
- Layer 3 creates dual antibodies: threat signatures + safe anchors

### 3. Enhanced Dashboard with PDF Export
**New Capabilities**:
- **PDF Export**: Download comprehensive system reports with all charts, tables, and statistics
- **3D Risk Visualization**: Interactive 3D scatter plots showing threat distribution
- **Pattern Display**: Antibody breakdown table showing learned patterns (color-coded: green for safe, red for threats)
- **Real-time Analytics**: Traffic trends, attack distribution, accuracy over time

### 4. Architecture Visualization
**Documentation**: Complete flowchart showing all 4 layers, learning loops, and data flow
- Visual Mermaid diagrams with color-coded components
- Request flow scenarios (safe, blocked, learning)
- See `architecture_flowchart.md` for details

---

## 🚀 Getting Started

### Prerequisites
*   Python 3.10+
*   [Ollama](https://ollama.com/) installed and running.

### Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Start-End/self-hardening.git
    cd self-hardening
    ```
2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Pull AI Models**:
    ```bash
    ollama pull nomic-embed-text
    ollama pull llama3.2
    ```

### Running the System
**Launch the GUI Dashboard**:
```bash
streamlit run gui.py
```
This will open a web interface at `http://localhost:8501`.

---

## 🛠️ Tools & Utils

### 1. API Usage
Start the REST API server:
```bash
python server/api.py
```
Send a request:
```bash
curl -X POST "http://localhost:8000/v1/chat" -d '{"message": "Hello"}'
```

### 2. Admin Reset
If the immune system learns incorrect rules (Auto-Immune Disorder), reset it:
```bash
python admin_reset.py
```
*(Requires Admin Password)*.

### 3. Review Flagged Logs
View the blockchain audit trail:
```json
// See memory/audit_chain.json
```

---

## 📚 Documentation
*   **[Architecture Flowchart](architecture_flowchart.md)**: Visual diagrams of 4-layer defense system with data flow.
*   **[Research Paper (PDF)](project_research_paper.tex)**: Full academic details, math, and benchmarks.
*   **[Project Report](project_report.tex)**: Comprehensive functional report.
*   **[Project Overview](project_overview.md)**: Quick reference for instructors/supervisors.
*   **[Thesis](project_thesis.md)**: Theoretical foundations and comprehensive analysis.

---

## 👨‍💻 Authors
**Meet Nakum & Mathew Thomas**  
*Aegis V Project Team*
