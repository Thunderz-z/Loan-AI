# LoanLens: Autonomous AI Credit Underwriting & Explainability Platform

> **An institutional-grade, transparent credit risk underwriting platform combining calibrated Machine Learning (XGBoost), Game-Theoretic Explainability (SHAP TreeExplainer), and an Autonomous Agentic LLM Orchestrator on Groq LPUs.**

---

## 🌟 Executive Overview

Traditional automated credit underwriting systems operate as inscrutable "black boxes." Lending models evaluate applicants based on opaque internal heuristics, leaving credit officers unable to justify rejections and applicants without actionable pathways toward credit approval. This lack of transparency triggers severe regulatory risks under the **Fair Credit Reporting Act (FCRA)** and the **Equal Credit Opportunity Act (ECOA)**.

**LoanLens** fundamentally solves this transparency dilemma. It provides financial institutions with an end-to-end, explainable credit decisioning engine that:
1. **Accurately Quantifies Default Risk**: Computes calibrated default probabilities using production gradient-boosted trees.
2. **Mathematically Explains Every Decision**: Uses SHAP (SHapley Additive exPlanations) values to break down exactly which financial attributes increased or mitigated default risk.
3. **Simulates Counterfactual Term Restructuring**: Automatically calculates optimal, realistic term adjustments (amount, APR, term, DTI) to help applicants bridge the gap toward approval.
4. **Empowers Underwriters via an Autonomous AI Copilot**: Integrates high-speed Groq LPU reasoning to execute end-to-end credit actions (creating loans, adjusting terms, auditing trees, stress testing portfolios) using natural language directives.

---

## 🔬 Core Novelty & Key Differentiators

| Feature | Conventional Lending Software | LoanLens Platform |
|---|---|---|
| **Decision Explainability** | Generic score buckets or canned decline codes. | **Exact SHAP waterfall attributions** showing the precise percentage-point contribution of every feature from the population base risk. |
| **Adverse Action Notices** | Manual, labor-intensive letter generation. | **One-click FCRA-compliant notice generator** citing real mathematical risk drivers. |
| **Counterfactual Restructuring** | Guesswork and manual trial-and-error slider adjustments. | **Constrained Counterfactual Optimizer** that mathematically identifies the feasible risk floor and optimal loan structure. |
| **AI Integration** | Superficial chat widgets or passive assistants. | **Full Autonomous Agent with Tool Calling** capable of mutating the loan ledger, stress-testing portfolios, and creating applications. |
| **Inference Speed** | Sluggish multi-second cloud LLM roundtrips. | **Sub-second Groq LPU execution (300+ tokens/sec)** utilizing Qwen 2.5, Llama 3.3, and Mistral architectures. |
| **Regulatory Auditability** | Transient logs scattered across microservices. | **Immutable, persistent audit store** tracking every decision, human override, and agent execution. |

---

## 💻 Technology Stack

### Frontend Application
- **Framework**: React 18 (Functional Components, Hooks)
- **Build Tooling**: Vite 5 (Ultra-fast Hot Module Replacement & production bundling)
- **Styling**: Tailwind CSS (Dark financial terminal design system)
- **Data Visualization**: Recharts (Custom SVG Waterfall Charts, Probability Gauges, Area Charts, Risk Distributions)
- **Icons**: Heroicons & Lucide React
- **Routing**: React Router v6

### API & Orchestration Gateway
- **Runtime**: Node.js (ES Modules, v22+)
- **Web Server**: Express.js
- **Agent Orchestrator**: Multi-turn LLM reasoning loop with OpenAI-compatible tool calling schemas
- **Inference Acceleration**: Groq Cloud API with selectable LLM backends:
  - `qwen/qwen3.8-27b`: Qwen 3.8 27B (Fast Reasoning · Analytical Parameter Tuning)
  - `openai/gpt-oss-120b`: GPT-OSS 120B (High Capacity · Institutional Policy Reasoning)
  - `llama-3.3-70b-versatile`: Llama 3.3 70B (Groq Versatile Engine)
- **Deterministic Fallback**: Local rule-based NLP parser ensuring 100% uptime and tool execution without external API dependencies

