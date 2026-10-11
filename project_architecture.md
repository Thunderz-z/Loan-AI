# Project Architecture: LoanLens AI Underwriting & Explainability Platform

This document provides a comprehensive, deep-dive architectural specification of **LoanLens**, an autonomous explainable AI (XAI) credit risk underwriting platform. It outlines the system topology, component hierarchies, runtime request lifecycles, data persistence schemas, ML inference pipelines, and agentic tool-calling orchestration.

---

## 1. High-Level Architectural Topology

LoanLens is built as an end-to-end, multi-tier financial intelligence platform. It bridges production machine learning (XGBoost + SHAP TreeExplainer), an asynchronous API layer (Node.js/Express with FastAPI duality), an autonomous agentic LLM layer (Groq LPUs / Qwen 2.5 / Llama 3.3), and a reactive frontend (React, Vite, Tailwind CSS, Recharts).

```
+--------------------------------------------------------------------------------------------------+
|                                         PRESENTATION LAYER                                       |
|  React 18 + Vite SPA | Tailwind CSS | Heroicons | Recharts (Waterfall, Gauge, Bar, Multi-Factor)  |
|                                                                                                  |
|   [/] Agent Studio           [/decision] Decision Analysis        [/dashboard] Portfolio Metric  |
|   [/apply] Direct Underwrite [/audit] Audit History Ledger        [/insights] Bias & SHAP Metrics|
+--------------------------------------------------------------------------------------------------+
                                                |
                                                | HTTP/REST (JSON)
                                                v
+--------------------------------------------------------------------------------------------------+
|                                  API GATEWAY & ENGINE RUNTIME                                    |
|                         server.js (Node.js Express / ESM Gateway @ Port 3000)                    |
|                                                                                                  |
|  * Static Asset Server (Production SPA dist/)        * System Configuration & Feature Weights    |
|  * Autonomous Agent Orchestrator (/api/agent)        * Direct Risk Scoring (/api/predict)        |
|  * SHAP Explainer Endpoint (/api/explain)            * Counterfactual Simulator (/api/what-if)   |
|  * Portfolio Audit Ledger (/api/applications)        * Health & Runtime Telemetry (/api/health)  |
+--------------------------------------------------------------------------------------------------+
        |                                       |                                    |
        | Tool Calls & Multi-Turn Syntheses    | File I/O Synchronization           | Python Bridge (Opt)
        v                                       v                                    v
+-----------------------------+   +-----------------------------+   +-----------------------------+
|    AGENTIC REASONING LPU    |   |     PERSISTENCE STORAGE     |   |      PYTHON ML ENGINE       |
|  Groq API (LPU Inference)   |   |  backend/loanlens.db (SQLite)|   |   FastAPI / Uvicorn (8000)  |
|  * Supported Models:        |   |  backend/audit_store.json   |   |   backend/model.py          |
|    - qwen/qwen3.8-27b       |   |                             |   |   backend/explainer.py      |
|    - openai/gpt-oss-120b    |   |  * Native node:sqlite Engine|   |                             |
|    - llama-3.3-70b-versatile|   |  * Dual SQL/JSON Sync       |   |  * XGBoost Classifier       |
|  * Function Tool Schemas:   |   |  * Complete Audit Trail     |   |  * SHAP TreeExplainer       |
|    - create_loan_application|   |  * Adverse Action Notices   |   |  * What-If Optimizer        |
|    - update_loan_terms      |   |  * Parameterized SQL Queries|   |  * Feature Encoders         |
|    - optimize_counterfactual|   +-----------------------------+   +-----------------------------+
|    - stress_test_portfolio  |
|    - generate_adverse_action|
|    - query_database_record  |
|    - audit_shap_tree_explain|
+-----------------------------+
```

---

## 2. Directory & File Organization

The repository is structured logically to maintain a clear boundary between presentation, orchestration, model assets, and persistence stores:

