import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  BarChart2, 
  Sparkles,
  Database,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../api';

export default function AuditHistory({ onSelectApplication, onOpenCopilot }) {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('ALL');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await api.getApplications(search, decisionFilter, 100, 0);
        setApplications(res?.applications || []);
      } catch (err) {
        console.error('Failed to load audit history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [search, decisionFilter]);

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

  const handleExportCsv = () => {
    if (!applications.length) return;
    const headers = ['ID', 'Applicant', 'Credit Score', 'Annual Income', 'Loan Amount', 'Interest Rate', 'DTI', 'Risk Score', 'Decision', 'Date'];
    const rows = applications.map(a => [
      a.id,
      `"${a.applicant_name}"`,
      a.credit_score,
      a.annual_inc,
      a.loan_amnt,
      a.int_rate,
      a.dti,
      a.risk_score,
      a.decision,
      `"${a.created_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LoanLens_Audit_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInspect = (app) => {
    if (onSelectApplication) {
      onSelectApplication(app);
    }
    navigate(`/decision?id=${app.id}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">
              Audit History & Decision Logs
            </h1>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">
              <Database className="w-3 h-3 mr-1" />
              SQLite backend/loanlens.db
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Complete regulatory audit trail of model predictions, SHAP attribution vectors, and underwriter actions
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={!applications.length}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-colors shadow-sm disabled:opacity-40"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Decision Filter Pills */}
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-gray-500 flex items-center">
            <Filter className="w-3 h-3 mr-1" /> Filter:
          </span>
          {['ALL', 'APPROVE', 'REVIEW', 'REJECT'].map((status) => (
            <button
              key={status}
              onClick={() => setDecisionFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                decisionFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-950 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 space-y-2">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Querying SQLite audit database...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No loan applications found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-950/70 border-b border-gray-800 text-gray-400 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3">ID & Date</th>
                  <th className="px-5 py-3">Applicant Name</th>
                  <th className="px-5 py-3">Credit Score</th>
                  <th className="px-5 py-3">Annual Income</th>
                  <th className="px-5 py-3">Loan Amount</th>
                  <th className="px-5 py-3">DTI</th>
                  <th className="px-5 py-3">Risk %</th>
                  <th className="px-5 py-3">Recommendation</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {applications.map((app) => {
                  const style = getDecisionBadge(app.decision);
                  const IconComponent = style.icon;

                  return (
                    <tr
                      key={app.id}
                      onClick={() => handleInspect(app)}
                      className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                    >
                      {/* ID & Date */}
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-white text-xs">{app.id}</div>
                        <div className="text-[10px] text-gray-500">{app.created_at || 'Just now'}</div>
                      </td>

                      {/* Applicant */}
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-gray-200">{app.applicant_name}</span>
                      </td>

                      {/* Credit Score */}
                      <td className="px-5 py-3.5 font-mono text-gray-300">
                        {app.credit_score}
                      </td>

                      {/* Annual Income */}
                      <td className="px-5 py-3.5 font-mono text-gray-300">
                        ${Number(app.annual_inc).toLocaleString()}
                      </td>

                      {/* Loan Amount */}
                      <td className="px-5 py-3.5 font-mono text-gray-300">
                        ${Number(app.loan_amnt).toLocaleString()}
                      </td>

                      {/* DTI */}
                      <td className="px-5 py-3.5 font-mono text-gray-300">
                        {Number(app.dti).toFixed(1)}%
                      </td>

                      {/* Risk Score */}
                      <td className="px-5 py-3.5 font-mono font-bold text-white">
                        {Number(app.risk_score).toFixed(1)}%
                      </td>

                      {/* Recommendation */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.badge}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                          <span>{style.label}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspect(app);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-medium border border-gray-700/60 transition-colors"
                        >
                          SHAP View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
