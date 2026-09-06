import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Sparkles, 
  Send, 
  DollarSign, 
  Percent, 
  Award, 
  Building, 
  Briefcase, 
  Calendar,
  AlertCircle,
  Zap
} from 'lucide-react';
import { api } from '../api';

export default function NewApplication({ onApplicationEvaluated }) {
  const navigate = useNavigate();

  const presets = [
    {
      id: 'prime',
      label: 'Prime Borrower (Target: Approve)',
      description: '780 FICO, $125k Income, 11% DTI, $15k Loan',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      data: {
        applicant_name: 'Sophia Vance',
        credit_score: 780,
        annual_inc: 125000,
        loan_amnt: 15000,
        int_rate: 7.2,
        dti: 11.5,
        term: 36,
        emp_length: 8,
        home_ownership: 'MORTGAGE',
        purpose: 'home_improvement',
        open_acc: 14,
        revol_bal: 4800,
        revol_util: 18.5,
      }
    },
    {
      id: 'borderline',
      label: 'Borderline Applicant (Target: Review)',
      description: '675 FICO, $68k Income, 24% DTI, $20k Loan',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      data: {
        applicant_name: 'Marcus Reynolds',
        credit_score: 675,
        annual_inc: 68000,
        loan_amnt: 20000,
        int_rate: 14.8,
        dti: 24.2,
        term: 36,
        emp_length: 4,
        home_ownership: 'RENT',
        purpose: 'debt_consolidation',
        open_acc: 10,
        revol_bal: 12500,
        revol_util: 64.0,
      }
    },
    {
      id: 'highrisk',
      label: 'High Risk Profile (Target: Reject)',
      description: '585 FICO, $40k Income, 39% DTI, $28k Loan',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      data: {
        applicant_name: 'Damon Bradley',
        credit_score: 585,
        annual_inc: 40000,
        loan_amnt: 28000,
        int_rate: 22.5,
        dti: 39.5,
        term: 60,
        emp_length: 1,
        home_ownership: 'RENT',
        purpose: 'credit_card',
        open_acc: 7,
        revol_bal: 22000,
        revol_util: 91.0,
      }
    }
  ];

  const [formData, setFormData] = useState({
    applicant_name: 'Sophia Vance',
    credit_score: 780,
    annual_inc: 125000,
    loan_amnt: 15000,
    int_rate: 7.2,
    dti: 11.5,
    term: 36,
    emp_length: 8,
    home_ownership: 'MORTGAGE',
    purpose: 'home_improvement',
    open_acc: 14,
    revol_bal: 4800,
    revol_util: 18.5,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePresetSelect = (presetData) => {
    setFormData(presetData);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Predict and save to SQLite audit trail
      const predRes = await api.predict(formData);

      // 2. Fetch SHAP attribution explanation
      const explainRes = await api.explain(formData);

      const completeAppRecord = {
        ...formData,
        id: predRes.application_id,
        risk_score: predRes.risk_score,
        decision: predRes.decision,
        risk_category: predRes.risk_category,
        base_risk: explainRes.base_risk,
        shap_factors: explainRes.top_factors,
        summary: explainRes.summary,
      };

      if (onApplicationEvaluated) {
        onApplicationEvaluated(completeAppRecord);
      }

      // Navigate to Decision Analysis page
      navigate(`/decision?id=${predRes.application_id}`);
    } catch (err) {
      console.error('Submission failed:', err);
      setError('Evaluation failed. Please verify the input values and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">
          New Loan Risk Evaluation
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Submit pre-origination loan and applicant characteristics for XGBoost scoring and SHAP analysis
        </p>
      </div>

      {/* Fast Presets Picker */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center space-x-2 text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Quick Evaluation Presets (Click to Auto-fill):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetSelect(p.data)}
              className="p-3 text-left rounded-xl bg-gray-950/70 hover:bg-gray-800/80 border border-gray-800 hover:border-indigo-500/50 transition-all cursor-pointer group"
            >
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1.5 ${p.badge}`}>
                {p.label}
              </span>
              <p className="text-xs text-gray-400 group-hover:text-gray-300">
                {p.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-gray-900/90 border border-gray-800 rounded-xl p-6 shadow-xl space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Applicant Profile */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-2 mb-4 pb-2 border-b border-gray-800">
            <Award className="w-4 h-4" />
            <span>Applicant Credit & Solvency</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Applicant Name
              </label>
              <input
                type="text"
                name="applicant_name"
                required
                value={formData.applicant_name}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. John Doe"
              />
            </div>

            {/* Credit Score */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-300">
                  Credit Score (FICO 300-850)
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {formData.credit_score}
                </span>
              </div>
              <input
                type="number"
                name="credit_score"
                min="300"
                max="850"
                required
                value={formData.credit_score}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Annual Income */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Gross Annual Income ($)
              </label>
              <input
                type="number"
                name="annual_inc"
                min="10000"
                step="1000"
                required
                value={formData.annual_inc}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* DTI */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Debt-to-Income Ratio (DTI %)
              </label>
              <input
                type="number"
                name="dti"
                min="0"
                max="60"
                step="0.1"
                required
                value={formData.dti}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Employment Length */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Employment Length (Years)
              </label>
              <select
                name="emp_length"
                value={formData.emp_length}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={0}>&lt; 1 Year</option>
                <option value={1}>1 Year</option>
                <option value={2}>2 Years</option>
                <option value={3}>3 Years</option>
                <option value={5}>5 Years</option>
                <option value={8}>8 Years</option>
                <option value={10}>10+ Years</option>
              </select>
            </div>

            {/* Home Ownership */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Home Ownership
              </label>
              <select
                name="home_ownership"
                value={formData.home_ownership}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="RENT">Rent</option>
                <option value="MORTGAGE">Mortgage</option>
                <option value="OWN">Own (No Mortgage)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Loan Structure */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-2 mb-4 pb-2 border-b border-gray-800">
            <DollarSign className="w-4 h-4" />
            <span>Requested Loan Terms</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Loan Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Loan Amount ($)
              </label>
              <input
                type="number"
                name="loan_amnt"
                min="1000"
                max="50000"
                step="500"
                required
                value={formData.loan_amnt}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Interest Rate */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Offered Interest Rate (%)
              </label>
              <input
                type="number"
                name="int_rate"
                min="5"
                max="30"
                step="0.1"
                required
                value={formData.int_rate}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Term */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Loan Term
              </label>
              <select
                name="term"
                value={formData.term}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={36}>36 Months (3 Years)</option>
                <option value={60}>60 Months (5 Years)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Loan Purpose
              </label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="debt_consolidation">Debt Consolidation</option>
                <option value="credit_card">Credit Card Refinance</option>
                <option value="home_improvement">Home Improvement</option>
                <option value="small_business">Small Business</option>
                <option value="major_purchase">Major Purchase</option>
                <option value="car">Car Financing</option>
              </select>
            </div>

            {/* Revolving Utilization */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Revolving Utilization (%)
              </label>
              <input
                type="number"
                name="revol_util"
                min="0"
                max="100"
                step="0.5"
                value={formData.revol_util}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Open Credit Lines */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Open Credit Lines
              </label>
              <input
                type="number"
                name="open_acc"
                min="1"
                max="40"
                value={formData.open_acc}
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Evaluating with LendingClub trained XGBoost v1.0 & TreeExplainer
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                <span>Computing SHAP Attributions...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Evaluate Loan & Explain Risk</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