```
├── .env.example                     # Environment template (PORT, GROQ_API_KEY, NODE_ENV)
├── LICENSE                          # MIT open source license
├── metadata.json                    # Project capabilities and environment descriptors
├── package.json                     # Root orchestrator dependencies and build scripts
├── project_architecture.md          # Comprehensive architectural specification (this file)
├── project_readme.md                # Project executive summary, feature guides, and stack
├── README.md                        # Quickstart instructions
├── server.js                        # Primary runtime server, agent orchestrator, and API layer
├── server.ts                        # TypeScript server companion
│
├── backend/                         # Backend intelligence & persistence
│   ├── audit_store.json             # Live database store of loan applications and decisions
│   ├── explainer.py                 # TreeExplainer SHAP integration logic
│   ├── loanlens.db                  # SQLite database schema for persistent audit entries
│   ├── main.py                      # FastAPI REST application exposing Python ML endpoints
│   ├── model.py                     # XGBoost model training, loading, and inference pipeline
│   ├── requirements.txt             # Python ML environment dependencies
│   └── models/                      # Serialized ML artifacts
│       ├── background_sample.csv    # 500-applicant baseline distribution for SHAP expectations
│       ├── categorical_encoder.pkl  # Sklearn LabelEncoder instances for categorical inputs
│       ├── decision_threshold.pkl   # Optimal decision boundary threshold
│       ├── encoders.pkl             # Secondary feature transformers
│       ├── feature_columns.pkl      # Ordered feature column vector definitions
│       ├── feature_config.json      # Feature constraints, bounds, and normalizers
│       ├── model_metadata.json      # Model performance metrics (AUC-ROC, F1, Recall)
│       └── xgb_model.pkl            # 1.5MB trained binary XGBoost classification model
│
└── frontend/                        # Reactive client interface (Single Page Application)
    ├── index.html                   # HTML entry point with system fonts & viewport configuration
    ├── vite.config.js               # Vite build pipeline and proxy configurations
    └── src/
        ├── App.css                  # Custom styling overrides
        ├── App.jsx                  # Main router, application state, and layout harness
        ├── api.js                   # Unified Axios/Fetch API client communicating with backend
        ├── index.css                # Tailwind CSS v3 direct utility directives
        ├── main.jsx                 # React root DOM hydration point
        ├── components/              # Modular UI components
        │   ├── AiAssistantDrawer.jsx# Slide-out AI underwriting side drawer
        │   ├── Header.jsx           # Global navigation bar with system health telemetry
        │   ├── RiskGauge.jsx        # SVG circular gauge depicting 0-100% default probability
        │   ├── ShapChart.jsx        # Recharts waterfall explaining SHAP local feature attributions
        │   └── WhatIfSimulator.jsx  # Interactive counterfactual slider playground
        └── pages/                   # Application views
            ├── AgentStudio.jsx      # Command-and-control autonomous AI agent studio
            ├── AuditHistory.jsx     # Immutable compliance audit log and ledger viewer
            ├── Dashboard.jsx        # Macro portfolio distribution and triage table
            ├── DecisionAnalysis.jsx # Deep-dive underwriting inspection and explainability view
            ├── Insights.jsx         # Global feature importance and demographic bias analytics
            └── NewApplication.jsx   # Interactive applicant underwriting form
```

---

## 3. Core Engine Components & Data Flow

### 3.1 The Underwriting Decision Lifecycle

When an applicant is evaluated—whether submitted through the New Application form, updated via the What-If Simulator, or dispatched by the Autonomous AI Agent—the request moves through the following pipeline:

```
[User Input / Agent Directive]
             │
             ▼
    [Input Validation]
  * Sanitize numerical ranges (FICO 300-850, DTI 0-100%, Loan $1k-$200k)
  * Verify purpose, home ownership, employment duration
             │
             ▼
   [Inference Engine (server.js / backend/model.py)]
  * Extract baseline population expectation: E[f(x)] = 43.40%
  * Compute feature deviations:
      - Credit Score: FICO 775 -> -12.5% contribution
      - DTI Ratio: 9.5%        -> -4.8% contribution
      - Revolving Util: 16%    -> -3.2% contribution
      - Home Ownership: MORTGAGE -> -2.4% contribution
      - Annual Income: $98,000 -> -4.1% contribution
  * Sum SHAP contributions: Total Risk = Base + sum(SHAP)
             │
             ▼
   [Policy Decision Gate]
  * If Risk < 15.00%  ──► [APPROVE]  (Prime Tier, Automated Approval)
  * If 15.00% - 30.0% ──► [REVIEW]   (Discretionary Human Review)
  * If Risk >= 30.00% ──► [REJECT]   (Adverse Action Notice Generated)
             │
             ▼
   [Persistence & Audit Trail]
  * Push to In-Memory Applications Array
  * Flush asynchronously to `backend/audit_store.json`
  * Generate audit entry with timestamp, actor ("Autonomous AI Agent" or "Human Underwriter")
             │
             ▼
   [Client Dispatch & Visualization]
  * Render SVG Risk Gauge with color band
  * Plot SHAP Waterfall Chart (Helping vs. Hurting factors)
  * Update Portfolio Dashboard metrics in real-time
```

