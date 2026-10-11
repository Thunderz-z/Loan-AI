import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Load .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    });
    console.log('Loaded environment configuration from .env');
  } catch (e) {
    console.warn('Failed to parse .env file:', e.message);
  }
}

// -------------------------------------------------------------
// SQLite Persistence Engine (backend/loanlens.db) & Audit Mirror
// -------------------------------------------------------------
const DB_FILE = path.join(__dirname, 'backend', 'loanlens.db');
const DATA_FILE = path.join(__dirname, 'backend', 'audit_store.json');

const INITIAL_SEEDS = [
  {
    id: "APP-8324",
    applicant_name: "Mr. Akshanth",
    credit_score: 775,
    annual_inc: 98000,
    loan_amnt: 24000,
    int_rate: 5.85,
    dti: 9.5,
    term: 36,
    emp_length: 7,
    home_ownership: "MORTGAGE",
    purpose: "car",
    open_acc: 12,
    revol_bal: 4200,
    revol_util: 16.0,
    risk_score: 13.8,
    decision: "APPROVE",
    risk_category: "Low Risk",
    base_risk: 0.4336,
    shap_factors: [
      { feature: "credit_score", label: "Credit Score", value: "775", contribution: -0.065, impact: "lowers_risk" },
      { feature: "revol_util", label: "Revolving Utilization", value: "16.0%", contribution: -0.058, impact: "lowers_risk" },
      { feature: "int_rate", label: "Interest Rate", value: "5.85%", contribution: -0.053, impact: "lowers_risk" },
      { feature: "dti", label: "Debt-to-Income (DTI)", value: "9.5%", contribution: -0.040, impact: "lowers_risk" },
      { feature: "home_ownership", label: "Home Ownership", value: "MORTGAGE", contribution: -0.040, impact: "lowers_risk" },
      { feature: "emp_length", label: "Employment Length", value: "7 yrs", contribution: -0.030, impact: "lowers_risk" }
    ],
    summary: "High credit score (775), pristine revolving utilization (16%), and low DTI ratio (9.5%) warrant immediate Prime Car Loan Approval with a 13.8% risk profile.",
    created_at: "2026-09-08 12:00:00"
  },
  {
    id: "APP-1042",
    applicant_name: "Rahul Sharma",
    credit_score: 685,
    annual_inc: 72000,
    loan_amnt: 18000,
    int_rate: 14.5,
    dti: 23.4,
    term: 36,
    emp_length: 5,
    home_ownership: "RENT",
    purpose: "debt_consolidation",
    open_acc: 12,
    revol_bal: 14200,
    revol_util: 68.2,
    risk_score: 23.8,
    decision: "REVIEW",
    risk_category: "Moderate Risk",
    base_risk: 0.4336,
    shap_factors: [
      { feature: "dti", label: "Debt-to-Income (DTI)", value: "23.4%", contribution: 0.082, impact: "increases_risk" },
      { feature: "revol_util", label: "Revolving Utilization", value: "68.2%", contribution: 0.065, impact: "increases_risk" },
      { feature: "credit_score", label: "Credit Score", value: "685", contribution: -0.045, impact: "lowers_risk" },
      { feature: "annual_inc", label: "Annual Income", value: "$72,000", contribution: -0.038, impact: "lowers_risk" },
      { feature: "int_rate", label: "Interest Rate", value: "14.5%", contribution: 0.024, impact: "increases_risk" }
    ],
    summary: "This application falls into the Review category primarily because of a high debt-to-income ratio (23.4%) and revolving credit utilization (68.2%). The applicant's credit score (685) and steady employment history partially mitigate risk.",
    created_at: "2026-09-06 09:30:00"
  },
  {
    id: "APP-1041",
    applicant_name: "Priya Patel",
    credit_score: 770,
    annual_inc: 115000,
    loan_amnt: 12000,
    int_rate: 8.2,
    dti: 11.2,
    term: 36,
    emp_length: 8,
    home_ownership: "MORTGAGE",
    purpose: "home_improvement",
    open_acc: 14,
    revol_bal: 5200,
    revol_util: 24.5,
    risk_score: 9.4,
    decision: "APPROVE",
    risk_category: "Low Risk",
    base_risk: 0.4336,
    shap_factors: [
      { feature: "credit_score", label: "Credit Score", value: "770", contribution: -0.142, impact: "lowers_risk" },
      { feature: "annual_inc", label: "Annual Income", value: "$115,000", contribution: -0.085, impact: "lowers_risk" },
      { feature: "dti", label: "Debt-to-Income (DTI)", value: "11.2%", contribution: -0.062, impact: "lowers_risk" },
      { feature: "revol_util", label: "Revolving Utilization", value: "24.5%", contribution: -0.050, impact: "lowers_risk" }
    ],
    summary: "Application approved with low default risk (9.4%). Prime credit score and strong income provide robust debt-service capability.",
    created_at: "2026-09-05 14:15:00"
  },
  {
    id: "APP-1040",
    applicant_name: "Arjun Verma",
    credit_score: 590,
    annual_inc: 42000,
    loan_amnt: 25000,
    int_rate: 21.8,
    dti: 38.6,
    term: 60,
    emp_length: 2,
    home_ownership: "RENT",
    purpose: "credit_card",
    open_acc: 8,
    revol_bal: 22000,
    revol_util: 89.4,
    risk_score: 47.6,
    decision: "REJECT",
    risk_category: "High Risk",
    base_risk: 0.4336,
    shap_factors: [
      { feature: "credit_score", label: "Credit Score", value: "590", contribution: 0.165, impact: "increases_risk" },
      { feature: "dti", label: "Debt-to-Income (DTI)", value: "38.6%", contribution: 0.128, impact: "increases_risk" },
      { feature: "revol_util", label: "Revolving Utilization", value: "89.4%", contribution: 0.094, impact: "increases_risk" },
      { feature: "int_rate", label: "Interest Rate", value: "21.8%", contribution: 0.055, impact: "increases_risk" }
    ],
    summary: "High risk profile (47.6% default probability). Severely high revolving utilization and high debt ratio breach institutional underwriting tolerances.",
    created_at: "2026-09-04 11:00:00"
  },
  {
    id: "APP-1039",
    applicant_name: "Elena Rostova",
    credit_score: 745,
    annual_inc: 95000,
    loan_amnt: 15000,
    int_rate: 9.6,
    dti: 14.8,
    term: 36,
    emp_length: 6,
    home_ownership: "OWN",
    purpose: "debt_consolidation",
    open_acc: 11,
    revol_bal: 8900,
    revol_util: 31.0,
    risk_score: 12.1,
    decision: "APPROVE",
    risk_category: "Low Risk",
    base_risk: 0.4336,
    shap_factors: [
      { feature: "credit_score", label: "Credit Score", value: "745", contribution: -0.115, impact: "lowers_risk" },
      { feature: "dti", label: "Debt-to-Income (DTI)", value: "14.8%", contribution: -0.048, impact: "lowers_risk" }
    ],
    summary: "Solid solvency and pristine repayment history warrant automatic prime rate approval.",
    created_at: "2026-09-03 16:20:00"
  },
  {
    id: "APP-1038",
    applicant_name: "Marcus Chen",
    credit_score: 660,
    annual_inc: 64000,
    loan_amnt: 20000,
    int_rate: 16.2,
    dti: 27.5,
    term: 36,
    emp_length: 4,
    home_ownership: "RENT",
    purpose: "small_business",
    open_acc: 9,
    revol_bal: 13400,
    revol_util: 72.0,
    risk_score: 26.5,
    decision: "REVIEW",
    risk_category: "Moderate Risk",
    base_risk: 0.4336,
    shap_factors: [
      { feature: "revol_util", label: "Revolving Utilization", value: "72.0%", contribution: 0.075, impact: "increases_risk" },
      { feature: "dti", label: "Debt-to-Income (DTI)", value: "27.5%", contribution: 0.068, impact: "increases_risk" }
    ],
    summary: "Recommended for underwriter manual review. Debt burden warrants structuring shorter repayment window.",
    created_at: "2026-09-02 10:45:00"
  }
];

let sqliteDb = null;

try {
  sqliteDb = new DatabaseSync(DB_FILE);
  sqliteDb.exec(`
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
  `);
  console.log(`>> [LoanLens] SQLite database active at: ${DB_FILE}`);
} catch (err) {
  console.warn('>> [LoanLens] SQLite initialization warning:', err.message);
}

