import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, HelpCircle } from 'lucide-react';

export default function ShapChart({ factors = [], baseRisk = 0.4336, finalRisk = 0.25 }) {
  const [showHelper, setShowHelper] = useState(false);

  // Safeguard factors
  const factorList = Array.isArray(factors) ? factors : [];

  // Sort by absolute contribution descending
  const sortedFactors = [...factorList].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  // Maximum contribution for relative width scaling
  const maxAbsContrib = Math.max(
    ...sortedFactors.map((f) => Math.abs(f.contribution)),
    0.15
  );

  return (
    <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">SHAP Feature Attributions</h3>
            <button
              onClick={() => setShowHelper(!showHelper)}
              className="text-gray-400 hover:text-cyan-400 transition-colors"
              title="Explain how SHAP works"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Exact probability contribution per financial factor computed via XGBoost TreeExplainer
          </p>
        </div>

        {/* Baseline Reference Tag */}
        <div className="flex items-center space-x-2 bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-700/50 text-xs">
          <span className="text-gray-400">Model Baseline Risk:</span>
          <span className="font-semibold text-white">{(baseRisk * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Helper Callout */}
      {showHelper && (
        <div className="mt-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-indigo-100">Interpreting SHAP (Shapley Additive Explanations):</p>
            <p className="mt-1 text-gray-300">
              SHAP decomposes the difference between the average borrower's baseline risk ({(baseRisk * 100).toFixed(1)}%) 
              and this applicant's final risk ({((finalRisk || 0.25) * 100).toFixed(1)}%).
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <span className="inline-flex items-center text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1.5"></span>
                Green = Lowered predicted risk (credit strength)
              </span>
              <span className="inline-flex items-center text-rose-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 mr-1.5"></span>
                Red = Increased predicted risk (credit stress)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Waterfall-style Horizontal Bars */}
      <div className="mt-5 space-y-3">
        {sortedFactors.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            No factor attributions calculated for this view.
          </div>
        ) : (
          sortedFactors.map((item, idx) => {
            const isNegative = item.contribution < 0; // Negative contribution = reduces default risk
            const absValue = Math.abs(item.contribution);
            const barPct = Math.min(100, Math.max(6, (absValue / maxAbsContrib) * 100));
            const formattedPct = (item.contribution * 100).toFixed(2);
            const sign = item.contribution > 0 ? '+' : '';

            return (
              <div
                key={item.feature || idx}
                className="group p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/60 border border-gray-800/60 hover:border-gray-700/80 transition-all"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-200">{item.label || item.feature}</span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 border border-gray-700/50">
                      Value: {item.value}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {isNegative ? (
                      <span className="inline-flex items-center text-emerald-400 font-bold">
                        <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                        {sign}{formattedPct}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-rose-400 font-bold">
                        <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                        {sign}{formattedPct}%
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 hidden sm:inline">
                      {isNegative ? 'Lowers Risk' : 'Raises Risk'}
                    </span>
                  </div>
                </div>

                {/* Horizontal Bar representation */}
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden flex">
                  {/* Center origin bar */}
                  <div className="w-1/2 flex justify-end bg-transparent">
                    {isNegative && (
                      <div
                        className="h-full bg-gradient-to-l from-emerald-400 to-emerald-600 rounded-l-full transition-all duration-500"
                        style={{ width: `${barPct}%` }}
                      />
                    )}
                  </div>
                  <div className="w-1/2 flex justify-start bg-transparent">
                    {!isNegative && (
                      <div
                        className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-r-full transition-all duration-500"
                        style={{ width: `${barPct}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Axis legend */}
      <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
        <span className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
          Mitigating Factors (Lowers Risk)
        </span>
        <span className="text-gray-400">0% Center</span>
        <span className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-rose-400 mr-1"></span>
          Risk Escalation Factors (Increases Risk)
        </span>
      </div>
    </div>
  );
}