### 3.2 Machine Learning & Explainable AI (XAI) Pipeline

1. **Model Architecture**:
   - The primary risk model is an **XGBoost Classifier** (`xgb_model.pkl`), trained on historical consumer credit performance datasets.
   - It computes the calibrated probability of default: $P(\text{Default} \mid X)$.

2. **SHAP TreeExplainer Formulation**:
   - Rooted in cooperative game theory (Shapley values), SHAP guarantees local accuracy, missingness, and consistency:
     $$\phi_0 + \sum_{i=1}^M \phi_i(x) = f(x)$$
   - Where $\phi_0 = 0.434$ (43.4%) is the expected base value across the entire credit applicant population, and $\phi_i$ is the exact percentage point delta attributed to feature $i$.
   - Red bars indicate risk-increasing factors (e.g., high DTI, recent inquiries, low credit score).
   - Green bars indicate risk-mitigating factors (e.g., long employment, mortgage ownership, high annual income).

3. **Counterfactual Optimization Engine**:
   - Given an application in `REJECT` or `REVIEW`, the counterfactual engine performs constrained optimization on actionable features:
     - Search Space: $\text{Loan Amount} \in [\$1,000, \$100,000]$, $\text{Term} \in \{36, 60\}$, $\text{Interest Rate} \in [4.5\%, 24\%]$, $\text{DTI} \in [5\%, 60\%]$.
     - Objective: $\min \Delta(\text{terms})$ subject to $f(x^*) < \text{Threshold}$.
   - **Quantitative Reality Safeguard**: If an applicant has fixed, non-negotiable negative attributes (e.g., Renter status, FICO 715 ceiling), the engine mathematically honors the lowest feasible risk floor rather than fabricating an unattainable Prime classification.

---

## 4. The Autonomous AI Agent Architecture

The Agent Studio (`/agent-studio` and `server.js:560`) implements an autonomous credit risk intelligence agent equipped with tool-calling capabilities.

```
+-----------------------------------------------------------------------------------------+
|                                    USER QUERY INGESTION                                 |
|  "Create an approved auto loan for Maya: $18,000, 780 FICO, 36 months, low DTI"         |
|  "Audit SHAP tree drivers for Alex Morgan"                                              |
|  "Optimize counterfactual terms to find the risk floor"                                 |
+-----------------------------------------------------------------------------------------+
                                           │
                                           ▼
+-----------------------------------------------------------------------------------------+
|                               SYSTEM PROMPT & TOOL REGISTRY                             |
|  • Injects active context: Selected Applicant, Financials, Decision, SHAP Drivers       |
|  • Tools Registered:                                                                    |
|    1. create_loan_application       - Creates, underwrites & persists new records       |
|    2. update_loan_terms             - Adjusts terms, rates, amounts & overrides         |
|    3. optimize_counterfactual_terms - Finds feasible term adjustments to lower risk     |
|    4. stress_test_portfolio         - Simulates macroeconomic rate/unemployment shocks  |
|    5. generate_adverse_action_notice- Compliance-grade FCRA/ECOA rejection letters      |
|    6. query_database_record         - Performs portfolio aggregation & searches         |
|    7. audit_shap_tree_explainer     - Deep-dives into local feature attributions        |
+-----------------------------------------------------------------------------------------+
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
           [Groq API Connected]                    [Deterministic Agent Fallback]
      Ultra-fast LPU inference (300+ t/s)            Regex & heuristic parser
      Models: Qwen 2.5, Llama 3.3, Mistral           Ensures zero downtime offline
                        │                                     │
                        └──────────────────┬──────────────────┘
                                           ▼
+-----------------------------------------------------------------------------------------+
|                                 TOOL EXECUTION ENGINE                                   |
|  • Executes requested function directly against `applications` ledger & scoring engine  |
|  • Mutates persistence file `backend/audit_store.json` atomically                       |
|  • Formulates tool execution trace with inputs, outputs, and system telemetry           |
+-----------------------------------------------------------------------------------------+
                                           │
                                           ▼
+-----------------------------------------------------------------------------------------+
|                              MULTI-TURN AGENT SYNTHESIS                                 |
|  • Returns tool outputs to the LLM for natural language executive synthesis            |
|  • Formats response with Markdown tables, metrics, bullet points, and next steps        |
|  • Dispatches payload to frontend with execution metrics (LPU speed, latency, tokens)   |
+-----------------------------------------------------------------------------------------+
```