### Machine Learning & Explainability (Python Backend & Dataset)
- **Training Dataset**: [LendingClub Dataset (accepted_loans.csv)](https://www.kaggle.com/datasets/wordsforthewise/lending-club) containing ~1.8 million historical loans, evaluating 24 borrower features.
- **API Framework**: FastAPI & Uvicorn
- **Classification Engine**: XGBoost (`XGBClassifier`) calibrated for credit default estimation ($P(\text{Default} \mid X)$)
- **Explainability**: SHAP (`TreeExplainer`) calculating exact Shapley values against a 500-sample background baseline
- **Preprocessing**: Scikit-Learn (`LabelEncoder`, `StandardScaler`, `ColumnTransformer`)
- **Data Analysis**: Pandas & NumPy

### Storage & Persistence
- **Primary Relational Database**: `backend/loanlens.db` (Live SQLite database managed via Node 22 native `node:sqlite` `DatabaseSync` engine and Python `sqlite3`, storing full application profiles, decisions, and serialized SHAP attributions)
- **Audit & Export Mirror**: `backend/audit_store.json` (Atomic JSON audit trail kept in continuous synchronization with SQLite)

---

## 🚀 Key Platform Features

### 1. Autonomous AI Agent Studio (`/agent-studio`)
The central command center for credit officers. Underwriters can communicate with the system using natural conversational directives:
- *"Create a new approved car loan for Marcus Vance with $22,000 requested, 770 FICO, and low DTI."*
- *"Audit the SHAP tree drivers for Alex Morgan to understand why their application was rejected."*
- *"Run a portfolio stress test simulating a 250 bps rate hike and a 4% surge in unemployment."*
- *"Generate an FCRA-compliant adverse action notice citing the primary risk drivers."*
- *"What is the difference between front-end and back-end DTI, and how does our underwriting threshold treat them?"*

The agent parses intents, executes verified backend tools, updates the persistence store, and delivers executive-grade syntheses.

### 2. Decision Analysis & SHAP Waterfall Explorer (`/decision`)
Provides deep-dive inspection of individual loan applications:
- **Calibrated Risk Gauge**: Visualizes default probability against institutional tiers:
  - `< 15.00%`: **APPROVE** (Prime Tier, Automated Approval)
  - `15.00% - 30.00%`: **REVIEW** (Discretionary Manual Underwriting)
  - `> 30.00%`: **REJECT** (High Risk Tier)
- **SHAP Waterfall Plot**: Decomposes the applicant's risk into mitigating factors (green) and risk-accelerating factors (red), anchored to the population baseline expectation of **43.40%**.
- **Interactive What-If Simulator**: Allows loan officers to manipulate loan amounts, APRs, terms, and DTI in real time to observe instantaneous score recalculations.
- **Counterfactual Term Optimizer**: Computes the optimal loan package to minimize default risk while honoring static constraints (such as credit score ceiling and housing status).

### 3. Portfolio Risk Dashboard (`/dashboard`)
Macroeconomic portfolio oversight displaying:
- Total processed loan volume and average portfolio risk.
- Tier distribution breakdown (Approve / Review / Reject).
- Interactive triage data table equipped with multi-attribute filtering, search, and instant file loading.

### 4. Immutable Compliance Audit Ledger (`/audit`)
Maintains a tamper-evident record of all system events:
- Historical record of every applicant scored.
- Tracking of underwriter overrides (e.g., transitioning an application from Review to Approve).
- Downloadable adverse action letters complete with date stamps, applicant summaries, and specific rejection disclosures.

### 5. Fair Lending & Demographic Insights (`/insights`)
Ensures ethical AI compliance across the portfolio:
- **Global Feature Importance**: Identifies the primary macro drivers across all underwriting decisions.
- **Fairness & Parity Telemetry**: Audits demographic segments to confirm absence of disparate impact or discriminatory proxies.

---

## 🔄 How the Underwriting Engine Works

### Step 1: Input Ingestion & Sanitization
The applicant's financial parameters are submitted:
```json
{
  "applicant_name": "Elena Vance",
  "credit_score": 765,
  "annual_inc": 95000,
  "loan_amnt": 22000,
  "int_rate": 6.25,
  "dti": 12.0,
  "term": 36,
  "home_ownership": "MORTGAGE",
  "purpose": "car"
}
```

### Step 2: Calibrated XGBoost & SHAP Inference
The system calculates the baseline population risk:
$$\mathbb{E}[f(X)] = 43.40\%$$

Each feature's Shapley contribution is evaluated:
- FICO 765: $-11.8\%$ (High creditworthiness mitigates risk)
- Annual Income $\$95,000$: $-4.2\%$ (Strong income stability)
- DTI 12.0%: $-3.8\%$ (Low debt burden)
- Mortgage Ownership: $-2.1\%$ (Asset backing)
- Loan Term 36 Months: $-1.9\%$ (Short payback horizon)

$$\text{Final Default Probability} = 43.40\% - 23.8\% = 19.60\%$$

### Step 3: Policy Gate & Actionable Routing
With a default probability of $19.60\%$, the application falls into the **REVIEW** tier:
- If submitted under automated rules, it is routed to a human officer.
- The underwriter can run the **Counterfactual Optimizer** or use the **AI Agent** to restructure the loan into the Prime band ($< 15\%$), or log a justified discretionary override.

---

## 🛠️ Getting Started & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**
- *(Optional)* **Python**: 3.9+ with `requirements.txt` installed if executing the local Python ML server.
- *(Optional)* **Groq API Key**: To unlock 300+ token/sec LPU agent intelligence.

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/loanlens.git
   cd loanlens
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Add your Groq API key (optional for agent acceleration):
   ```env
   PORT=3000
   GROQ_API_KEY=gsk_your_groq_api_key_here
   NODE_ENV=production
   ```

4. **Launch the Application**:
   ```bash
   npm start
   ```
   Navigate to `http://localhost:3000` in your browser.

---

## 🛡️ Regulatory Compliance Statements

- **FCRA § 615(a)**: All adverse credit decisions provide specific, verifiable reasons derived directly from the applicant's top SHAP risk drivers.
- **ECOA Regulation B**: The predictive model strictly excludes protected demographic classes (race, color, religion, national origin, sex, marital status, or age).
- **Model Risk Management (SR 11-7)**: Full model metadata, training distributions, feature configurations, and validation metrics are tracked in `backend/models/model_metadata.json`.

---

## 📄 License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for complete details.
