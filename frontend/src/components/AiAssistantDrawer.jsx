import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Terminal, 
  Cpu, 
  CheckCircle2, 
  HelpCircle,
  TrendingDown,
  Search,
  Database
} from 'lucide-react';
import { api } from '../api';

export default function AiAssistantDrawer({ 
  isOpen, 
  onClose, 
  currentApplication = null 
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I am your **LoanLens Decision Copilot**.\n\nI have direct access to our **XGBoost Risk Model**, SHAP TreeExplainer engine, and SQLite Audit Trail.\n\nAsk me why a specific loan was approved/reviewed, simulate what-if adjustments, or inspect risk drivers.",
      toolCalls: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText = null) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    // Add user message
    const newMessages = [
      ...messages,
      { role: 'user', text: textToSend }
    ];
    setMessages(newMessages);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await api.queryAgent(
        textToSend, 
        currentApplication, 
        currentApplication?.id
      );

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: res.reply || "I evaluated the scenario based on backend risk models.",
          toolCalls: res.tool_calls || []
        }
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: "I encountered an error accessing the backend service. Please verify that the API is running.",
          toolCalls: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    {
      title: "Explain Risk Factors",
      prompt: "Why was this application reviewed or rejected? Which factor hurts most?",
      icon: HelpCircle
    },
    {
      title: "Simulate +$25k Income",
      prompt: "What happens to the risk and decision if annual income increases by $25,000?",
      icon: TrendingDown
    },
    {
      title: "Check Similar Loans",
      prompt: "Show me similar applications from the SQLite audit database.",
      icon: Database
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0e1422] border-l border-gray-800 shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#111827]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span>LoanLens Decision Copilot</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Agent
                  </span>
                </h2>
                <p className="text-[11px] text-gray-400">
                  {currentApplication 
                    ? `Context: ${currentApplication.applicant_name || 'Active Applicant'}` 
                    : 'System-wide underwriting copilot'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Evaluation Context Banner */}
          {currentApplication && (
            <div className="bg-indigo-950/40 border-b border-indigo-900/40 px-4 py-2 flex items-center justify-between text-xs text-indigo-200">
              <span className="truncate">
                Evaluating: <strong className="text-white">{currentApplication.applicant_name}</strong>
              </span>
              <span className="font-mono font-semibold text-cyan-400">
                Score: {currentApplication.credit_score} | DTI: {currentApplication.dti}%
              </span>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Message Header */}
                <div className="flex items-center space-x-1.5 mb-1 text-[11px] text-gray-400">
                  {m.role === 'user' ? (
                    <>
                      <span>Underwriter</span>
                      <User className="w-3 h-3 text-cyan-400" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Copilot Agent</span>
                    </>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[90%] shadow-md ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">
                    {m.text}
                  </div>

                  {/* Backend Tool Calls Visualization */}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-gray-800/80 space-y-1.5">
                      <div className="flex items-center space-x-1 text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                        <Terminal className="w-3 h-3 text-cyan-400" />
                        <span>Backend Tool Invocations:</span>
                      </div>
                      {m.toolCalls.map((tc, tIdx) => (
                        <div
                          key={tIdx}
                          className="px-2 py-1 rounded bg-black/40 border border-gray-800 font-mono text-[11px] text-cyan-300 flex items-center justify-between"
                        >
                          <span>⚡ {tc.tool}()</span>
                          <span className="text-[10px] text-emerald-400 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-0.5" /> executed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-gray-400 italic p-2">
                <Cpu className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Copilot is querying XGBoost & SHAP explainer...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="p-3 border-t border-gray-800/80 bg-gray-950/60">
            <div className="text-[11px] font-medium text-gray-400 mb-1.5">Suggested Prompts:</div>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp.prompt)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-800 border border-gray-700/60 text-gray-300 hover:text-white text-xs transition-colors flex items-center space-x-1 text-left"
                >
                  <qp.icon className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>{qp.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-gray-800 bg-gray-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Ask about this loan, SHAP factors, or what-if..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