### 4.1 Agent Tool Registry Specification

| Tool Name | Parameters | Purpose & Execution Flow |
|---|---|---|
| `create_loan_application` | `applicant_name`, `loan_amount`, `annual_income`, `credit_score`, `purpose`, `desired_decision` | Instantiates a new application, runs risk scoring, sets SHAP factors, prepends to database, flushes to disk. |
| `update_loan_terms` | `loan_amount`, `interest_rate`, `term`, `dti`, `decision_override` | Modifies existing application attributes, re-evaluates risk score and decision, commits to store. |
| `optimize_counterfactual_terms` | `target_risk_threshold`, `max_loan_reduction_pct` | Computes the minimal viable change in loan terms to reduce default probability, reporting the true mathematical floor. |
| `stress_test_portfolio` | `scenario`, `interest_rate_hike_bps`, `unemployment_shock_pct` | Projects portfolio-wide default rate surges under recessionary or inflationary stress scenarios. |
| `generate_adverse_action_notice`| `applicant_id` | Generates FCRA/ECOA regulatory adverse action documentation citing primary SHAP risk factors. |
| `query_database_record` | `query_type`, `filter_decision`, `search_name` | Searches, aggregates, or lists records across the audit database store. |
| `audit_shap_tree_explainer` | *(implicit active application context)* | Provides a mathematical breakdown of tree split attributions for risk transparency. |

---

## 5. Data Persistence & State Management

### 5.1 Storage Layer: `backend/loanlens.db` (SQLite) & `backend/audit_store.json` (JSON)
All underwriting records, loan parameters, calculated probabilities, and audit histories are persistently stored in a real SQLite relational database (`backend/loanlens.db`) using the native Node.js 22 `node:sqlite` `DatabaseSync` engine and Python `sqlite3`, alongside continuous JSON synchronization (`backend/audit_store.json`).

