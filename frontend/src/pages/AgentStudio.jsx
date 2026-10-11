import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Send, 
  Cpu, 
  Key, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp, 
  Layers, 
  FileText, 
  Sliders, 
  Copy, 
  Check, 
  ChevronDown, 
  UserCheck, 
  Zap
} from 'lucide-react';
import RiskGauge from '../components/RiskGauge';
import { api } from '../api';

const MODELS = [
  { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', desc: 'Analytical Reasoning & Parameter Tuning' },
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', desc: 'High Capacity · Institutional Policy' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'Groq LPU Versatile Engine' },
];

export default function AgentStudio({ onSelectApplication }) {
  const [searchParams] = useSearchParams();
  const initialAppId = searchParams.get('id');

  // Application State
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);

  // Model & Groq Key State
  const [selectedModel, setSelectedModel] = useState('qwen/qwen3.8-27b');
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('loanlens_groq_api_key') || '');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState(groqKey);
  const [config, setConfig] = useState(null);

  // Chat / Agent Console State
  const [messages, setMessages] = useState([]);
  const [promptInput, setPromptInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);

  // Active Live Canvas State (Driven by Agent Execution)
  const [activeSimulation, setActiveSimulation] = useState(null);
  const [activeToolType, setActiveToolType] = useState('optimization');
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [appliedTermsSuccess, setAppliedTermsSuccess] = useState(false);

  const messagesEndRef = useRef(null);

  // Fetch applications & backend config on mount
  useEffect(() => {
    async function init() {
      setLoadingApp(true);
      try {
        const [appsRes, confRes] = await Promise.all([
          api.getApplications('', 'ALL', 30, 0),
          api.getConfig()
        ]);
        setConfig(confRes);
        const appList = appsRes.applications || [];
        setApplications(appList);

        // Pick requested or first app
        let target = null;
        if (initialAppId) {
          target = appList.find(a => a.id === initialAppId);
        }
        if (!target && appList.length > 0) {
          target = appList[0];
        }
        setSelectedApp(target);

        // Seed initial greeting message
        if (target) {
          setMessages([
            {
              role: 'assistant',
              content: `### 🤖 Autonomous AI Underwriter Studio Ready\n\nI am initialized with **${MODELS[0].name}** and connected to the **XGBoost TreeExplainer** pipeline.\n\nCurrently evaluating **${target.applicant_name}** (${target.id}) with a baseline risk of **${target.risk_score}%** (**${target.decision}**).\n\nUse the directives below or ask me any underwriting request:`,
              tool_calls: [
                {
                  tool: "initialize_agent_session",
                  applicant: target.applicant_name,
                  baseline_risk: `${target.risk_score}%`,
                  policy: "<15% Approve, 15-30% Review, >30% Reject"
                }
              ],
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to initialize Agent Studio:', err);
      } finally {
        setLoadingApp(false);
      }
    }
    init();
  }, [initialAppId]);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentLoading]);

  // Handle switching applicant
  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setActiveSimulation(null);
    setAppliedTermsSuccess(false);
    if (onSelectApplication) onSelectApplication(app);

    setMessages(prev => [
      ...prev,
      {
        role: 'system',
        content: `Switched underwriting target to **${app.applicant_name}** (${app.id}). Current risk: **${app.risk_score}%** (${app.decision}).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Save Groq key
  const handleSaveKey = () => {
    const cleanKey = keyInput.trim();
    setGroqKey(cleanKey);
    localStorage.setItem('loanlens_groq_api_key', cleanKey);
    setIsKeyModalOpen(false);
  };

  // Execute Agent Query
  const handleSendQuery = async (queryText) => {
    const text = (queryText || promptInput).trim();
    if (!text || agentLoading || !selectedApp) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setPromptInput('');
    setAgentLoading(true);
    setAppliedTermsSuccess(false);

    try {
      const response = await api.queryAgent(
        text,
        selectedApp,
        selectedApp.id,
        selectedModel,
        groqKey
      );

      const assistantMsg = {
        role: 'assistant',
        content: response.reply,
        tool_calls: response.tool_calls || [],
        execution_source: response.execution_source,
        model_used: response.model_used,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If simulation or optimization result returned, update the live canvas!
      if (response.simulation_result) {
        setActiveSimulation(response.simulation_result);
        setActiveToolType(response.tool_type || 'optimization');
      }

      // If a new applicant was created or database updated, refresh list & target selection
      if (
        response.tool_type === 'create_application' || 
        response.tool_type === 'update_application' ||
        response.application_evaluated ||
        text.toLowerCase().includes('create') || 
        text.toLowerCase().includes('new loan') ||
        text.toLowerCase().includes('new load') ||
        text.toLowerCase().includes('make a new') ||
        text.toLowerCase().includes('underwrite') ||
        text.toLowerCase().includes('apply')
      ) {
        const appsRes = await api.getApplications('', 'ALL', 50, 0);
        if (appsRes.applications?.length > 0) {
          setApplications(appsRes.applications);
          if (response.application_evaluated?.id) {
            const found = appsRes.applications.find(a => a.id === response.application_evaluated.id);
            if (found) {
              setSelectedApp(found);
              if (onSelectApplication) onSelectApplication(found);
            }
          }
        }
      }
    } catch (err) {
      console.error('Agent query error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'An error occurred during agent inference. Please verify network connectivity or model parameters.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setAgentLoading(false);
    }
  };

  const handleCopyNotice = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const handleApplyTerms = async () => {
    if (!activeSimulation?.modified_applicant || !selectedApp) return;
    const updated = {
      ...selectedApp,
      ...activeSimulation.modified_applicant,
      risk_score: activeSimulation.simulated.risk_score,
      decision: activeSimulation.simulated.decision,
      risk_category: activeSimulation.simulated.risk_category
    };

    try {
      await api.updateApplication(selectedApp.id, updated);
      const appsRes = await api.getApplications('', 'ALL', 50, 0);
      setApplications(appsRes.applications || []);
    } catch (e) {
      console.warn('Persist error:', e);
    }

    setSelectedApp(updated);
    setAppliedTermsSuccess(true);
    if (onSelectApplication) onSelectApplication(updated);
  };

  if (loadingApp) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Initializing Autonomous AI Underwriter Studio...</p>
      </div>
    );
  }

  const hasKey = Boolean(groqKey || config?.has_groq_key);

  return (
    <div className="space-y-5 pb-16">
      {/* Studio Top Control Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-[#111726] to-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Brand & Studio Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-600 p-0.5 shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight m-0">
                  Autonomous AI Underwriting Studio
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Agentic Control
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Full-Page Autonomous Decision Engine • Algorithmic Counterfactual Optimization & Groq LPU
              </p>
            </div>
          </div>

          {/* Model Selector, Applicant Selector & Key Setup */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Applicant Selector Dropdown */}
            <div className="relative">
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">
                Target Applicant
              </label>
              <div className="relative">
                <select
                  value={selectedApp?.id || ''}
                  onChange={(e) => {
                    const found = applications.find(a => a.id === e.target.value);
                    if (found) handleSelectApp(found);
                  }}
                  className="appearance-none bg-gray-950 border border-gray-700/80 hover:border-gray-600 text-white text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.applicant_name} ({app.id}) — {app.risk_score}% ({app.decision})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Model Selector Dropdown */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1 flex items-center space-x-1">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>AI Reasoning Model</span>
              </label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="appearance-none bg-gray-950 border border-indigo-500/40 hover:border-indigo-500 text-indigo-200 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer shadow-sm"
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Groq API Key Configuration Button */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">
                Groq LPU Acceleration
              </label>
              <button
                onClick={() => {
                  setKeyInput(groqKey);
                  setIsKeyModalOpen(true);
                }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  hasKey
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
                }`}
                title="Configure Groq API Key for live inference"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{hasKey ? 'Groq Active' : 'Enter Groq Key'}</span>
                {hasKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Selected Applicant Live Metric HUD */}
        {selectedApp && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-gray-800/80">
            <div className="p-2.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">FICO Score</span>
              <span className="text-sm font-extrabold text-cyan-400 font-mono">{selectedApp.credit_score}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Gross Income</span>
              <span className="text-sm font-extrabold text-white font-mono">${Number(selectedApp.annual_inc).toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Requested Loan</span>
              <span className="text-sm font-extrabold text-white font-mono">${Number(selectedApp.loan_amnt).toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">DTI Ratio</span>
              <span className="text-sm font-extrabold text-amber-400 font-mono">{Number(selectedApp.dti).toFixed(1)}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Baseline Risk</span>
              <span className={`text-sm font-extrabold font-mono ${
                selectedApp.risk_score < 15 ? 'text-emerald-400' : selectedApp.risk_score <= 30 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {selectedApp.risk_score}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950/70 border border-gray-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Policy Tier</span>
                <span className="text-xs font-bold text-white uppercase">{selectedApp.decision}</span>
              </div>
              <span className={`w-3 h-3 rounded-full ${
                selectedApp.decision === 'APPROVE' ? 'bg-emerald-500' : selectedApp.decision === 'REVIEW' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
            </div>
          </div>
        )}
      </div>


      {/* Main Split Layout: Agent Console (Left) + Autonomous Decision Canvas (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: Autonomous Agent Console (5 Cols) */}
        <div className="lg:col-span-5 bg-gray-900/90 border border-gray-800 rounded-2xl flex flex-col h-[750px] shadow-xl overflow-hidden">
          
          {/* Console Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/40">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">
                <Zap className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Agent Directive Console</h3>
                <span className="text-[11px] text-gray-400 font-mono">
                  {selectedModel} • {hasKey ? 'Groq LPU' : 'Autonomous Engine'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (selectedApp) {
                  setMessages([
                    {
                      role: 'assistant',
                      content: `Console reset. Evaluating **${selectedApp.applicant_name}** (${selectedApp.id}). Risk: **${selectedApp.risk_score}%** (${selectedApp.decision}). What goal should I execute?`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                }
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Reset Conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick One-Click Underwriting Directives */}
          <div className="p-3 border-b border-gray-800/80 bg-gray-950/20">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-2">
              Full-Stack Autonomous Actions
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleSendQuery("Query database: Show all applications currently in review status.")}
                disabled={agentLoading}
                className="px-2 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center space-x-1"
              >
                <span>🗄️ Query DB: Pending Loans</span>
              </button>

              <button
                onClick={() => handleSendQuery("Create a new approved car loan for Marcus Vance: $22,000 requested, 770 credit score, 36 months, low DTI.")}
                disabled={agentLoading}
                className="px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center space-x-1"
              >
                <span>➕ Create Approved Auto Loan</span>
              </button>

              <button
                onClick={() => handleSendQuery("Optimize this loan terms to find the minimum feasible default risk and best achievable terms.")}
                disabled={agentLoading}
                className="px-2 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center space-x-1"
              >
                <span>🎯 Auto-Optimize Terms</span>
              </button>

              <button
                onClick={() => handleSendQuery("Summarize portfolio risk metrics from the database.")}
                disabled={agentLoading}
                className="px-2 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center space-x-1"
              >
                <span>📊 Portfolio DB Stats</span>
              </button>

              <button
                onClick={() => handleSendQuery("Simulate a macroeconomic stress test with a 20% drop in annual income.")}
                disabled={agentLoading}
                className="px-2 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center space-x-1"
              >
                <span>📉 20% Stress Test</span>
              </button>

              <button
                onClick={() => handleSendQuery("Generate a regulatory FCRA and ECOA compliant adverse action notice explaining reasons for denial.")}
                disabled={agentLoading}
                className="px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center space-x-1"
              >
                <span>⚖️ Adverse Action Notice</span>
              </button>
            </div>
          </div>

          {/* Conversation Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 mb-1 px-1">
                  <span>{msg.role === 'user' ? 'Credit Officer' : selectedModel}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {msg.execution_source === 'groq_lpu' && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      Groq LPU
                    </span>
                  )}
                </div>

                <div 
                  className={`max-w-[95%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                      : 'bg-gray-950/80 border border-gray-800 text-gray-200 shadow-inner'
                  }`}
                >
                  {/* Tool execution badge demonstrating full stack integration */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="mb-2.5 pb-2 border-b border-gray-800/80 space-y-1">
                      <div className="flex items-center space-x-1.5 text-[11px] text-cyan-300 font-mono">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold">Tool Executed: {msg.tool_calls[0].tool}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-gray-400 font-mono">
                        <span className="text-cyan-400 font-semibold">1. UI</span>
                        <span className="text-gray-600">➔</span>
                        <span className="text-emerald-400 font-semibold">2. Express API</span>
                        <span className="text-gray-600">➔</span>
                        <span className="text-amber-400 font-semibold">3. Database</span>
                        <span className="text-gray-600">➔</span>
                        <span className="text-violet-400 font-semibold">4. Agent Engine</span>
                      </div>
                    </div>
                  )}

                  {/* Body text with rudimentary markdown support */}
                  <div className="space-y-2 whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {agentLoading && (
              <div className="flex items-start space-x-2 text-xs text-gray-400 bg-gray-950/50 p-3 rounded-xl border border-gray-800">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Agent reasoning in progress...</span>
                  <p className="text-[11px] text-gray-400">
                    Running TreeExplainer inference and counterfactual sensitivity calculations.
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Form */}
          <div className="p-3 border-t border-gray-800 bg-gray-950/40">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask the AI to do anything with this loan..."
                disabled={agentLoading}
                className="flex-1 bg-gray-950 border border-gray-700/80 hover:border-gray-600 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!promptInput.trim() || agentLoading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white disabled:opacity-40 transition-all shadow-md"
                title="Send instruction to AI"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Live Autonomous Decision Canvas (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Main Inspection Canvas Card */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
            
            {/* Canvas Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-800 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Live Autonomous Decision Canvas
                  </h2>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {activeToolType === 'optimization' ? 'Counterfactual Optimization' : activeToolType === 'stress_test' ? 'Macro Stress Test' : 'ML Feedback Loop'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Visual before-and-after sensitivity and parameter shifts executed by the AI model
                </p>
              </div>

              {activeSimulation && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleApplyTerms}
                    disabled={appliedTermsSuccess}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all disabled:bg-emerald-900/50"
                  >
                    {appliedTermsSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <UserCheck className="w-3.5 h-3.5" />}
                    <span>{appliedTermsSuccess ? 'Terms Applied' : 'Accept AI Terms'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Before vs After Risk Gauge Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-gray-950/60 border border-gray-800/80 rounded-2xl p-5">
              
              {/* Baseline Risk Column */}
              <div className="flex flex-col items-center text-center p-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  1. Baseline Original State
                </span>
                <span className="text-xs text-gray-500 mb-3">
                  Pre-origination parameters
                </span>

                <RiskGauge 
                  riskScore={selectedApp.risk_score} 
                  decision={selectedApp.decision} 
                  size={200} 
                  showDetails={false}
                />

                <div className="mt-3 flex items-center space-x-2">
                  <span className="text-xs text-gray-400">Decision Tier:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    selectedApp.decision === 'APPROVE' 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : selectedApp.decision === 'REVIEW' 
                      ? 'bg-amber-500/20 text-amber-300' 
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {selectedApp.decision}
                  </span>
                </div>
              </div>

              {/* AI Optimized State Column */}
              <div className="flex flex-col items-center text-center p-3 border-t sm:border-t-0 sm:border-l border-gray-800">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>2. AI Counterfactual Result</span>
                </span>
                <span className="text-xs text-gray-500 mb-3">
                  {activeSimulation ? 'Evaluated with XGBoost pipeline' : 'Awaiting AI directive execution'}
                </span>

                {activeSimulation ? (
                  <>
                    <RiskGauge 
                      riskScore={activeSimulation.simulated.risk_score} 
                      decision={activeSimulation.simulated.decision} 
                      size={200} 
                      showDetails={false}
                    />

                    <div className="mt-3 flex items-center space-x-2">
                      <span className="text-xs text-gray-400">Optimized Tier:</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        activeSimulation.simulated.decision === 'APPROVE' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : activeSimulation.simulated.decision === 'REVIEW' 
                          ? 'bg-amber-500/20 text-amber-300' 
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {activeSimulation.simulated.decision}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="h-[190px] flex flex-col items-center justify-center text-center px-4 space-y-2 border-2 border-dashed border-gray-800 rounded-xl w-full">
                    <Sliders className="w-8 h-8 text-gray-600" />
                    <p className="text-xs text-gray-500">
                      Click <strong className="text-indigo-400">"Auto-Optimize Terms"</strong> in the console on the left to see the AI counterfactual analysis.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Parameter Deltas Table */}
            {activeSimulation && activeSimulation.deltas && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Parameters Modified by AI</span>
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Net Risk Delta: <strong className={activeSimulation.simulated.risk_score < selectedApp.risk_score ? 'text-emerald-400' : 'text-rose-400'}>
                      {(activeSimulation.simulated.risk_score - selectedApp.risk_score).toFixed(1)}%
                    </strong>
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-950/80 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                      <tr>
                        <th className="py-2.5 px-3">Metric</th>
                        <th className="py-2.5 px-3">Original</th>
                        <th className="py-2.5 px-3 text-cyan-300">AI Proposed</th>
                        <th className="py-2.5 px-3 text-right">Adjustment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono">
                      {Object.entries(activeSimulation.deltas).map(([key, val]) => (
                        <tr key={key} className="hover:bg-gray-800/30">
                          <td className="py-2.5 px-3 font-sans text-gray-300 capitalize">
                            {key.replace('_', ' ')}
                          </td>
                          <td className="py-2.5 px-3 text-gray-400">
                            {key === 'loan_amnt' || key === 'annual_inc' ? `$${Number(val.original).toLocaleString()}` : `${val.original}${key.includes('rate') || key === 'dti' ? '%' : ''}`}
                          </td>
                          <td className="py-2.5 px-3 text-white font-bold">
                            {key === 'loan_amnt' || key === 'annual_inc' ? `$${Number(val.proposed).toLocaleString()}` : `${val.proposed}${key.includes('rate') || key === 'dti' ? '%' : ''}`}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {val.diff !== 0 ? (
                              <span className={`inline-flex items-center space-x-0.5 font-bold ${
                                (key === 'annual_inc' ? val.diff > 0 : val.diff < 0) ? 'text-emerald-400' : 'text-amber-400'
                              }`}>
                                {val.diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span>{val.diff > 0 ? `+${val.diff}` : val.diff}</span>
                              </span>
                            ) : (
                              <span className="text-gray-500">Unchanged</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Regulatory Adverse Action Copy Box (If generated) */}
            <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Regulatory Underwriting Compliance (FCRA / ECOA)</span>
                </span>
                <button
                  onClick={() => handleCopyNotice(
                    `ADVERSE ACTION STATEMENT\nApplicant: ${selectedApp.applicant_name} (${selectedApp.id})\nPredicted Risk: ${selectedApp.risk_score}%\nDecision: ${selectedApp.decision}\nTop SHAP Drivers: ${selectedApp.shap_factors?.map(f => f.label).join(', ')}`
                  )}
                  className="flex items-center space-x-1 text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800/80 transition-colors"
                >
                  {copiedNotice ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedNotice ? 'Copied' : 'Copy Notice'}</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Under Regulation B (ECOA) and FCRA §615(a), whenever an applicant is not approved under prime terms, the model must provide verifiable principal reasons based on game-theoretic Shapley attributions. The Autonomous Studio generates compliant notices automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Groq API Key Setup Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 pb-2 border-b border-gray-800">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                <Key className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Groq API Key Setup</h3>
                <p className="text-xs text-gray-400">Used for live Qwen 3.8 & GPT-OSS inference</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              To demonstrate live LLM token generation during your presentation, paste your free Groq API key below. Keys are stored locally in your browser session and never hardcoded in files.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                Groq API Key (gsk_...)
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-gray-500 block">
                Get a free instant key at <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline">console.groq.com</a>
              </span>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-800">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
