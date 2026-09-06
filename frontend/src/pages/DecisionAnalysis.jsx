import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ShieldX, 
  ArrowLeft, 
  Sparkles, 
  Sliders, 
  FileText, 
  DollarSign, 
  User, 
  TrendingUp,
  Percent,
  CheckCircle2
} from 'lucide-react';
import RiskGauge from '../components/RiskGauge';
import ShapChart from '../components/ShapChart';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { api } from '../api';

export default function DecisionAnalysis({ 
  currentApplication, 
  onOpenCopilot 
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appId = searchParams.get('id');

  const [application, setApplication] = useState(currentApplication);
  const [loading, setLoading] = useState(!currentApplication && Boolean(appId));
  const [error, setError] = useState(null);

  // If application not in memory, fetch from SQLite audit endpoint
  useEffect(() => {
    async function fetchApp() {
      if (appId && (!application || application.id !== appId)) {
        setLoading(true);
        try {
          const data = await api.getApplication(appId);
          setApplication(data);
        } catch (err) {
          console.error('Failed to load application:', err);
          setError('Could not retrieve application from audit database.');
        } finally {
          setLoading(false);
        }
      }
    }
    fetchApp();
  }, [appId]);

  // Fallback demo applicant if directly navigating to /decision without ID
  useEffect(() => {
    if (!application && !appId && !loading) {
      const fallbackApp = {
        id: 'APP-1042',
        applicant_name: 'Rahul Sharma',
        credit_score: 685,
        annual_inc: 72000,
        loan_amnt: 18000,
        int_rate: 14.5,
        dti: 23.4,
        term: 36,
        emp_length: 5,
        home_ownership: 'RENT',
        purpose: 'debt_consolidation',
        revol_util: 68.2,
        open_acc: 12,
        risk_score: 23.8,
        decision: 'REVIEW',
        risk_category: 'Moderate Risk',
        base_risk: 0.4336,
        shap_factors: [
          { feature: 'dti', label: 'Debt-to-Income (DTI)', value: '23.4%', contribution: 0.082, impact: 'increases_risk' },
          { feature: 'revol_util', label: 'Revolving Utilization', value: '68.2%', contribution: 0.065, impact: 'increases_risk' },
          { feature: 'credit_score', label: 'Credit Score', value: '685', contribution: -0.045, impact: 'lowers_risk' },
          { feature: 'annual_inc', label: 'Annual Income', value: '$72,000', contribution: -0.038, impact: 'lowers_risk' },
          { feature: 'int_rate', label: 'Interest Rate', value: '14.5%', contribution: 0.024, impact: 'increases_risk' },
        ],
        summary: "This application falls into the Review category primarily because of a high debt-to-income ratio (23.4%) and elevated revolving credit utilization (68.2%). The applicant's credit score (685) and steady employment history partially mitigate risk."
      };
      setApplication(fallbackApp);
    }
  }, [application, appId, loading]);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">Loading Decision Model & SHAP Breakdown...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-rose-400 text-sm">{error || 'Application not found.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg bg-gray-800 text-white text-xs hover:bg-gray-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const decision = application.decision || 'REVIEW';
  const riskScore = application.risk_score || 23.8;
  const factors = application.shap_factors || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight m-0">
                Decision Analysis: {application.applicant_name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700/60">
                {application.id}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Explainable AI decision report grounded in LendingClub XGBoost TreeExplainer
            </p>
          </div>
        </div>

        {/* Copilot Launcher with this context */}
        <button
          onClick={onOpenCopilot}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold transition-all shadow-md active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Ask Copilot About This Decision</span>
        </button>
      </div>

      {/* Top Grid: Risk Gauge Card + Applicant Quick Profile Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Risk Gauge Card */}
        <div className="lg:col-span-1 bg-gray-900/90 border border-gray-800 rounded-xl p-6 shadow-xl flex flex-col items-center justify-between">
          <div className="w-full text-left border-b border-gray-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Evaluated Default Risk
            </span>
            <div className="text-xs text-gray-500">
              3-Tier Threshold Policy (<span className="text-emerald-400">&lt;15%</span> | <span className="text-amber-400">15-30%</span> | <span className="text-rose-400">&gt;30%</span>)
            </div>
          </div>

          <RiskGauge riskScore={riskScore} decision={decision} size={250} />

          <div className="w-full grid grid-cols-2 gap-2 text-center text-xs mt-2 pt-3 border-t border-gray-800/80">
            <div className="p-2 rounded-lg bg-gray-950/60 border border-gray-800/80">
              <span className="text-gray-500 text-[10px] uppercase block">Decision</span>
              <span className="font-bold text-white">{decision}</span>
            </div>
            <div className="p-2 rounded-lg bg-gray-950/60 border border-gray-800/80">
              <span className="text-gray-500 text-[10px] uppercase block">Risk Tier</span>
              <span className="font-bold text-cyan-400">{application.risk_category || 'Moderate'}</span>
            </div>
          </div>
        </div>

        {/* Applicant Profile & Key Financial Ratios */}
        <div className="lg:col-span-2 bg-gray-900/90 border border-gray-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                <User className="w-4 h-4 text-cyan-400" />
                <span>Applicant Underwriting Characteristics</span>
              </span>
              <span className="text-xs text-gray-500">Pre-origination metrics</span>
            </div>

            {/* Financial Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                <span className="text-[11px] text-gray-400 block">Requested Loan</span>
                <span className="text-base font-extrabold text-white font-mono">
                  ${Number(application.loan_amnt).toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-500 block capitalize">
                  {String(application.purpose).replace('_', ' ')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                <span className="text-[11px] text-gray-400 block">Gross Income</span>
                <span className="text-base font-extrabold text-white font-mono">
                  ${Number(application.annual_inc).toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-500 block">Annualized</span>
              </div>

              <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                <span className="text-[11px] text-gray-400 block">Credit Score</span>
                <span className="text-base font-extrabold text-cyan-400 font-mono">
                  {application.credit_score}
                </span>
                <span className="text-[10px] text-gray-500 block">FICO Range</span>
              </div>

              <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                <span className="text-[11px] text-gray-400 block">Debt-to-Income</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">
                  {Number(application.dti).toFixed(1)}%
                </span>
                <span className="text-[10px] text-gray-500 block">DTI Ratio</span>
              </div>
            </div>

            {/* Secondary Attributes Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
              <div className="p-2 rounded-lg bg-gray-950/30 border border-gray-800/60 text-gray-300">
                <span className="text-gray-500 text-[10px] block">Interest Rate:</span>
                <span className="font-semibold">{application.int_rate}%</span>
              </div>
              <div className="p-2 rounded-lg bg-gray-950/30 border border-gray-800/60 text-gray-300">
                <span className="text-gray-500 text-[10px] block">Loan Term:</span>
                <span className="font-semibold">{application.term || 36} Months</span>
              </div>
              <div className="p-2 rounded-lg bg-gray-950/30 border border-gray-800/60 text-gray-300">
                <span className="text-gray-500 text-[10px] block">Employment:</span>
                <span className="font-semibold">{application.emp_length || 5} Years</span>
              </div>
              <div className="p-2 rounded-lg bg-gray-950/30 border border-gray-800/60 text-gray-300">
                <span className="text-gray-500 text-[10px] block">Home Ownership:</span>
                <span className="font-semibold">{application.home_ownership || 'RENT'}</span>
              </div>
            </div>
          </div>

          {/* AI Narrative Explanation Summary Card */}
          <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-gray-950 to-gray-950 border border-indigo-500/30">
            <div className="flex items-center space-x-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Explainable AI Underwriting Summary
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              {application.summary || (
                `This application is classified as ${decision} with a predicted default risk of ${riskScore}%. ` +
                `The decision is primarily driven by the balance between the borrower's debt-to-income burden and historical credit performance.`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* SHAP Feature Contribution Waterfall/Bar Chart */}
      <ShapChart 
        factors={factors} 
        baseRisk={application.base_risk || 0.4336} 
        finalRisk={riskScore / 100.0} 
      />

      {/* Interactive What-If Simulator */}
      <WhatIfSimulator application={application} />
    </div>
  );
}
