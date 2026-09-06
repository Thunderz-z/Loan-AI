import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import AiAssistantDrawer from './components/AiAssistantDrawer';
import Dashboard from './pages/Dashboard';
import NewApplication from './pages/NewApplication';
import DecisionAnalysis from './pages/DecisionAnalysis';
import AuditHistory from './pages/AuditHistory';
import Insights from './pages/Insights';
import { api } from './api';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [systemHealth, setSystemHealth] = useState(null);
  const [currentApplication, setCurrentApplication] = useState(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  useEffect(() => {
    async function initHealth() {
      try {
        const health = await api.getHealth();
        setSystemHealth(health);
      } catch (err) {
        console.warn('Health check warning:', err);
      }
    }
    initHealth();
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#0b0f17] text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
        {/* Persistent App Header */}
        <Header 
          systemHealth={systemHealth} 
          onOpenCopilot={() => setIsCopilotOpen(true)}
        />

        {/* Main Routed Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Routes>
            <Route 
              path="/" 
              element={
                <Dashboard 
                  onSelectApplication={(app) => setCurrentApplication(app)}
                  onOpenCopilot={() => setIsCopilotOpen(true)}
                />
              } 
            />
            <Route 
              path="/apply" 
              element={
                <NewApplication 
                  onApplicationEvaluated={(app) => setCurrentApplication(app)}
                />
              } 
            />
            <Route 
              path="/decision" 
              element={
                <DecisionAnalysis 
                  currentApplication={currentApplication}
                  onOpenCopilot={() => setIsCopilotOpen(true)}
                />
              } 
            />
            <Route 
              path="/audit" 
              element={
                <AuditHistory 
                  onSelectApplication={(app) => setCurrentApplication(app)}
                  onOpenCopilot={() => setIsCopilotOpen(true)}
                />
              } 
            />
            <Route 
              path="/insights" 
              element={<Insights />} 
            />
          </Routes>
        </main>

        {/* Floating Quick Copilot Trigger Button (Bottom-Right) */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="group flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white font-semibold shadow-2xl shadow-indigo-600/40 hover:shadow-indigo-500/60 hover:scale-105 active:scale-95 transition-all"
            title="Open LoanLens Copilot"
          >
            <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              AI Decision Copilot
            </span>
          </button>
        </div>

        {/* Persistent AI Assistant Slide-over Drawer */}
        <AiAssistantDrawer
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          currentApplication={currentApplication}
        />

        {/* Subtle Footer */}
        <footer className="border-t border-gray-800/80 py-6 text-center text-xs text-gray-500 bg-[#090d15]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>LoanLens: Explainable AI Loan Risk & Decision Platform</span>
            <span className="text-gray-600">
              LendingClub Dataset • XGBoost Risk Model v1.0 • SHAP TreeExplainer
            </span>
          </div>
        </footer>
      </div>
    </Router>
  );
}