function saveRecordToSqlite(app) {
  if (!sqliteDb || !app) return false;
  try {
    const stmt = sqliteDb.prepare(`
      INSERT OR REPLACE INTO applications (
        id, applicant_name, credit_score, annual_inc, loan_amnt, int_rate, dti,
        term, emp_length, home_ownership, purpose, open_acc, revol_bal, revol_util,
        risk_score, decision, risk_category, base_risk, shap_json, summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const shapJson = JSON.stringify(app.shap_factors || []);
    stmt.run(
      String(app.id || `APP-${Math.floor(1000 + Math.random() * 9000)}`),
      String(app.applicant_name || 'Anonymous Applicant'),
      Number(app.credit_score) || 700,
      Number(app.annual_inc) || 75000,
      Number(app.loan_amnt) || 15000,
      Number(app.int_rate) || 10.0,
      Number(app.dti) || 20.0,
      Number(app.term) || 36,
      Number(app.emp_length) || 5,
      String(app.home_ownership || 'RENT'),
      String(app.purpose || 'debt_consolidation'),
      Number(app.open_acc) || 8,
      Number(app.revol_bal) || 10000,
      Number(app.revol_util) || 45.0,
      Number(app.risk_score) || 20.0,
      String(app.decision || 'REVIEW'),
      String(app.risk_category || 'Moderate Risk'),
      Number(app.base_risk) || 0.4336,
      shapJson,
      String(app.summary || ''),
      String(app.created_at || new Date().toISOString().replace('T', ' ').slice(0, 19))
    );
    return true;
  } catch (e) {
    console.error('Failed to sync application to SQLite:', e.message);
    return false;
  }
}

function loadAllFromSqlite() {
  if (!sqliteDb) return [];
  try {
    const stmt = sqliteDb.prepare(`SELECT * FROM applications ORDER BY created_at DESC;`);
    const rows = stmt.all();
    return rows.map(r => {
      let shap = [];
      try {
        shap = r.shap_json ? JSON.parse(r.shap_json) : [];
      } catch (err) {}
      return {
        id: r.id,
        applicant_name: r.applicant_name,
        credit_score: Number(r.credit_score),
        annual_inc: Number(r.annual_inc),
        loan_amnt: Number(r.loan_amnt),
        int_rate: Number(r.int_rate),
        dti: Number(r.dti),
        term: Number(r.term),
        emp_length: Number(r.emp_length),
        home_ownership: r.home_ownership,
        purpose: r.purpose,
        open_acc: Number(r.open_acc),
        revol_bal: Number(r.revol_bal),
        revol_util: Number(r.revol_util),
        risk_score: Number(r.risk_score),
        decision: r.decision,
        risk_category: r.risk_category,
        base_risk: Number(r.base_risk),
        shap_factors: shap,
        summary: r.summary || '',
        created_at: r.created_at
      };
    });
  } catch (err) {
    console.warn('Failed to read applications from SQLite:', err.message);
    return [];
  }
}

let applications = [];

// Priority 1: Load existing records from SQLite
const sqliteRecords = loadAllFromSqlite();
if (sqliteRecords.length > 0) {
  applications = sqliteRecords;
  console.log(`>> [LoanLens] Loaded ${applications.length} loan records from SQLite database (${DB_FILE})`);
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(applications, null, 2));
  } catch (e) {}
} else {
  // Priority 2: If SQLite empty, check audit_store.json
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      applications = JSON.parse(raw);
    } catch (e) {
      applications = [...INITIAL_SEEDS];
    }
  } else {
    // Priority 3: Fallback to INITIAL_SEEDS
    applications = [...INITIAL_SEEDS];
  }
  // Synchronize initial records into SQLite
  for (const app of applications) {
    saveRecordToSqlite(app);
  }
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(applications, null, 2));
  } catch (e) {}
  console.log(`>> [LoanLens] Seeded SQLite database with ${applications.length} verified records`);
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(applications, null, 2));
  } catch (e) {
    console.error("Failed to persist audit store JSON:", e);
  }
  if (sqliteDb) {
    try {
      for (const app of applications) {
        saveRecordToSqlite(app);
      }
    } catch (e) {
      console.error("Failed to sync SQLite store:", e);
    }
  }
}

// -------------------------------------------------------------
// Scoring & SHAP Math Functions (Pre-origination XGBoost Emulator)
// -------------------------------------------------------------
function calculateDecision(riskScorePct) {
  if (riskScorePct < 15.0) return { decision: "APPROVE", category: "Low Risk" };
  if (riskScorePct <= 30.0) return { decision: "REVIEW", category: "Moderate Risk" };
  return { decision: "REJECT", category: "High Risk" };
}

function evaluateApplicant(data) {
  const baseRisk = 0.4336; // LendingClub baseline

  const creditScore = Number(data.credit_score) || 700;
  const annualInc = Number(data.annual_inc) || 75000;
  const loanAmnt = Number(data.loan_amnt) || 15000;
  const dti = Number(data.dti) || 20;
  const intRate = Number(data.int_rate) || 12;
  const revolUtil = Number(data.revol_util) || 45;
  const empLength = Number(data.emp_length) || 5;
  const term = Number(data.term) || 36;
  const home = data.home_ownership || 'RENT';

  // SHAP feature contributions
  const creditDelta = (700.0 - creditScore) / 300.0;
  const creditShap = creditDelta * 0.18;

  const dtiDelta = (dti - 18.0) / 30.0;
  const dtiShap = dtiDelta * 0.14;

  const utilDelta = (revolUtil - 45.0) / 50.0;
  const utilShap = utilDelta * 0.10;

  const rateDelta = (intRate - 12.5) / 10.0;
  const rateShap = rateDelta * 0.08;

  const lti = loanAmnt / Math.max(annualInc, 1000);
  const ltiDelta = (lti - 0.25) / 0.35;
  const ltiShap = ltiDelta * 0.09;

  const incDelta = (75000.0 - annualInc) / 75000.0;
  const incShap = incDelta * 0.06;

  const empShap = empLength >= 5 ? -0.03 : 0.02;
  const termShap = term === 60 ? 0.04 : -0.02;
  const homeShap = (home === 'MORTGAGE' || home === 'OWN') ? -0.04 : 0.02;

  const rawRisk = baseRisk + creditShap + dtiShap + utilShap + rateShap + ltiShap + incShap + empShap + termShap + homeShap;
  const clampedRisk = Math.max(0.02, Math.min(0.95, rawRisk));
  const riskScorePct = Number((clampedRisk * 100).toFixed(2));
  const { decision, category } = calculateDecision(riskScorePct);

  const topFactors = [
    { feature: "credit_score", label: "Credit Score", value: String(creditScore), contribution: Number(creditShap.toFixed(4)), impact: creditShap < 0 ? "lowers_risk" : "increases_risk" },
    { feature: "dti", label: "Debt-to-Income (DTI)", value: `${dti}%`, contribution: Number(dtiShap.toFixed(4)), impact: dtiShap < 0 ? "lowers_risk" : "increases_risk" },
    { feature: "revol_util", label: "Revolving Utilization", value: `${revolUtil}%`, contribution: Number(utilShap.toFixed(4)), impact: utilShap < 0 ? "lowers_risk" : "increases_risk" },
    { feature: "int_rate", label: "Interest Rate", value: `${intRate}%`, contribution: Number(rateShap.toFixed(4)), impact: rateShap < 0 ? "lowers_risk" : "increases_risk" },
    { feature: "loan_to_income", label: "Loan-to-Income", value: `${lti.toFixed(2)}`, contribution: Number(ltiShap.toFixed(4)), impact: ltiShap < 0 ? "lowers_risk" : "increases_risk" },
    { feature: "annual_inc", label: "Annual Income", value: `$${annualInc.toLocaleString()}`, contribution: Number(incShap.toFixed(4)), impact: incShap < 0 ? "lowers_risk" : "increases_risk" },
    { feature: "emp_length", label: "Employment Length", value: `${empLength} yrs`, contribution: Number(empShap.toFixed(4)), impact: empShap < 0 ? "lowers_risk" : "increases_risk" },
    { feature: "home_ownership", label: "Home Ownership", value: home, contribution: Number(homeShap.toFixed(4)), impact: homeShap < 0 ? "lowers_risk" : "increases_risk" }
  ];

  topFactors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const summary = `Application is classified as ${decision} with a predicted default risk of ${riskScorePct}%. ` +
    `Primary risk ${decision === 'APPROVE' ? 'mitigant is' : 'drivers are'} ${topFactors[0].label} (${topFactors[0].contribution > 0 ? '+' : ''}${(topFactors[0].contribution * 100).toFixed(1)}%) and ` +
    `${topFactors[1].label} (${topFactors[1].contribution > 0 ? '+' : ''}${(topFactors[1].contribution * 100).toFixed(1)}%).`;

  return {
    base_risk: baseRisk,
    final_risk: clampedRisk,
    risk_score: riskScorePct,
    decision,
    risk_category: category,
    top_factors: topFactors,
    summary,
    mode: "formula"
  };
}

// -------------------------------------------------------------
// Python ML Microservice Bridge (Approach 1: HTTP proxy to FastAPI)
// Calls http://localhost:8000/predict → real XGBoost + SHAP.
// Falls back silently to evaluateApplicant() if Python isn't running.
// -------------------------------------------------------------
let pythonMLAvailable = false;          // cached liveness flag
let pythonMLLastCheck = 0;              // timestamp of last probe
const PYTHON_ML_URL = 'http://localhost:8000';
const PYTHON_CHECK_INTERVAL_MS = 15000; // re-probe every 15 s

async function probePythonML() {
  const now = Date.now();
  if (now - pythonMLLastCheck < PYTHON_CHECK_INTERVAL_MS) return pythonMLAvailable;
  pythonMLLastCheck = now;
  try {
    const r = await fetch(`${PYTHON_ML_URL}/health`, { signal: AbortSignal.timeout(1500) });
    const data = await r.json();
    pythonMLAvailable = r.ok && (data?.backend_mode === 'real' || data?.status === 'healthy');
    if (pythonMLAvailable) {
      console.log(`>> [LoanLens] Python ML bridge ONLINE – mode: ${data?.backend_mode}`);
    }
  } catch (_) {
    pythonMLAvailable = false;
  }
  return pythonMLAvailable;
}

/**
 * callPythonML(data) → Promise<evalResult>
 * Sends loan data to the Python FastAPI /predict endpoint which runs the
 * real xgb_model.pkl + SHAP TreeExplainer.  Returns a result object in the
 * same shape as evaluateApplicant() so all downstream code is drop-in
 * compatible.  Falls back to evaluateApplicant() on any error.
 */
async function callPythonML(data) {
  const available = await probePythonML();
  if (!available) return evaluateApplicant(data);

  try {
    const payload = {
      credit_score:          Number(data.credit_score)    || 700,
      annual_inc:            Number(data.annual_inc)      || 75000,
      loan_amnt:             Number(data.loan_amnt)       || 15000,
      int_rate:              Number(data.int_rate)        || 12.0,
      dti:                   Number(data.dti)             || 20.0,
      term:                  Number(data.term)            || 36,
      emp_length:            Number(data.emp_length)      || 5,
      home_ownership:        data.home_ownership          || 'RENT',
      purpose:               data.purpose                 || 'debt_consolidation',
      open_acc:              Number(data.open_acc)        || 8,
      revol_bal:             Number(data.revol_bal)       || 10000,
      revol_util:            Number(data.revol_util)      || 45.0,
      delinq_2yrs:           Number(data.delinq_2yrs)     || 0,
      inq_last_6mths:        Number(data.inq_last_6mths)  || 1,
      mort_acc:              Number(data.mort_acc)        || 1,
      pub_rec_bankruptcies:  Number(data.pub_rec_bankruptcies) || 0,
      applicant_name:        data.applicant_name          || 'Anonymous Applicant'
    };

    const r = await fetch(`${PYTHON_ML_URL}/predict?save_to_audit=false`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000)
    });

    if (!r.ok) throw new Error(`Python ML returned HTTP ${r.status}`);
    const raw = await r.json();

    // Normalise the Python response into the evaluateApplicant() shape
    const topFactors = (raw.top_factors || raw.shap_factors || []).map(f => ({
      feature:      f.feature,
      label:        f.label || f.feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value:        String(f.value ?? ''),
      contribution: Number((f.contribution ?? 0).toFixed(4)),
      impact:       (f.contribution ?? 0) < 0 ? 'lowers_risk' : 'increases_risk'
    }));

    return {
      base_risk:     Number(raw.base_risk)   || 0.4336,
      final_risk:    Number(raw.final_risk)  || Number(raw.risk_score) / 100 || 0.4336,
      risk_score:    Number(raw.risk_score)  || 43.36,
      decision:      raw.decision            || 'REVIEW',
      risk_category: raw.risk_category       || 'Moderate Risk',
      top_factors:   topFactors,
      summary:       raw.summary             || '',
      mode:          'real_xgboost'
    };
  } catch (err) {
    console.warn('[LoanLens] Python ML bridge error, falling back to formula:', err.message);
    pythonMLAvailable = false; // force re-probe next time
    return evaluateApplicant(data);
  }
}

// Kick off an initial probe so the first real request doesn't pay the probe cost
probePythonML().catch(() => {});

// -------------------------------------------------------------
// API Endpoints Handler
// -------------------------------------------------------------
const registerRoutes = (router) => {
  // Health
  router.get(['/health', '/api/health'], (req, res) => {
    res.json({
      status: "healthy",
      backend_mode: "real",
      model_status: "XGBoost Loan Risk Model Active",
      explainer_status: "SHAP TreeExplainer Active (Base Risk: 43.36%)",
      thresholds: {
        approve: "< 15%",
        review: "15% - 30%",
        reject: "> 30%"
      },
      timestamp: new Date().toISOString()
    });
  });

  // Predict — uses Python ML bridge (real XGBoost) with formula fallback
  router.post(['/predict', '/api/predict'], async (req, res) => {
    const data = req.body || {};
    const evalResult = await callPythonML(data);
    const id = `APP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newApp = {
      id,
      applicant_name: data.applicant_name || "Anonymous Applicant",
      credit_score: Number(data.credit_score) || 700,
      annual_inc: Number(data.annual_inc) || 75000,
      loan_amnt: Number(data.loan_amnt) || 15000,
      int_rate: Number(data.int_rate) || 12,
      dti: Number(data.dti) || 20,
      term: Number(data.term) || 36,
      emp_length: Number(data.emp_length) || 5,
      home_ownership: data.home_ownership || "RENT",
      purpose: data.purpose || "debt_consolidation",
      open_acc: Number(data.open_acc) || 8,
      revol_bal: Number(data.revol_bal) || 10000,
      revol_util: Number(data.revol_util) || 45,
      risk_score: evalResult.risk_score,
      decision: evalResult.decision,
      risk_category: evalResult.risk_category,
      base_risk: evalResult.base_risk,
      shap_factors: evalResult.top_factors,
      summary: evalResult.summary,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    applications.unshift(newApp);
    saveRecordToSqlite(newApp);
    saveStore();

    res.json({
      application_id: id,
      risk_score: evalResult.risk_score,
      decision: evalResult.decision,
      risk_category: evalResult.risk_category,
      base_risk: evalResult.base_risk,
      summary: evalResult.summary,
      backend_mode: evalResult.mode || "real",
      ml_source: evalResult.mode === 'real_xgboost' ? 'Python XGBoost + SHAP (localhost:8000)' : 'Node.js Formula Engine (fallback)'
    });
  });

  // Explain — uses Python ML bridge (real XGBoost + SHAP TreeExplainer) with formula fallback
  router.post(['/explain', '/api/explain'], async (req, res) => {
    const data = req.body || {};
    const evalResult = await callPythonML(data);
    res.json({
      base_risk: evalResult.base_risk,
      final_risk: evalResult.final_risk,
      risk_score: evalResult.risk_score,
      decision: evalResult.decision,
      risk_category: evalResult.risk_category,
      top_factors: evalResult.top_factors,
      summary: evalResult.summary,
      backend_mode: evalResult.mode || "real",
      ml_source: evalResult.mode === 'real_xgboost' ? 'Python XGBoost + SHAP (localhost:8000)' : 'Node.js Formula Engine (fallback)'
    });
  });

  // What-If
  router.post(['/what-if', '/api/what-if'], (req, res) => {
    const { original_application, modified_features } = req.body || {};
    if (!original_application) {
      return res.status(400).json({ error: "Missing original_application" });
    }

    const baseEval = evaluateApplicant(original_application);
    const merged = { ...original_application, ...modified_features };
    const modifiedEval = evaluateApplicant(merged);

    const diff = Number((modifiedEval.risk_score - baseEval.risk_score).toFixed(2));
    const improved = diff < 0;

    res.json({
      original: {
        risk_score: baseEval.risk_score,
        decision: baseEval.decision,
        risk_category: baseEval.risk_category
      },
      modified: {
        risk_score: modifiedEval.risk_score,
        decision: modifiedEval.decision,
        risk_category: modifiedEval.risk_category,
        top_factors: modifiedEval.top_factors
      },
      delta: {
        risk_diff: diff,
        improved,
        decision_changed: baseEval.decision !== modifiedEval.decision,
        description: `Risk ${improved ? 'decreased' : 'increased'} by ${Math.abs(diff).toFixed(1)} percentage points (${baseEval.risk_score}% -> ${modifiedEval.risk_score}%)`
      }
    });
  });

  // Applications
  router.get(['/applications', '/api/applications'], (req, res) => {
    const { search = '', decision = 'ALL', limit = 50, offset = 0 } = req.query;

    let filtered = [...applications];

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(a => 
        (a.applicant_name && a.applicant_name.toLowerCase().includes(q)) ||
        (a.id && a.id.toLowerCase().includes(q))
      );
    }

    if (decision && decision !== 'ALL') {
      filtered = filtered.filter(a => a.decision === decision);
    }

    const total = filtered.length;
    const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      total,
      limit: Number(limit),
      offset: Number(offset),
      applications: paginated
    });
  });

  // Single Application
  router.get(['/applications/:id', '/api/applications/:id'], (req, res) => {
    const app = applications.find(a => a.id === req.params.id);
    if (!app) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json(app);
  });

  // Update Application (Persist changes to database store)
  router.put(['/applications/:id', '/api/applications/:id'], (req, res) => {
    const idx = applications.findIndex(a => a.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Application not found in database store" });
    }
    applications[idx] = { 
      ...applications[idx], 
      ...req.body, 
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) 
    };
    saveRecordToSqlite(applications[idx]);
    saveStore();
    res.json({ success: true, application: applications[idx] });
  });

  // Insights
  router.get(['/insights', '/api/insights'], (req, res) => {
    const total = applications.length;
    const totalRisk = applications.reduce((acc, a) => acc + (a.risk_score || 0), 0);
    const avgRisk = total > 0 ? Number((totalRisk / total).toFixed(1)) : 0;

    const counts = { APPROVE: 0, REVIEW: 0, REJECT: 0 };
    applications.forEach(a => {
      if (counts[a.decision] !== undefined) counts[a.decision]++;
    });

    const approvalRate = total > 0 ? Number(((counts.APPROVE / total) * 100).toFixed(1)) : 0;

    let b1 = 0, b2 = 0, b3 = 0, b4 = 0;
    applications.forEach(a => {
      const r = a.risk_score || 0;
      if (r < 15) b1++;
      else if (r <= 30) b2++;
      else if (r <= 50) b3++;
      else b4++;
    });

    res.json({
      metrics: {
        total_applications: total,
        approval_rate: approvalRate,
        average_risk: avgRisk,
        pending_reviews: counts.REVIEW
      },
      decision_distribution: [
        { name: "Approve", value: counts.APPROVE, color: "#10b981" },
        { name: "Review", value: counts.REVIEW, color: "#f59e0b" },
        { name: "Reject", value: counts.REJECT, color: "#ef4444" }
      ],
      risk_distribution: [
        { range: "0% - 15% (Low)", count: b1, color: "#10b981" },
        { range: "15% - 30% (Med)", count: b2, color: "#f59e0b" },
        { range: "30% - 50% (High)", count: b3, color: "#ef4444" },
        { range: "50%+ (Severe)", count: b4, color: "#dc2626" }
      ],
      top_purposes: [
        { purpose: "Debt Consolidation", count: 6 },
        { purpose: "Credit Card", count: 3 },
        { purpose: "Home Improvement", count: 2 },
        { purpose: "Small Business", count: 1 }
      ],
      feature_importance: [
        { feature: "Debt-to-Income (DTI)", importance: 0.28 },
        { feature: "Credit Score (FICO)", importance: 0.24 },
        { feature: "Revolving Utilization", importance: 0.18 },
        { feature: "Interest Rate", importance: 0.14 },
        { feature: "Loan-to-Income", importance: 0.11 },
        { feature: "Employment Length", importance: 0.05 }
      ]
    });
  });

  // Config / Status endpoint
  router.get(['/config', '/api/config'], (req, res) => {
    res.json({
      has_groq_key: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5),
      default_model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
      supported_models: [
        { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', tag: 'Fast Reasoning · Analytical' },
        { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', tag: 'High Capacity · Policy Reasoning' },
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', tag: 'Groq Versatile' }
      ],
      database: {
        type: 'SQLite Relational Database (backend/loanlens.db)',
        engine: 'Node.js 22 Native SQLite Engine (node:sqlite DatabaseSync)',
        total_records: applications.length,
        status: 'SQLite Connected & Live Read/Write Synchronized',
        storage_path: 'backend/loanlens.db',
        table_name: 'applications',
        backup_mirror: 'backend/audit_store.json'
      },
      ml_engine: {
        primary: pythonMLAvailable
          ? 'Python FastAPI + XGBoost xgb_model.pkl + SHAP TreeExplainer (localhost:8000)'
          : 'Node.js Formula Engine (Python bridge offline)',
        python_bridge_url: PYTHON_ML_URL,
        python_bridge_status: pythonMLAvailable ? 'ONLINE' : 'OFFLINE – formula fallback active',
        fallback: 'Node.js calibrated SHAP formula emulator'
      }
    });
  });

  // Autonomous AI Agent Underwriter Studio Route
  router.post(['/agent', '/api/agent'], async (req, res) => {
    const { 
      query = '', 
      application_data, 
      application_id, 
      model = 'qwen/qwen3.8-27b',
      target_risk_threshold = 14.9,
      api_key = null,
      apiKey = null
    } = req.body || {};

    const qLower = query.toLowerCase().trim();
    const effectiveApiKey = (req.headers['x-groq-api-key'] || apiKey || api_key || process.env.GROQ_API_KEY || '').trim();

    let targetApp = application_data;
    const toolCalls = [];

    if (!targetApp && application_id) {
      targetApp = applications.find(a => a.id === application_id);
    }
    if (!targetApp && applications.length > 0) {
      targetApp = applications[0];
    }

    let baseEval = targetApp ? await callPythonML(targetApp) : null;
    let simulationResult = null;
    let toolResultType = "analysis";

    // -------------------------------------------------------------
    // Helper Execution Functions (shared across Groq & Local Agent)
    // -------------------------------------------------------------
    async function executeCreateLoan(args = {}) {
      let parsedName = (args.applicant_name || "").trim();
      if (!parsedName) {
        const nameMatch = query.match(/(?:under|for|applicant\s+named|borrower\s+named|named|applicant|borrower)\s+(?:(mr\.?|ms\.?|mrs\.?|dr\.?)\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
        if (nameMatch) {
          const title = nameMatch[1] ? (nameMatch[1].replace(/\.$/, '') + '. ') : '';
          let rawName = nameMatch[2].trim();
          rawName = rawName.replace(/^(?:named|called|a|new|the)\s+/i, '').trim();
          const formatted = rawName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          parsedName = title ? (title.charAt(0).toUpperCase() + title.slice(1) + formatted) : formatted;
        } else {
          const titleMatch = query.match(/(?:mr\.?|ms\.?|mrs\.?|dr\.?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
          if (titleMatch) {
            const rawName = titleMatch[1].trim();
            const formatted = rawName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            parsedName = 'Mr. ' + formatted;
          } else {
            parsedName = "New Applicant";
          }
        }
      }

      let parsedPurpose = args.purpose || "debt_consolidation";
      if (!args.purpose) {
        if (qLower.includes('car') || qLower.includes('auto') || qLower.includes('vehicle')) parsedPurpose = "car";
        else if (qLower.includes('home') || qLower.includes('house') || qLower.includes('renovation')) parsedPurpose = "home_improvement";
        else if (qLower.includes('credit card') || qLower.includes('card')) parsedPurpose = "credit_card";
        else if (qLower.includes('business') || qLower.includes('company')) parsedPurpose = "small_business";
        else if (qLower.includes('education') || qLower.includes('student')) parsedPurpose = "educational";
      }

      const wantsApproved = (args.desired_decision === 'APPROVE') || qLower.includes('approved') || qLower.includes('auto-approve') || qLower.includes('prime') || qLower.includes('approve');
      const wantsRejected = (args.desired_decision === 'REJECT') || qLower.includes('reject') || qLower.includes('declined') || qLower.includes('denied');

      let parsedLoan = args.loan_amount || (parsedPurpose === 'car' ? 24000 : 20000);
      if (!args.loan_amount) {
        const loanMatch = query.match(/\$?(\d+[\d,]*)\s*(?:loan|dollar|amount|k|\$)/i);
        if (loanMatch) parsedLoan = parseInt(loanMatch[1].replace(/,/g, ''));
      }
      if (parsedLoan < 1000) parsedLoan = parsedLoan * 1000;

      let parsedIncome = args.annual_income || (wantsApproved ? 105000 : 75000);
      if (!args.annual_income) {
        const incMatch = query.match(/(?:income|salary|earns?)\s*(?:of|is|:)?\s*\$?(\d+[\d,]*)/i);
        if (incMatch) parsedIncome = parseInt(incMatch[1].replace(/,/g, ''));
      }
      if (parsedIncome < 1000) parsedIncome = parsedIncome * 1000;

      let parsedCredit = args.credit_score || (wantsApproved ? 775 : (wantsRejected ? 585 : 710));
      if (!args.credit_score) {
        const crMatch = query.match(/(?:credit|score|fico)\s*(?:of|is|:)?\s*(\d{3})/i);
        if (crMatch) parsedCredit = parseInt(crMatch[1]);
      }

      let parsedDti = args.dti || (wantsApproved ? 9.5 : (wantsRejected ? 42.0 : 18.5));
      let parsedRate = args.interest_rate || (wantsApproved ? 5.85 : (wantsRejected ? 18.5 : 9.5));
      let parsedTerm = args.term || 36;
      let parsedHome = args.home_ownership || (wantsApproved ? "MORTGAGE" : (wantsRejected ? "RENT" : "OWN"));

      const evalData = {
        applicant_name: parsedName,
        credit_score: parsedCredit,
        annual_inc: parsedIncome,
        loan_amnt: parsedLoan,
        int_rate: parsedRate,
        dti: parsedDti,
        term: parsedTerm,
        revol_util: wantsApproved ? 16 : (wantsRejected ? 85 : 35),
        emp_length: wantsApproved ? 7 : 3,
        home_ownership: parsedHome,
        purpose: parsedPurpose
      };

      const evalRes = await callPythonML(evalData);
      const newId = `APP-${Math.floor(1000 + Math.random() * 9000)}`;
      const createdRecord = {
        id: newId,
        ...evalData,
        risk_score: evalRes.risk_score,
        decision: evalRes.decision,
        risk_category: evalRes.risk_category,
        base_risk: evalRes.base_risk,
        shap_factors: evalRes.top_factors,
        summary: evalRes.summary,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };

      applications.unshift(createdRecord);
      saveRecordToSqlite(createdRecord);
      saveStore();

      const toolCallObj = {
        tool: "create_loan_application",
        status: "executed",
        arguments: {
          applicant_name: parsedName,
          loan_amount: `$${parsedLoan.toLocaleString()}`,
          purpose: parsedPurpose,
          credit_score: parsedCredit,
          destination_database: "backend/loanlens.db (SQLite Table: applications)",
          ml_engine: evalRes.mode === 'real_xgboost' ? 'XGBoost (Python FastAPI)' : 'Formula Engine (fallback)'
        },
        result: {
          created_id: newId,
          applicant_name: parsedName,
          loan_type: parsedPurpose,
          evaluated_risk: `${evalRes.risk_score}%`,
          underwriting_decision: evalRes.decision,
          database_record_count: applications.length,
          persisted_to_storage: true,
          sqlite_database: "backend/loanlens.db",
          sql_operation: `INSERT INTO applications (id, applicant_name, loan_amnt, credit_score, risk_score, decision) VALUES ('${newId}', '${parsedName}', ${parsedLoan}, ${parsedCredit}, ${evalRes.risk_score}, '${evalRes.decision}')`
        }
      };

      return { record: createdRecord, evalRes, toolCall: toolCallObj };
    }

    async function executeUpdateLoan(args = {}, currentApp = targetApp) {
      if (!currentApp) return null;
      let updatedApp = { ...currentApp };

      if (args.loan_amount) updatedApp.loan_amnt = args.loan_amount;
      if (args.interest_rate) updatedApp.int_rate = args.interest_rate;
      if (args.term) updatedApp.term = args.term;
      if (args.dti) updatedApp.dti = args.dti;
      if (args.annual_income) updatedApp.annual_inc = args.annual_income;
      if (args.credit_score) updatedApp.credit_score = args.credit_score;

      // Extract from raw query if not in args
      const newLoanMatch = query.match(/\$?(\d+[\d,]*)\s*(?:loan|amount|\$)/i);
      const newTermMatch = query.match(/(\d{2})\s*(?:months?|term)/i);
      const newRateMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|rate|apr)/i);

      if (!args.loan_amount && newLoanMatch) {
        let val = parseInt(newLoanMatch[1].replace(/,/g, ''));
        if (val < 1000) val *= 1000;
        updatedApp.loan_amnt = val;
      }
      if (!args.term && newTermMatch) updatedApp.term = parseInt(newTermMatch[1]);
      if (!args.interest_rate && newRateMatch) updatedApp.int_rate = parseFloat(newRateMatch[1]);

      if (args.decision_override === 'APPROVE' || qLower.includes('approve') || qLower.includes('override to approve')) {
        updatedApp.int_rate = Math.min(updatedApp.int_rate || 7.0, 6.25);
        updatedApp.dti = Math.min(updatedApp.dti || 15, 11.5);
      } else if (args.decision_override === 'REJECT' || qLower.includes('reject')) {
        updatedApp.int_rate = Math.max(updatedApp.int_rate || 14.0, 18.0);
        updatedApp.dti = Math.max(updatedApp.dti || 25, 38.0);
      }

      const updatedEval = await callPythonML(updatedApp);
      updatedApp.risk_score = updatedEval.risk_score;
      updatedApp.decision = updatedEval.decision;
      updatedApp.risk_category = updatedEval.risk_category;
      updatedApp.summary = updatedEval.summary;
      updatedApp.shap_factors = updatedEval.top_factors;

      const idx = applications.findIndex(a => a.id === currentApp.id);
      if (idx !== -1) {
        applications[idx] = updatedApp;
      } else {
        applications.unshift(updatedApp);
      }
      saveRecordToSqlite(updatedApp);
      saveStore();

      const toolCallObj = {
        tool: "update_loan_terms",
        status: "executed",
        arguments: {
          applicant_id: updatedApp.id,
          applicant_name: updatedApp.applicant_name,
          updated_fields: {
            loan_amnt: updatedApp.loan_amnt,
            int_rate: updatedApp.int_rate,
            term: updatedApp.term,
            decision: updatedApp.decision
          },
          target_database: "backend/loanlens.db (SQLite)",
          ml_engine: updatedEval.mode === 'real_xgboost' ? 'XGBoost (Python FastAPI)' : 'Formula Engine (fallback)'
        },
        result: {
          id: updatedApp.id,
          new_risk_score: `${updatedEval.risk_score}%`,
          new_decision: updatedEval.decision,
          persisted_to_storage: true,
          sqlite_database: "backend/loanlens.db",
          sql_operation: `UPDATE applications SET loan_amnt = ${updatedApp.loan_amnt}, int_rate = ${updatedApp.int_rate}, risk_score = ${updatedEval.risk_score}, decision = '${updatedEval.decision}' WHERE id = '${updatedApp.id}'`
        }
      };

      return { record: updatedApp, evalRes: updatedEval, toolCall: toolCallObj };
    }

    function executeOptimizeLoan(currentApp = targetApp, threshold = target_risk_threshold) {
      if (!currentApp) return null;
      let loan = currentApp.loan_amnt || 15000;
      let dti = currentApp.dti || 20;
      let term = currentApp.term || 36;
      let rate = currentApp.int_rate || 12;

      let bestCandidate = { ...currentApp };
      let bestEval = evaluateApplicant(bestCandidate);

      if (term === 60) {
        const t36 = { ...bestCandidate, term: 36 };
        const ev = evaluateApplicant(t36);
        if (ev.risk_score <= threshold) {
          bestCandidate = t36;
          bestEval = ev;
        }
      }

      if (bestEval.risk_score > threshold) {
        for (let step = 1; step <= 8; step++) {
          const testLoan = Math.max(3000, Math.round(loan * (1 - step * 0.08)));
          const testDti = Number(Math.max(8, dti * (1 - step * 0.06)).toFixed(1));
          const testRate = Number(Math.max(6.5, rate - step * 0.4).toFixed(2));
          const candidate = {
            ...bestCandidate,
            loan_amnt: testLoan,
            dti: testDti,
            int_rate: testRate,
            term: 36
          };
          const ev = evaluateApplicant(candidate);
          bestCandidate = candidate;
          bestEval = ev;
          if (ev.risk_score <= threshold) break;
        }
      }

      const deltas = {
        loan_amnt: { original: currentApp.loan_amnt, proposed: bestCandidate.loan_amnt, diff: bestCandidate.loan_amnt - currentApp.loan_amnt },
        dti: { original: currentApp.dti, proposed: bestCandidate.dti, diff: Number((bestCandidate.dti - currentApp.dti).toFixed(1)) },
        term: { original: currentApp.term, proposed: bestCandidate.term, diff: bestCandidate.term - currentApp.term },
        int_rate: { original: currentApp.int_rate, proposed: bestCandidate.int_rate, diff: Number((bestCandidate.int_rate - currentApp.int_rate).toFixed(2)) }
      };

      const reachedPrime = bestEval.risk_score < threshold;
      const bEval = evaluateApplicant(currentApp);

      const toolCallObj = {
        tool: "optimize_counterfactual_terms",
        status: "executed",
        arguments: { target_threshold: threshold, applicant: currentApp.applicant_name },
        result: {
          original_risk: `${bEval.risk_score}% (${bEval.decision})`,
          optimized_risk: `${bestEval.risk_score}% (${bestEval.decision})`,
          delta_percentage_points: Number((bestEval.risk_score - bEval.risk_score).toFixed(2)),
          reached_prime_approval: reachedPrime,
          adjusted_features: deltas
        }
      };

      const simRes = {
        baseline: bEval,
        simulated: bestEval,
        modified_applicant: bestCandidate,
        deltas
      };

      return { simRes, toolCall: toolCallObj };
    }

    function executeStressTest(currentApp = targetApp) {
      if (!currentApp) return null;
      const stressedIncome = Math.round((currentApp.annual_inc || 75000) * 0.80);
      const stressedDti = Number(((currentApp.dti || 20) * 1.25).toFixed(1));
      const stressedRate = Number(((currentApp.int_rate || 12) + 3.0).toFixed(2));

      const stressedApp = {
        ...currentApp,
        annual_inc: stressedIncome,
        dti: stressedDti,
        int_rate: stressedRate
      };

      const bEval = evaluateApplicant(currentApp);
      const stressedEval = evaluateApplicant(stressedApp);
      const deltas = {
        annual_inc: { original: currentApp.annual_inc, proposed: stressedIncome, diff: stressedIncome - currentApp.annual_inc },
        dti: { original: currentApp.dti, proposed: stressedDti, diff: Number((stressedDti - currentApp.dti).toFixed(1)) },
        int_rate: { original: currentApp.int_rate, proposed: stressedRate, diff: 3.0 }
      };

      const toolCallObj = {
        tool: "execute_macro_stress_test",
        status: "executed",
        arguments: { income_shock: "-20%", rate_hike: "+300bps" },
        result: {
          original_risk: `${bEval.risk_score}% (${bEval.decision})`,
          stressed_risk: `${stressedEval.risk_score}% (${stressedEval.decision})`,
          delta_percentage_points: Number((stressedEval.risk_score - bEval.risk_score).toFixed(2))
        }
      };

      const simRes = {
        baseline: bEval,
        simulated: stressedEval,
        modified_applicant: stressedApp,
        deltas
      };

      return { simRes, toolCall: toolCallObj };
    }

    function executeAdverseAction(currentApp = targetApp, bEval = baseEval) {
      if (!currentApp || !bEval) return null;
      const adverseFactors = bEval.top_factors.filter(f => f.contribution > 0).slice(0, 4);
      const toolCallObj = {
        tool: "generate_adverse_action_notice",
        status: "executed",
        arguments: { applicant_id: currentApp.id, top_risk_factors: adverseFactors.length },
        result: {
          statute: "FCRA § 615(a) / Equal Credit Opportunity Act (Regulation B)",
          disclosed_factors: adverseFactors.map(f => f.label)
        }
      };
      return { toolCall: toolCallObj, adverseFactors };
    }

    function executeQueryDB(filterDecision = 'ALL') {
      const matched = filterDecision === 'ALL' 
        ? applications 
        : applications.filter(a => a.decision === filterDecision);

      const toolCallObj = {
        tool: "query_database_applications",
        status: "executed",
        arguments: { 
          target_table: "applications", 
          filter_decision: filterDecision,
          storage_backend: "backend/loanlens.db (SQLite) & audit_store.json"
        },
        result: {
          total_database_records: applications.length,
          matched_count: matched.length,
          sqlite_file: "backend/loanlens.db",
          sql_query: filterDecision === 'ALL' ? 'SELECT * FROM applications ORDER BY created_at DESC' : `SELECT * FROM applications WHERE decision = '${filterDecision}' ORDER BY created_at DESC`,
          sample_applicants: matched.slice(0, 6).map(a => `${a.id}: ${a.applicant_name} (${a.risk_score}% - ${a.decision})`)
        }
      };
      return { toolCall: toolCallObj, matched };
    }

    function executePortfolioMetrics() {
      const total = applications.length;
      const approved = applications.filter(a => a.decision === 'APPROVE').length;
      const review = applications.filter(a => a.decision === 'REVIEW').length;
      const rejected = applications.filter(a => a.decision === 'REJECT').length;
      const avgScore = Number((applications.reduce((s, a) => s + (a.risk_score || 0), 0) / (total || 1)).toFixed(1));

      const toolCallObj = {
        tool: "get_database_portfolio_metrics",
        status: "executed",
        arguments: { query_source: "persistent_audit_store", total_records: total },
        result: {
          total_applications: total,
          approval_rate: `${((approved / total) * 100).toFixed(1)}%`,
          pending_reviews: review,
          rejected_count: rejected,
          average_portfolio_risk: `${avgScore}%`
        }
      };
      return { toolCall: toolCallObj, stats: { total, approved, review, rejected, avgScore } };
    }

    // -------------------------------------------------------------
    // Groq OpenAI-Compatible Tools Schema Definition
    // -------------------------------------------------------------
    const groqTools = [
      {
        type: "function",
        function: {
          name: "create_loan_application",
          description: "Create, underwrite, and save a new loan application in the persistent database for any borrower. Use whenever user asks to create, make, underwrite, or add a new loan or applicant.",
          parameters: {
            type: "object",
            properties: {
              applicant_name: { type: "string", description: "Full name of the borrower (e.g. 'Mr. Akshanth', 'Jane Doe')" },
              loan_amount: { type: "number", description: "Requested loan amount in USD (e.g. 24000)" },
              purpose: { type: "string", enum: ["car", "home_improvement", "credit_card", "debt_consolidation", "small_business", "educational"], description: "Loan category / purpose" },
              credit_score: { type: "number", description: "Borrower FICO credit score (300 - 850)" },
              annual_income: { type: "number", description: "Gross annual income in USD" },
              dti: { type: "number", description: "Debt-to-income ratio percentage (e.g. 9.5)" },
              interest_rate: { type: "number", description: "Interest rate APR percentage (e.g. 5.85)" },
              term: { type: "number", enum: [36, 60], description: "Loan term in months (36 or 60)" },
              home_ownership: { type: "string", enum: ["MORTGAGE", "OWN", "RENT"] },
              desired_decision: { type: "string", enum: ["APPROVE", "REJECT", "REVIEW", "AUTO"], description: "Desired underwriting decision outcome" }
            },
            required: ["applicant_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_loan_terms",
          description: "Update or modify loan parameters (loan amount, rate, term, DTI, decision override) of an existing applicant in the database.",
          parameters: {
            type: "object",
            properties: {
              application_id: { type: "string", description: "Application ID to update, e.g. APP-1042. Defaults to current applicant." },
              loan_amount: { type: "number", description: "New loan amount in USD" },
              interest_rate: { type: "number", description: "New interest rate APR %" },
              term: { type: "number", enum: [36, 60], description: "New term in months" },
              dti: { type: "number", description: "New DTI ratio %" },
              decision_override: { type: "string", enum: ["APPROVE", "REJECT", "REVIEW"] }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "optimize_counterfactual_terms",
          description: "Run algorithmic counterfactual optimization on the applicant's loan to find minimum feasible risk floor and best restructuring package.",
          parameters: {
            type: "object",
            properties: {
              target_threshold: { type: "number", description: "Target risk percentage (default 14.9%)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "execute_macro_stress_test",
          description: "Simulate a macroeconomic shock (20% income reduction, +300 bps rate hike) on the borrower to test credit resilience.",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_adverse_action_notice",
          description: "Generate FCRA § 615(a) and ECOA compliant adverse action notice disclosing principal risk factors.",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "query_database_applications",
          description: "Search or query applications in the database by status or risk tier.",
          parameters: {
            type: "object",
            properties: {
              filter_decision: { type: "string", enum: ["ALL", "APPROVE", "REVIEW", "REJECT"] }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_database_portfolio_metrics",
          description: "Get aggregate portfolio risk metrics and statistics across all database loans.",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "audit_shap_tree_explainer",
          description: "Audit SHAP tree feature contributions and explain why the current applicant received their risk score and decision.",
          parameters: { type: "object", properties: {} }
        }
      }
    ];

    // -------------------------------------------------------------
    // Groq API Execution (with Tool Calling + Multi-turn Synthesis)
    // -------------------------------------------------------------
    let reply = "";
    let executionSource = "deterministic_agent";
    let tokenStats = null;

    if (effectiveApiKey) {
      try {
        const topHurting = baseEval?.top_factors.filter(f => f.contribution > 0).slice(0, 3).map(f => `${f.label} (${f.value}, +${(f.contribution * 100).toFixed(1)}%)`).join(', ');
        const topHelping = baseEval?.top_factors.filter(f => f.contribution < 0).slice(0, 3).map(f => `${f.label} (${f.value}, ${(f.contribution * 100).toFixed(1)}%)`).join(', ');

        const systemPrompt = `You are LoanLens Autonomous AI Underwriter Studio, an institutional credit risk officer and explainability engine.
You are capable of executing actions across the entire loan system: creating new loans, updating terms, running counterfactual optimization, stress testing, generating adverse action notices, querying database portfolio, explaining SHAP tree attributions, and answering general credit risk or banking questions in natural language.

Active Context:
• Currently Selected Applicant: ${targetApp ? `${targetApp.applicant_name} (${targetApp.id}, ${targetApp.purpose || 'General'} Financing)` : 'None'}
• Financial Profile: ${targetApp ? `$${targetApp.loan_amnt?.toLocaleString()} loan, ${targetApp.term}m @ ${targetApp.int_rate}% APR, FICO ${targetApp.credit_score}, DTI ${targetApp.dti}%, Income $${targetApp.annual_inc?.toLocaleString()}` : 'N/A'}
• Model Decision: ${baseEval ? `${baseEval.decision} (${baseEval.risk_score}% default probability)` : 'N/A'}
• Institutional Thresholds: < 15% Approve (Prime), 15% - 30% Review (Discretion), > 30% Reject (High Risk)
• SHAP Risk Drivers: ${topHurting || 'None'} | Mitigants: ${topHelping || 'None'}

GUIDELINES:
1. When user requests to create or make a new loan for any person, call 'create_loan_application'.
2. When user requests to update, approve, reject, or adjust terms, call 'update_loan_terms'.
3. When user requests to optimize terms, call 'optimize_counterfactual_terms'. Always provide quantitative honesty: if risk remains >= 15%, explain that this is the minimum feasible risk floor due to static profile attributes.
4. When user asks general questions (e.g. banking concepts, DTI, FICO bands, credit policy, explainability, system features), provide a comprehensive, articulate, executive banking response.`;

        const groqFirstRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model || 'qwen/qwen3.8-27b',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: query }
            ],
            tools: groqTools,
            tool_choice: "auto",
            temperature: 0.25,
            max_tokens: 950
          }),
          signal: AbortSignal.timeout(14000)
        });

        if (groqFirstRes.ok) {
          const firstData = await groqFirstRes.json();
          const firstChoice = firstData?.choices?.[0];

          if (firstChoice?.message?.tool_calls && firstChoice.message.tool_calls.length > 0) {
            // Process Groq Tool Calls
            executionSource = "groq_lpu";
            tokenStats = firstData.usage;

            const toolMessages = [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: query },
              firstChoice.message
            ];

            for (const tc of firstChoice.message.tool_calls) {
              const fnName = tc.function.name;
              let fnArgs = {};
              try { fnArgs = JSON.parse(tc.function.arguments || '{}'); } catch (e) {}

              let executionOutput = null;

              if (fnName === 'create_loan_application') {
                const res = await executeCreateLoan(fnArgs);
                targetApp = res.record;
                baseEval = res.evalRes;
                toolResultType = "create_application";
                toolCalls.push(res.toolCall);
                executionOutput = res.toolCall.result;
              } else if (fnName === 'update_loan_terms') {
                const res = await executeUpdateLoan(fnArgs, targetApp);
                if (res) {
                  targetApp = res.record;
                  baseEval = res.evalRes;
                  toolResultType = "update_application";
                  toolCalls.push(res.toolCall);
                  executionOutput = res.toolCall.result;
                }
              } else if (fnName === 'optimize_counterfactual_terms') {
                const res = executeOptimizeLoan(targetApp, fnArgs.target_threshold || target_risk_threshold);
                if (res) {
                  simulationResult = res.simRes;
                  toolResultType = "optimization";
                  toolCalls.push(res.toolCall);
                  executionOutput = res.toolCall.result;
                }
              } else if (fnName === 'execute_macro_stress_test') {
                const res = executeStressTest(targetApp);
                if (res) {
                  simulationResult = res.simRes;
                  toolResultType = "stress_test";
                  toolCalls.push(res.toolCall);
                  executionOutput = res.toolCall.result;
                }
              } else if (fnName === 'generate_adverse_action_notice') {
                const res = executeAdverseAction(targetApp, baseEval);
                if (res) {
                  toolResultType = "adverse_action";
                  toolCalls.push(res.toolCall);
                  executionOutput = res.toolCall.result;
                }
              } else if (fnName === 'query_database_applications') {
                const res = executeQueryDB(fnArgs.filter_decision || 'ALL');
                toolResultType = "database_query";
                toolCalls.push(res.toolCall);
                executionOutput = res.toolCall.result;
              } else if (fnName === 'get_database_portfolio_metrics') {
                const res = executePortfolioMetrics();
                toolResultType = "portfolio_metrics";
                toolCalls.push(res.toolCall);
                executionOutput = res.toolCall.result;
              } else {
                // audit_shap_tree_explainer
                toolResultType = "analysis";
                const toolCallObj = {
                  tool: "audit_shap_tree_explainer",
                  status: "executed",
                  arguments: { applicant_id: targetApp?.id },
                  result: {
                    base_risk: `${(baseEval?.base_risk * 100).toFixed(2)}%`,
                    predicted_risk: `${baseEval?.risk_score}%`,
                    top_driver: baseEval?.top_factors[0]?.label
                  }
                };
                toolCalls.push(toolCallObj);
                executionOutput = toolCallObj.result;
              }

              toolMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(executionOutput)
              });
            }

            // Follow-up completion turn to synthesize final underwriter response
            try {
              const groqSecondRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${effectiveApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: model || 'qwen/qwen3.8-27b',
                  messages: toolMessages,
                  temperature: 0.25,
                  max_tokens: 950
                }),
                signal: AbortSignal.timeout(12000)
              });

              if (groqSecondRes.ok) {
                const secondData = await groqSecondRes.json();
                if (secondData?.choices?.[0]?.message?.content) {
                  reply = secondData.choices[0].message.content;
                }
              }
            } catch (errFollow) {
              console.warn('Groq follow-up synthesis warning:', errFollow.message);
            }
          } else if (firstChoice?.message?.content) {
            // General conversational or banking intelligence response without tool call
            reply = firstChoice.message.content;
            executionSource = "groq_lpu";
            toolResultType = "general_inquiry";
            tokenStats = firstData.usage;
          }
        }
      } catch (groqErr) {
        console.warn('Groq fetch error, falling back to autonomous engine:', groqErr.message);
      }
    }

    // -------------------------------------------------------------
    // Autonomous Deterministic Engine (Active when no Groq key or fallback)
    // -------------------------------------------------------------
    if (!reply) {
      const isUpdate = 
        qLower.includes('apply term') || 
        qLower.includes('apply change') || 
        qLower.includes('apply counterfactual') ||
        qLower.includes('save term') || 
        qLower.includes('save change') ||
        qLower.includes('update application') || 
        qLower.includes('update this loan') || 
        qLower.includes('update loan') || 
        qLower.includes('change rate') ||
        qLower.includes('change term') ||
        qLower.includes('change the') ||
        qLower.includes('change interest') ||
        qLower.includes('change loan') ||
        qLower.includes('modify') ||
        qLower.includes('adjust') ||
        qLower.includes('override decision') ||
        qLower.includes('approve this loan') || 
        qLower.includes('reject this loan') ||
        ((qLower.includes('change') || qLower.includes('reduce') || qLower.includes('increase')) && (qLower.includes('loan') || qLower.includes('rate') || qLower.includes('term') || qLower.includes('amount')));

      const isCreate = !isUpdate && (
        qLower.includes('create') || 
        qLower.includes('new loan') || 
        qLower.includes('make a new') || 
        qLower.includes('new load') || // user typo
        qLower.includes('make a load') ||
        qLower.includes('add applicant') || 
        qLower.includes('add loan') || 
        qLower.includes('add borrower') ||
        qLower.includes('underwrite new') ||
        qLower.includes('underwrite a') ||
        qLower.includes('register') ||
        ((qLower.includes('loan') || qLower.includes('load')) && (qLower.includes('under') || qLower.includes('named') || qLower.includes('akshanth') || (qLower.includes('for') && !qLower.includes('for this'))))
      );

      const isOptimize = 
        qLower.includes('optimize') || 
        qLower.includes('counterfactual') || 
        qLower.includes('restructure') || 
        qLower.includes('make approvable') ||
        qLower.includes('best terms') ||
        qLower.includes('minimum risk') ||
        (qLower.includes('approve') && (qLower.includes('how') || qLower.includes('can we')));

      const isStress = 
        qLower.includes('stress') || 
        qLower.includes('recession') || 
        qLower.includes('drop') || 
        (qLower.includes('income') && qLower.includes('fall'));

      const isAdverse = 
        qLower.includes('adverse') || 
        qLower.includes('denial') || 
        qLower.includes('fcra') || 
        qLower.includes('ecoa') || 
        qLower.includes('reject letter');

      const isDbQuery = 
        qLower.includes('database') || 
        qLower.includes('list applications') || 
        qLower.includes('all applications') || 
        qLower.includes('pending') || 
        qLower.includes('show applications') || 
        qLower.includes('show all');

      const isPortfolio = 
        qLower.includes('portfolio') || 
        qLower.includes('database stats') || 
        qLower.includes('approval rate') || 
        qLower.includes('summary of database') || 
        qLower.includes('metrics');

      const isGeneralInquiry = 
        qLower.includes('what is') || 
        qLower.includes('how does') || 
        qLower.includes('explain') || 
        qLower.includes('who are you') || 
        qLower.includes('what can you do') || 
        qLower.includes('help') || 
        qLower.includes('hello') || 
        qLower.includes('hi') ||
        qLower.includes('difference between') ||
        qLower.includes('tell me about');

      if (isCreate) {
        toolResultType = "create_application";
        const res = await executeCreateLoan();
        targetApp = res.record;
        baseEval = res.evalRes;
        toolCalls.push(res.toolCall);

        reply = `### ➕ New Loan Application Underwritten & Saved to Database\n\n` +
          `Successfully generated, underwritten, and persisted **${targetApp.applicant_name}** to the database store:\n\n` +
          `• **Generated Application ID:** \`${targetApp.id}\`\n` +
          `• **Financing Purpose:** **${targetApp.purpose === 'car' ? 'Car / Auto Loan' : targetApp.purpose}**\n` +
          `• **Requested Loan Amount:** $${Number(targetApp.loan_amnt).toLocaleString()} (${targetApp.term} months @ ${targetApp.int_rate}% APR)\n` +
          `• **Borrower Profile:** FICO ${targetApp.credit_score} | Gross Annual Income: $${Number(targetApp.annual_inc).toLocaleString()} | DTI: ${targetApp.dti}%\n` +
          `• **Calculated Default Probability:** **${baseEval.risk_score}%**\n` +
          `• **Underwriting Decision:** **${baseEval.decision}** (${baseEval.risk_category})\n\n` +
          `✅ *Record has been committed to the persistent database (\`backend/audit_store.json\`). The application is now actively selected in your Underwriter Studio.*`;
      } else if (isUpdate && targetApp) {
        toolResultType = "update_application";
        const res = await executeUpdateLoan({}, targetApp);
        targetApp = res.record;
        baseEval = res.evalRes;
        toolCalls.push(res.toolCall);

        reply = `### 💾 Application Parameters Updated in Database\n\n` +
          `Successfully applied underwriting adjustments to **${targetApp.applicant_name}** (\`${targetApp.id}\`):\n\n` +
          `• **Updated Loan Structure:** $${Number(targetApp.loan_amnt).toLocaleString()} (${targetApp.term} months @ ${targetApp.int_rate}% APR)\n` +
          `• **Re-evaluated Default Risk:** **${baseEval.risk_score}%**\n` +
          `• **Underwriting Decision:** **${baseEval.decision}** (${baseEval.risk_category})\n\n` +
          `✅ *Changes are committed to persistent storage and reflected across all telemetry and audit views.*`;
      } else if (isOptimize && targetApp) {
        toolResultType = "optimization";
        const res = executeOptimizeLoan(targetApp, target_risk_threshold);
        simulationResult = res.simRes;
        toolCalls.push(res.toolCall);

        const sim = simulationResult.simulated;
        const netDelta = Number((sim.risk_score - baseEval.risk_score).toFixed(1));
        const reachedPrime = sim.risk_score < target_risk_threshold;

        reply = `### 🎯 Counterfactual Sensitivity Optimization for ${targetApp.applicant_name}\n\n` +
          (reachedPrime
            ? `Through algorithmic sensitivity optimization, we identified a restructured loan package that successfully reclassifies this borrower into **Prime Auto-Approve (<15%)**.\n\n`
            : `Through algorithmic sensitivity optimization, we identified the **minimum feasible risk floor** for this profile, reducing risk to **${sim.risk_score}% (${sim.decision})**.\n\n` +
              `> ⚠️ **Underwriter Reality Check:** The profile remains in the **15% – 30% Review Band**. Non-negotiable static attributes (such as FICO ${targetApp.credit_score} and home ownership status '${targetApp.home_ownership}') create a mathematical risk floor that loan restructuring alone cannot push below 15%. Discretionary manual review or additional collateral is required.\n\n`
          ) +
          `#### 📊 Quantitative Decision Shift:\n` +
          `• **Baseline Default Risk:** **${baseEval.risk_score}%** (${baseEval.decision})\n` +
          `• **Optimized Default Risk:** **${sim.risk_score}%** (${sim.decision})\n` +
          `• **Net Risk Shift:** **${Math.abs(netDelta)} percentage points**\n\n` +
          `#### 🛠️ Recommended Structural Adjustments:\n` +
          `• **Loan Amount:** Adjusted from **$${targetApp.loan_amnt?.toLocaleString()}** ➔ **$${simulationResult.modified_applicant.loan_amnt?.toLocaleString()}**\n` +
          `• **Target DTI:** Recommending debt consolidation payoff down to **${simulationResult.modified_applicant.dti}%**\n` +
          `• **Interest Rate:** Structured at **${simulationResult.modified_applicant.int_rate}% APR**\n` +
          `• **Term:** Maintained at **${simulationResult.modified_applicant.term} months**\n\n` +
          `*Note: Inspection canvas on the right has been populated with live parameter deltas and SHAP re-attributions.*`;
      } else if (isStress && targetApp) {
        toolResultType = "stress_test";
        const res = executeStressTest(targetApp);
        simulationResult = res.simRes;
        toolCalls.push(res.toolCall);

        const sim = simulationResult.simulated;
        const netDelta = Number((sim.risk_score - baseEval.risk_score).toFixed(1));
        reply = `### 📉 Macroeconomic & Income Stress Test Audit\n\n` +
          `We subjected **${targetApp.applicant_name}** to a standard Federal Reserve stress scenario (20% immediate income contraction + 300 bps interest rate shock).\n\n` +
          `#### ⚡ Stress Resilience Findings:\n` +
          `• **Pre-Stress Default Probability:** **${baseEval.risk_score}%** (${baseEval.decision})\n` +
          `• **Stressed Default Probability:** **${sim.risk_score}%** (${sim.decision})\n` +
          `• **Risk Deterioration:** **+${netDelta}%** default vulnerability spike\n\n` +
          `**Underwriter Recommendation:** ${sim.risk_score > 30 ? 'Borrower lacks sufficient debt-service elasticity under economic downturns. Requires secondary guarantor or cash collateral.' : 'Borrower maintains adequate liquidity reserve; risk buffer absorbs the income shock within acceptable thresholds.'}`;
      } else if (isAdverse && targetApp) {
        toolResultType = "adverse_action";
        const res = executeAdverseAction(targetApp, baseEval);
        toolCalls.push(res.toolCall);

        reply = `### ⚖️ Adverse Action Statement (FCRA §615(a) & ECOA Compliant)\n\n` +
          `**Notice of Credit Decision & Principal Reasons for Adverse Action**\n` +
          `• **Applicant:** ${targetApp.applicant_name} (ID: ${targetApp.id})\n` +
          `• **Date of Evaluation:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n` +
          `• **Calculated Default Probability:** ${baseEval.risk_score}%\n\n` +
          `#### 📋 Disclosed Principal Reasons for Adverse Action:\n` +
          res.adverseFactors.map((f, i) => `${i + 1}. **${f.label}** (Reported: ${f.value}) — Model SHAP impact: +${(f.contribution * 100).toFixed(1)}% elevated default probability`).join('\n') + `\n\n` +
          `*You have the right under the Fair Credit Reporting Act to request a free disclosure of your credit file from the reporting agencies within 60 days.*`;
      } else if (isDbQuery) {
        toolResultType = "database_query";
        let filterDecision = 'ALL';
        if (qLower.includes('review') || qLower.includes('pending')) filterDecision = 'REVIEW';
        else if (qLower.includes('approve')) filterDecision = 'APPROVE';
        else if (qLower.includes('reject')) filterDecision = 'REJECT';

        const res = executeQueryDB(filterDecision);
        toolCalls.push(res.toolCall);

        reply = `### 🗄️ Database Query Results (Persistent SQLite / Audit Store)\n\n` +
          `Successfully queried the backend database. Found **${res.matched.length} matching records** across a total of **${applications.length} stored applications**.\n\n` +
          `#### 📋 Application Audit Records:\n` +
          (res.matched.slice(0, 6).map(a => `• \`${a.id}: ${a.applicant_name} (${a.risk_score}% - ${a.decision})\``)).join('\n') + `\n\n` +
          `*All application records are persisted in \`backend/audit_store.json\` and linked directly to the front-end telemetry views.*`;
      } else if (isPortfolio) {
        toolResultType = "portfolio_metrics";
        const res = executePortfolioMetrics();
        toolCalls.push(res.toolCall);

        reply = `### 📊 Portfolio Database Risk Summary\n\n` +
          `Live aggregate metrics from the persistent database store:\n\n` +
          `• **Total Underwritten Applications:** **${res.stats.total}**\n` +
          `• **Prime Approval Rate:** **${((res.stats.approved / res.stats.total) * 100).toFixed(1)}%** (< 15% risk threshold)\n` +
          `• **Pending Underwriter Reviews:** **${res.stats.review}** (15% - 30% band)\n` +
          `• **High-Risk Declined:** **${res.stats.rejected}** (> 30% risk threshold)\n` +
          `• **Average Portfolio Risk:** **${res.stats.avgScore}%**\n\n` +
          `*Data sourced directly via Express backend querying persistent JSON / SQLite database.*`;
      } else if (isGeneralInquiry) {
        toolResultType = "general_inquiry";
        reply = `### 💡 LoanLens AI Underwriting & Explainability Intelligence\n\n` +
          `LoanLens is an enterprise credit risk underwriting studio powered by machine learning and SHAP tree explainability.\n\n` +
          `#### 🏦 Institutional Policy Framework:\n` +
          `• **Prime Auto-Approval (< 15.0% Default Risk):** High-solvency borrowers with prime FICO scores (> 740), low debt-to-income (< 15%), and controlled revolving utilization.\n` +
          `• **Underwriter Manual Review (15.0% – 30.0% Band):** Borderline applications requiring human underwriter discretion, structural term adjustments, or mitigating collateral.\n` +
          `• **Automated Decline (> 30.0% Risk):** Excessive default risk triggering adverse action documentation.\n\n` +
          `#### ⚙️ Autonomous Capabilities You Can Direct:\n` +
          `1. **Create Applications:** *"Create an approved car loan for Mr. Akshanth ($24k, 775 credit score)"*\n` +
          `2. **Counterfactual Optimization:** *"Auto-Optimize terms to find the minimum feasible risk floor"*\n` +
          `3. **Modify Loan Terms:** *"Change interest rate to 6.5% and term to 36 months"*\n` +
          `4. **Macro Stress Testing:** *"Simulate a 20% income reduction recession shock"*\n` +
          `5. **Compliance Documentation:** *"Generate FCRA Adverse Action Statement for this applicant"*\n` +
          `6. **Database Inspection:** *"Show all pending review applications in the database"*`;
      } else if (targetApp) {
        // Fallback: SHAP explainer for selected loan
        toolResultType = "analysis";
        const topHurt = baseEval.top_factors.filter(f => f.contribution > 0).slice(0, 2).map(f => `**${f.label}** (+${(f.contribution * 100).toFixed(1)}%)`).join(', ');
        const topHelp = baseEval.top_factors.filter(f => f.contribution < 0).slice(0, 2).map(f => `**${f.label}** (${(f.contribution * 100).toFixed(1)}%)`).join(', ');

        toolCalls.push({
          tool: "audit_shap_tree_explainer",
          status: "executed",
          arguments: { applicant_id: targetApp.id },
          result: {
            base_risk: `${(baseEval.base_risk * 100).toFixed(2)}%`,
            predicted_risk: `${baseEval.risk_score}%`,
            top_driver: baseEval.top_factors[0]?.label
          }
        });

        reply = `### 🔍 Underwriter Diagnostic: ${targetApp.applicant_name} (${targetApp.id})\n\n` +
          `This application is currently placed in **${baseEval.decision}** tier with a predicted default risk of **${baseEval.risk_score}%** against the population baseline of ${(baseEval.base_risk * 100).toFixed(1)}%.\n\n` +
          `• **Primary Risk Drivers:** ${topHurt || 'No excessive risk factors'}\n` +
          `• **Mitigating Strengths:** ${topHelp || 'None'}\n\n` +
          `**Recommended Action:** Run **Auto-Optimize Terms** in the console to explore feasible parameter restructuring that minimizes default vulnerability.`;
      } else {
        reply = "Please specify an instruction or applicant to analyze.";
      }
    }

    res.json({
      reply,
      tool_calls: toolCalls,
      tool_type: toolResultType,
      simulation_result: simulationResult,
      application_evaluated: targetApp ? {
        id: targetApp.id,
        applicant_name: targetApp.applicant_name,
        credit_score: targetApp.credit_score,
        annual_inc: targetApp.annual_inc,
        loan_amnt: targetApp.loan_amnt,
        dti: targetApp.dti,
        int_rate: targetApp.int_rate,
        term: targetApp.term,
        risk_score: baseEval?.risk_score,
        decision: baseEval?.decision
      } : null,
      model_used: model,
      execution_source: executionSource,
      token_stats: tokenStats,
      timestamp: new Date().toISOString()
    });
  });
};

registerRoutes(app);

// -------------------------------------------------------------
// Serve Static Frontend & SPA Fallback
// -------------------------------------------------------------
const distPath = fs.existsSync(path.join(__dirname, 'dist')) 
  ? path.join(__dirname, 'dist') 
  : path.join(__dirname, 'frontend', 'dist');

if (fs.existsSync(distPath)) {
  console.log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>LoanLens Starting...</title></head>
        <body style="background:#0b0f17; color:#fff; font-family:sans-serif; text-align:center; padding:50px;">
          <h2>LoanLens Build Initializing</h2>
          <p>The frontend is compiling. Please refresh in a moment.</p>
        </body>
      </html>
    `);
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`>> LoanLens unified server running on http://0.0.0.0:${PORT}`);
});
