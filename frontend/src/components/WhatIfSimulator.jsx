import { useState, useEffect } from 'react';
import { Sliders, RefreshCw, TrendingDown, TrendingUp, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function WhatIfSimulator({ application }) {
  // State of modified sliders
  const [modified, setModified] = useState({
    annual_inc: application?.annual_inc || 75000,
    loan_amnt: application?.loan_amnt || 15000,
    credit_score: application?.credit_score || 700,
    dti: application?.dti || 20,
    int_rate: application?.int_rate || 12,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Sync state if application changes
  useEffect(() => {
    if (application) {
      setModified({
        annual_inc: application.annual_inc || 75000,
        loan_amnt: application.loan_amnt || 15000,
        credit_score: application.credit_score || 700,
        dti: application.dti || 20,
        int_rate: application.int_rate || 12,
      });
      setResult(null);
    }
  }, [application]);

  // Execute What-If when slider changes (debounced)
  useEffect(() => {
    if (!application) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.whatIf(application, modified);
        setResult(res);
      } catch (err) {
        console.error('What-if error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [modified, application]);

  if (!application) return null;

  const handleReset = () => {
    setModified({
      annual_inc: application.annual_inc,
      loan_amnt: application.loan_amnt,
      credit_score: application.credit_score,
      dti: application.dti,
      int_rate: application.int_rate,
    });
  };

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'APPROVE':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'REVIEW':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'REJECT':
      default:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-white">Interactive What-If Scenario Simulator</h3>
              {loading && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
            </div>
            <p className="text-xs text-gray-400">
              Adjust parameters in real-time to simulate decision and risk threshold shifts
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Annual Income */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-300 font-medium">Annual Income</span>
            <span className="font-bold text-cyan-400 font-mono">
              ${Number(modified.annual_inc).toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min="20000"
            max="250000"
            step="2500"
            value={modified.annual_inc}
            onChange={(e) => setModified({ ...modified, annual_inc: Number(e.target.value) })}
            className="w-full accent-cyan-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>$20k</span>
            <span>$125k</span>
            <span>$250k</span>
          </div>
        </div>

        {/* Loan Amount */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-300 font-medium">Requested Loan Amount</span>
            <span className="font-bold text-indigo-400 font-mono">
              ${Number(modified.loan_amnt).toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min="2000"
            max="45000"
            step="1000"
            value={modified.loan_amnt}
            onChange={(e) => setModified({ ...modified, loan_amnt: Number(e.target.value) })}
            className="w-full accent-indigo-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>$2k</span>
            <span>$25k</span>
            <span>$45k</span>
          </div>
        </div>

        {/* Credit Score */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-300 font-medium">Credit Score (FICO)</span>
            <span className="font-bold text-emerald-400 font-mono">
              {modified.credit_score}
            </span>
          </div>
          <input
            type="range"
            min="500"
            max="850"
            step="5"
            value={modified.credit_score}
            onChange={(e) => setModified({ ...modified, credit_score: Number(e.target.value) })}
            className="w-full accent-emerald-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>500 Poor</span>
            <span>670 Good</span>
            <span>850 Prime</span>
          </div>
        </div>

        {/* DTI */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-300 font-medium">Debt-to-Income (DTI %)</span>
            <span className="font-bold text-amber-400 font-mono">
              {Number(modified.dti).toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="0.5"
            value={modified.dti}
            onChange={(e) => setModified({ ...modified, dti: Number(e.target.value) })}
            className="w-full accent-amber-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>5% Low</span>
            <span>25% Moderate</span>
            <span>50% High</span>
          </div>
        </div>
      </div>

      {/* Live Simulation Results Comparison Card */}
      {result && (
        <div className="mt-6 p-4 rounded-xl bg-gray-950/80 border border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Before vs After */}
            <div className="flex items-center space-x-4">
              {/* Baseline */}
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-gray-400">Baseline</span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-lg font-bold text-gray-300">
                    {result.original.risk_score}%
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getDecisionBadge(result.original.decision)}`}>
                    {result.original.decision}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="p-1 rounded-full bg-gray-800 text-gray-400">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Modified */}
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-indigo-400">Simulated</span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-xl font-extrabold text-white">
                    {result.modified.risk_score}%
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getDecisionBadge(result.modified.decision)}`}>
                    {result.modified.decision}
                  </span>
                </div>
              </div>
            </div>

            {/* Delta Indicator */}
            <div className="flex items-center justify-end">
              {result.delta.improved ? (
                <div className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <TrendingDown className="w-4 h-4" />
                  <span>{Math.abs(result.delta.risk_diff).toFixed(1)}% Risk Reduction</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  <span>+{result.delta.risk_diff.toFixed(1)}% Risk Increase</span>
                </div>
              )}
            </div>
          </div>

          {/* Decision transition note */}
          {result.delta.decision_changed && (
            <div className="mt-3 pt-3 border-t border-gray-800/80 flex items-center space-x-2 text-xs text-cyan-300 font-medium">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Simulated parameters successfully shifted recommendation tier from{' '}
                <strong className="text-white">{result.original.decision}</strong> to{' '}
                <strong className="text-cyan-400">{result.modified.decision}</strong>!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
