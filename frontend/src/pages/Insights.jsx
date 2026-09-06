import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  PieChart, 
  TrendingUp, 
  ShieldAlert, 
  Cpu, 
  CheckCircle2, 
  BookOpen,
  Layers,
  Database
} from 'lucide-react';
import { api } from '../api';

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      setLoading(true);
      try {
        const res = await api.getInsights();
        setData(res);
      } catch (err) {
        console.error('Failed to load insights:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInsights();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 space-y-2">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">Calculating portfolio analytics & risk distributions...</p>
      </div>
    );
  }

  const decisionData = data?.decision_distribution || [
    { name: 'Approve', value: 4, color: '#10b981' },
    { name: 'Review', value: 3, color: '#f59e0b' },
    { name: 'Reject', value: 3, color: '#ef4444' }
  ];

  const riskBands = data?.risk_distribution || [
    { range: '0% - 15% (Low)', count: 4, color: '#10b981' },
    { range: '15% - 30% (Med)', count: 3, color: '#f59e0b' },
    { range: '30% - 50% (High)', count: 2, color: '#ef4444' },
    { range: '50%+ (Severe)', count: 1, color: '#dc2626' }
  ];

  const featureImportance = data?.feature_importance || [
    { feature: 'Debt-to-Income (DTI)', importance: 0.28 },
    { feature: 'Credit Score (FICO)', importance: 0.24 },
    { feature: 'Revolving Utilization', importance: 0.18 },
    { feature: 'Interest Rate', importance: 0.14 },
    { feature: 'Loan-to-Income', importance: 0.11 },
    { feature: 'Employment Length', importance: 0.05 }
  ];

  const purposes = data?.top_purposes || [
    { purpose: 'Debt Consolidation', count: 5 },
    { purpose: 'Credit Card', count: 3 },
    { purpose: 'Home Improvement', count: 2 },
    { purpose: 'Small Business', count: 1 }
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">
          Portfolio Risk Analytics & Model Insights
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Aggregate governance metrics, decision distribution, and global feature importance
        </p>
      </div>

      {/* Row 1: Decision Distribution & Risk Band Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Decision Breakdown Donut Chart */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="text-base font-semibold text-white">Underwriting Decision Distribution</h3>
            <p className="text-xs text-gray-400">Proportion of applications routed to Approve, Review, or Reject</p>
          </div>

          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={decisionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {decisionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-xs text-gray-300 font-medium">{value}</span>}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Score Frequency Distribution */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="text-base font-semibold text-white">Predicted Risk Exposure Bins</h3>
            <p className="text-xs text-gray-400">Application counts segmented across the 3-tier risk continuum</p>
          </div>

          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskBands} margin={{ top: 15, right: 15, left: -15, bottom: 20 }}>
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }} 
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis 
                  tick={{ fill: '#94a3b8', fontSize: 11 }} 
                  axisLine={{ stroke: '#334155' }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskBands.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Global Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global SHAP / Tree Importance */}
        <div className="lg:col-span-2 bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg">
          <div className="border-b border-gray-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Global Feature Importance (XGBoost)</h3>
              <p className="text-xs text-gray-400">Relative contribution weight of borrower metrics on default prediction</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">
              24 Model Features
            </span>
          </div>

          <div className="mt-5 space-y-3.5">
            {featureImportance.map((f, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-200">{f.feature}</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {(f.importance * 100).toFixed(0)}% Weight
                  </span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-700"
                    style={{ width: `${(f.importance / 0.35) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Architecture & Defense Summary Card */}
        <div className="lg:col-span-1 bg-gradient-to-b from-gray-900 to-indigo-950/30 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-4 h-4" />
              <span>Model Governance & Defense</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">Technical Defensibility</h3>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              Built on historical LendingClub records using strictly pre-origination variables to prevent data leakage.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Algorithm:</span>
                <span className="text-white font-medium">XGBoost Classifier + SHAP TreeExplainer</span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Target Variable:</span>
                <span className="text-white font-medium">0 = Fully Paid, 1 = Default / Charged Off</span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Decoupled Decision Engine:</span>
                <span className="text-white font-medium">Configurable 15% / 30% business thresholds</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-800 text-[11px] text-gray-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Compliant with Explainable AI (XAI) auditing standards</span>
          </div>
        </div>
      </div>
    </div>
  );
}
