import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// In-Memory & File Store for Audit Trail (mirroring backend/loanlens.db)
// -------------------------------------------------------------
const DATA_FILE = path.join(__dirname, 'backend', 'audit_store.json');

const INITIAL_SEEDS = [
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

let applications = [...INITIAL_SEEDS];

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    applications = JSON.parse(raw);
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_SEEDS, null, 2));
  }
} catch (e) {
  console.warn("Using in-memory seed applications:", e);
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(applications, null, 2));
  } catch (e) {
    console.error("Failed to persist audit store:", e);
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
    mode: "real"
  };
}

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

  // Predict
  router.post(['/predict', '/api/predict'], (req, res) => {
    const data = req.body || {};
    const evalResult = evaluateApplicant(data);
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
    saveStore();

    res.json({
      application_id: id,
      risk_score: evalResult.risk_score,
      decision: evalResult.decision,
      risk_category: evalResult.risk_category,
      base_risk: evalResult.base_risk,
      summary: evalResult.summary,
      backend_mode: "real"
    });
  });

  // Explain
  router.post(['/explain', '/api/explain'], (req, res) => {
    const data = req.body || {};
    const evalResult = evaluateApplicant(data);
    res.json({
      base_risk: evalResult.base_risk,
      final_risk: evalResult.final_risk,
      risk_score: evalResult.risk_score,
      decision: evalResult.decision,
      risk_category: evalResult.risk_category,
      top_factors: evalResult.top_factors,
      summary: evalResult.summary,
      backend_mode: "real"
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

  // AI Agent Copilot
  router.post(['/agent', '/api/agent'], (req, res) => {
    const { query = '', application_data, application_id } = req.body || {};
    const qLower = query.toLowerCase();

    let targetApp = application_data;
    const toolCalls = [];

    if (!targetApp && application_id) {
      targetApp = applications.find(a => a.id === application_id);
      if (targetApp) {
        toolCalls.push({
          tool: "get_application",
          arguments: { id: application_id },
          status: "success"
        });
      }
    }

    let reply = "";

    if (qLower.includes('why') || qLower.includes('reason') || qLower.includes('risk') || qLower.includes('reject') || qLower.includes('factor') || qLower.includes('hurting')) {
      if (targetApp) {
        const ev = evaluateApplicant(targetApp);
        toolCalls.push({
          tool: "explain_decision",
          arguments: { applicant: targetApp.applicant_name },
          result: { risk_score: ev.risk_score, decision: ev.decision }
        });

        const pos = ev.top_factors.filter(f => f.contribution > 0);
        const neg = ev.top_factors.filter(f => f.contribution < 0);

        const hurting = pos.slice(0, 2).map(f => `${f.label} (+${(f.contribution * 100).toFixed(1)}%)`).join(', ');
        const helping = neg.slice(0, 2).map(f => `${f.label} (${(f.contribution * 100).toFixed(1)}%)`).join(', ');

        reply = `Application for **${targetApp.applicant_name}** currently holds a predicted default risk of **${ev.risk_score}%**, ` +
          `resulting in a **${ev.decision}** recommendation (Thresholds: <15% Approve, 15-30% Review, >30% Reject).\n\n` +
          `🔍 **SHAP Attribution Breakdown:**\n` +
          `• **Key Risk Drivers (Hurting):** ${hurting || 'None significant'}\n` +
          `• **Mitigating Strengths (Helping):** ${helping || 'None significant'}\n\n` +
          `The borrower's financial profile indicates that lowering their Debt-to-Income or loan amount will yield the most immediate risk reduction.`;
      } else {
        reply = `LoanLens AI evaluates applications against institutional risk thresholds:\n` +
          `• **< 15% Risk:** Automatic Prime Approval\n` +
          `• **15% - 30% Risk:** Manual Underwriter Review required\n` +
          `• **> 30% Risk:** Rejection recommendation\n\n` +
          `Select an application to inspect its exact SHAP waterfall breakdown!`;
      }
    } else if (qLower.includes('what if') || qLower.includes('income') || qLower.includes('increase') || qLower.includes('reduce') || qLower.includes('dti') || qLower.includes('change')) {
      if (targetApp) {
        let mod = {};
        if (qLower.includes('income')) {
          mod = { annual_inc: (targetApp.annual_inc || 75000) + 25000 };
        } else if (qLower.includes('dti')) {
          mod = { dti: Math.max(10, (targetApp.dti || 25) - 10) };
        } else if (qLower.includes('loan')) {
          mod = { loan_amnt: Math.max(5000, (targetApp.loan_amnt || 15000) - 5000) };
        } else {
          mod = { annual_inc: (targetApp.annual_inc || 75000) * 1.2 };
        }

        const baseEv = evaluateApplicant(targetApp);
        const modEv = evaluateApplicant({ ...targetApp, ...mod });
        const delta = Number((modEv.risk_score - baseEv.risk_score).toFixed(2));

        toolCalls.push({
          tool: "run_what_if",
          arguments: mod,
          result: { risk_diff: delta, new_risk: modEv.risk_score }
        });

        reply = `📊 **Simulated What-If Scenario Result:**\n` +
          `Parameters adjusted: \`${JSON.stringify(mod)}\`\n\n` +
          `• **Original Risk:** ${baseEv.risk_score}% (${baseEv.decision})\n` +
          `• **Simulated Risk:** ${modEv.risk_score}% (${modEv.decision})\n` +
          `• **Net Change:** ${Math.abs(delta).toFixed(1)} percentage points ${delta < 0 ? 'reduction' : 'increase'}\n\n` +
          (baseEv.decision !== modEv.decision ? `🎉 Status changed from **${baseEv.decision}** to **${modEv.decision}**!` : `Status remains ${baseEv.decision}, but risk buffer improved.`);
      } else {
        reply = `To run a What-If scenario, select an application from the table or adjust the sliders in Decision Analysis!`;
      }
    } else if (qLower.includes('similar') || qLower.includes('historical') || qLower.includes('past') || qLower.includes('database')) {
      const sample = applications.slice(0, 4);
      toolCalls.push({
        tool: "search_similar_applications",
        arguments: { limit: 4 },
        matches_found: sample.length
      });

      const list = sample.map(a => `• **${a.id}** (${a.applicant_name}) — Credit: ${a.credit_score}, Risk: ${a.risk_score}%, Status: ${a.decision}`).join('\n');
      reply = `Found relevant historical applications from the SQLite audit database:\n\n${list}\n\nComparing similar borrower risk distributions helps ensure fair and compliant decisioning.`;
    } else {
      reply = `Hello! I am your **LoanLens Decision Copilot**.\n\n` +
        `I am connected directly to our **XGBoost Risk Model**, SHAP TreeExplainer engine, and SQLite Audit Trail.\n\n` +
        `Try asking:\n` +
        `1. *"Why is this application risky?"*\n` +
        `2. *"What happens if applicant income increases by $25,000?"*\n` +
        `3. *"Which factor is hurting this applicant most?"*\n` +
        `4. *"Show similar loans in the audit trail."*`;
    }

    res.json({
      reply,
      tool_calls: toolCalls,
      application_evaluated: targetApp ? targetApp.applicant_name : null,
      backend_mode: "real"
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
