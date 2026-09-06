import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShieldCheck, 
  PlusCircle, 
  BarChart3, 
  History, 
  Sparkles, 
  Activity, 
  PieChart, 
  Server
} from 'lucide-react';

export default function Header({ systemHealth, onOpenCopilot, activeAppCount = 0 }) {
  const isReal = systemHealth?.backend_mode === 'real';

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-[#0d131f]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <NavLink to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/35 transition-all">
                <div className="w-full h-full bg-[#0b0f17] rounded-[10px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xl tracking-tight text-white">LoanLens</span>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
                    XAI
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block">Explainable Loan Risk & Decision Platform</p>
              </div>
            </NavLink>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-gray-800/80 text-white border border-gray-700/60 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`
              }
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/apply"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-gray-800/80 text-white border border-gray-700/60 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`
              }
            >
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              <span>New Application</span>
            </NavLink>

            <NavLink
              to="/decision"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-gray-800/80 text-white border border-gray-700/60 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`
              }
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Decision Analysis</span>
            </NavLink>

            <NavLink
              to="/audit"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-gray-800/80 text-white border border-gray-700/60 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`
              }
            >
              <History className="w-4 h-4 text-amber-400" />
              <span>Audit History</span>
            </NavLink>

            <NavLink
              to="/insights"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-gray-800/80 text-white border border-gray-700/60 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`
              }
            >
              <PieChart className="w-4 h-4 text-violet-400" />
              <span>Insights</span>
            </NavLink>
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center space-x-3">
            {/* Backend Status Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1.5 rounded-full bg-gray-900/80 border border-gray-800 text-xs">
              <span className={`w-2 h-2 rounded-full ${isReal ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`}></span>
              <span className="text-gray-300 font-medium">
                {isReal ? 'XGBoost ML (Live)' : 'XGBoost Simulator'}
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-indigo-400 font-medium">SHAP Active</span>
            </div>

            {/* AI Decision Copilot Button */}
            <button
              onClick={onOpenCopilot}
              className="relative inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/25 transition-all active:scale-95"
              title="Open AI Decision Assistant"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
              <span>AI Copilot</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