#### SQLite DDL Schema (`backend/loanlens.db`):
```sql
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  applicant_name TEXT NOT NULL,
  credit_score REAL NOT NULL,
  annual_inc REAL NOT NULL,
  loan_amnt REAL NOT NULL,
  int_rate REAL NOT NULL,
  dti REAL NOT NULL,
  term INTEGER NOT NULL,
  emp_length INTEGER NOT NULL,
  home_ownership TEXT NOT NULL,
  purpose TEXT NOT NULL,
  open_acc INTEGER NOT NULL,
  revol_bal REAL NOT NULL,
  revol_util REAL NOT NULL,
  risk_score REAL NOT NULL,
  decision TEXT NOT NULL,
  risk_category TEXT NOT NULL,
  base_risk REAL NOT NULL,
  shap_json TEXT NOT NULL,
  summary TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Record JSON Structure:
```json
{
  "id": "APP-8324",
  "applicant_name": "Mr. Akshanth",
  "credit_score": 775,
  "annual_inc": 98000,
  "loan_amnt": 24000,
  "int_rate": 5.85,
  "dti": 9.5,
  "term": 36,
  "emp_length": 7,
  "home_ownership": "MORTGAGE",
  "purpose": "car",
  "open_acc": 12,
  "revol_bal": 4200,
  "revol_util": 16.0,
  "risk_score": 13.8,
  "decision": "APPROVE",
  "risk_category": "Prime Tier (Automated Approval)",
  "base_risk": 43.4,
  "shap_factors": [
    { "feature": "credit_score", "label": "Credit Score (FICO)", "value": 775, "contribution": -0.125 },
    { "feature": "dti", "label": "Debt-to-Income (DTI)", "value": "9.5%", "contribution": -0.048 },
    { "feature": "revol_util", "label": "Revolving Utilization", "value": "16.0%", "contribution": -0.032 },
    { "feature": "home_ownership", "label": "Home Ownership", "value": "MORTGAGE", "contribution": -0.024 },
    { "feature": "annual_inc", "label": "Annual Income", "value": "$98,000", "contribution": -0.041 }
  ],
  "summary": "Application demonstrates prime-tier credit profile with negligible default risk.",
  "created_at": "2026-10-09 08:30:00"
}
```

### 5.2 Atomic File & Relational Database Synchronization
To ensure strict ACID durability and cross-service interoperability:
- On boot, `server.js` initializes `backend/loanlens.db` via `node:sqlite`. If existing records are found in SQLite, they are loaded directly into memory; if empty, it seeds the SQL table with benchmark applications.
- Any creation or modification via the Autonomous AI Agent (`executeCreateLoan`, `executeUpdateLoan`) or the REST API (`POST /predict`, `PUT /applications/:id`) executes parameterized SQL queries (`INSERT OR REPLACE INTO applications (...)`) directly against `loanlens.db`.
- The system simultaneously writes to `backend/audit_store.json` using synchronous file I/O (`fs.writeFileSync`), guaranteeing that both the relational database and the portable JSON audit trail remain 100% synchronized.

---

## 6. Frontend Architectural System

The client is built using modern React 18 functional components and hooks:

```
[App.jsx]
  ├── [Header.jsx]
  │     ├── Navigation Links (Agent Studio, Dashboard, Apply, Decisions, Audit, Insights)
  │     ├── System Health Ping Indicator (Real ML vs. Express Engine)
  │     └── Copilot Quick-Launch Button
  │
  ├── [AgentStudio.jsx]
  │     ├── Left Panel: Active File Context Card & Quick Action Directives
  │     ├── Center Panel: Terminal-Style Chat Stream & Tool Execution Inspector
  │     ├── Interactive Console Input & Groq LPU Model Picker
  │     └── Diagnostic Metrics & Token Telemetry Bar
  │
  ├── [DecisionAnalysis.jsx]
  │     ├── Applicant Dossier & Key Financial Metrics
  │     ├── [RiskGauge.jsx] SVG Circular Gauge
  │     ├── [ShapChart.jsx] Recharts Horizontal Waterfall
  │     ├── Policy Rule Exceptions Card
  │     └── [WhatIfSimulator.jsx] Dynamic Slider Playground
  │
  ├── [Dashboard.jsx]
  │     ├── Key Performance Indicators (Total Volume, Approval Rate, Average Risk)
  │     ├── Portfolio Distribution Charts
  │     └── Application Triage Data Table (Search, Filter, Inspect)
  │
  ├── [AuditHistory.jsx]
  │     ├── Immutable Compliance Event Stream
  │     ├── Adverse Action Exporter
  │     └── Underwriting Override Verification Modal
  │
  └── [Insights.jsx]
        ├── Global Feature Importance (Mean Absolute SHAP)
        └── Fairness, Demographic Parity & Disparate Impact Metrics
```

---

## 7. Security, Compliance & Governance

1. **Fair Lending & Anti-Bias (ECOA / Reg B)**:
   - Protected demographic classes (race, gender, religion, marital status) are excluded from the model input vector.
   - Proxy variables are audited through correlation matrices and demographic parity testing in the Insights dashboard.

2. **Explainability Mandate (FCRA Compliance)**:
   - Every adverse decision (`REJECT`) generates verifiable, mathematical key adverse factors directly extracted from the top positive SHAP attributions.
   - Black-box opacity is eliminated through complete feature waterfall breakdowns.

3. **Deterministic Fail-Safe**:
   - If external LLM API endpoints experience rate limits or network degradation, the agent seamlessly transitions to local deterministic execution handlers, ensuring zero operational downtime for underwriting teams.
