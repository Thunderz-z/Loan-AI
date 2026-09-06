import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  TrendingUp, 
  ArrowRight, 
  PlusCircle, 
  ShieldAlert, 
  Sparkles,
  BarChart2,
  Calendar,
  Layers
} from 'lucide-react';
import { api } from '../api';

export default function Dashboard({ onSelectApplication, onOpenCopilot }) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    total_applications: 10,
    approval_rate: 40.0,
    average_risk: 26.5,
    pending_reviews: 3
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [insightsRes, appsRes] = await Promise.all([
          api.getInsights(),
          api.getApplications('', 'ALL', 6, 0)
        ]);
        if (insightsRes?.metrics) {
          setMetrics(insightsRes.metrics);
        }
        if (appsRes?.applications) {
          setRecentApplications(appsRes.applications);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'APPROVE':
        return {
          badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          icon: CheckCircle2,
          label: 'APPROVE'
        };
      case 'REVIEW':
        return {
          badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          icon: AlertCircle,
          label: 'REVIEW'
        };
      case 'REJECT':
      default:
        return {
          badge: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          icon: XCircle,
          label: 'REJECT'
        };
    }
  };

  const handleInspect = (app) => {
    if (onSelectApplication) {
      onSelectApplication(app);
    }
    navigate(`/decision?id=${app.id}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Hero Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">
            Loan Underwriting & Risk Overview
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time LendingClub XGBoost predictive scoring with transparent SHAP explanations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/apply')}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Evaluation</span>
          </button>
        </div>
      </div>

      {/* Core Business Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total Applications
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics.total_applications}
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              Logged in SQLite
            </span>
          </div>
        </div>

        {/* Automated Approval Rate */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Approval Rate
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              {metrics.approval_rate}%
            </span>
            <span className="text-xs text-gray-400">
              Risk &lt; 15% Tier
            </span>
          </div>
        </div>

        {/* Portfolio Average Risk */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Avg Portfolio Risk
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics.average_risk}%
            </span>
            <span className="text-xs text-gray-400">
              XGBoost Default Probability
            </span>
          </div>
        </div>

        {/* Underwriter Reviews Needed */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Pending Reviews
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">
              {metrics.pending_reviews}
            </span>
            <span className="text-xs text-gray-400">
              15% - 30% Risk Band
            </span>
          </div>
        </div>
      </div>

      {/* 3-Tier Business Decision Logic Visualizer */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/40 border border-gray-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              3-Tier Underwriting Decision Policy
            </h3>
          </div>
          <span className="text-xs text-gray-400">Pre-origination non-binary risk calibration</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Tier 1: Approve */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-emerald-300 uppercase">APPROVE</span>
                <span className="text-xs font-mono font-semibold text-emerald-400">&lt; 15% Risk</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Low default probability. Clear path to prime financing with automatic credit approval.
              </p>
            </div>
          </div>

          {/* Tier 2: Review */}
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-amber-300 uppercase">REVIEW</span>
                <span className="text-xs font-mono font-semibold text-amber-400">15% - 30% Risk</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Borderline profile. Human underwriter inspection with What-If simulations to structure viable terms.
              </p>
            </div>
          </div>

          {/* Tier 3: Reject */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-rose-300 uppercase">REJECT</span>
                <span className="text-xs font-mono font-semibold text-rose-400">&gt; 30% Risk</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Elevated credit stress. Clear Adverse Action Notice generated citing top SHAP negative factors.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications Audit Table */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Recent Evaluated Applications</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Click any application to inspect its full SHAP attribution waterfall and test What-If simulations
            </p>
          </div>

          <button
            onClick={() => navigate('/audit')}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>View Full Audit History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-950/70 border-b border-gray-800 text-gray-400 uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="px-5 py-3">Applicant & ID</th>
                <th className="px-5 py-3">Loan Amount</th>
                <th className="px-5 py-3">Credit Score</th>
                <th className="px-5 py-3">DTI</th>
                <th className="px-5 py-3">Predicted Risk</th>
                <th className="px-5 py-3">Recommendation</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {recentApplications.map((app) => {
                const style = getDecisionBadge(app.decision);
                const IconComponent = style.icon;

                return (
                  <tr 
                    key={app.id} 
                    className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                    onClick={() => handleInspect(app)}
                  >
                    {/* Applicant & ID */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{app.applicant_name}</div>
                      <div className="text-[11px] font-mono text-gray-400">{app.id}</div>
                    </td>

                    {/* Loan Amount & Purpose */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-200">${Number(app.loan_amnt).toLocaleString()}</div>
                      <div className="text-[11px] text-gray-400 capitalize">
                        {String(app.purpose).replace('_', ' ')}
                      </div>
                    </td>

                    {/* Credit Score */}
                    <td className="px-5 py-4">
                      <span className="font-mono font-medium text-gray-200">{app.credit_score}</span>
                    </td>

                    {/* DTI */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-gray-300">{Number(app.dti).toFixed(1)}%</span>
                    </td>

                    {/* Predicted Risk */}
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white text-sm">
                          {Number(app.risk_score).toFixed(1)}%
                        </span>
                        <div className="w-14 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              app.risk_score < 15 ? 'bg-emerald-500' : app.risk_score <= 30 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, app.risk_score)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Decision Badge */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${style.badge}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{style.label}</span>
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(app);
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-medium border border-gray-700/60 transition-colors"
                      >
                        <BarChart2 className="w-3.5 h-3.5 mr-1" />
                        <span>Inspect SHAP</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
