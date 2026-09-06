import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldX } from 'lucide-react';

export default function RiskGauge({ riskScore = 0, decision = 'REVIEW', size = 260 }) {
  // Ensure risk is clamped between 0 and 100
  const score = Math.min(100, Math.max(0, Number(riskScore) || 0));

  // Gauge geometry
  const radius = 90;
  const strokeWidth = 14;
  const cx = 130;
  const cy = 130;
  
  // Circumference for 180-degree arc
  const arcLength = Math.PI * radius; // Half circumference
  const strokeDashoffset = arcLength - (score / 100) * arcLength;

  // Decision styles
  const getDecisionStyle = () => {
    switch (decision) {
      case 'APPROVE':
        return {
          textColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          gradientId: 'gaugeApproveGrad',
          strokeColor: '#10b981',
          label: 'APPROVE',
          subtext: 'Auto-Clear (< 15% Risk)',
          icon: ShieldCheck
        };
      case 'REVIEW':
        return {
          textColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          gradientId: 'gaugeReviewGrad',
          strokeColor: '#f59e0b',
          label: 'MANUAL REVIEW',
          subtext: 'Underwriter Review (15% - 30%)',
          icon: AlertTriangle
        };
      case 'REJECT':
      default:
        return {
          textColor: 'text-rose-400',
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          gradientId: 'gaugeRejectGrad',
          strokeColor: '#ef4444',
          label: 'REJECT',
          subtext: 'High Default Risk (> 30%)',
          icon: ShieldX
        };
    }
  };

  const style = getDecisionStyle();
  const IconComponent = style.icon;

  // Needle angle: from -90 deg (0%) to +90 deg (100%)
  const needleAngle = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Gauge SVG */}
      <div className="relative" style={{ width: size, height: size * 0.65 }}>
        <svg
          viewBox="0 0 260 160"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Background track gradient */}
            <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="15%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Glowing filter for needle */}
            <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor={style.strokeColor} floodOpacity="0.6"/>
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 40 130 A 90 90 0 0 1 220 130"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Color-Zone Reference Track */}
          <path
            d="M 40 130 A 90 90 0 0 1 220 130"
            fill="none"
            stroke="url(#gaugeTrack)"
            strokeWidth={strokeWidth - 6}
            strokeLinecap="round"
            strokeOpacity="0.25"
          />

          {/* Active Progress Arc */}
          <path
            d="M 40 130 A 90 90 0 0 1 220 130"
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* 15% Threshold Marker */}
          <g transform={`rotate(${0.15 * 180 - 90} 130 130)`}>
            <line x1="130" y1="32" x2="130" y2="44" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2 2" />
          </g>
          <text x="75" y="48" fill="#64748b" fontSize="9" fontWeight="600">15%</text>

          {/* 30% Threshold Marker */}
          <g transform={`rotate(${0.30 * 180 - 90} 130 130)`}>
            <line x1="130" y1="32" x2="130" y2="44" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2 2" />
          </g>
          <text x="110" y="32" fill="#64748b" fontSize="9" fontWeight="600">30%</text>

          {/* Needle Indicator */}
          <g transform={`rotate(${needleAngle} 130 130)`} filter="url(#needleGlow)" className="transition-transform duration-700 ease-out">
            <line
              x1="130"
              y1="130"
              x2="130"
              y2="46"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1="130"
              y1="46"
              x2="130"
              y2="40"
              stroke={style.strokeColor}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          </g>

          {/* Center Pivot Point */}
          <circle cx="130" cy="130" r="10" fill="#0f172a" stroke="#334155" strokeWidth="3" />
          <circle cx="130" cy="130" r="4" fill={style.strokeColor} />
        </svg>

        {/* Digital Readout In Center */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center -mb-2">
          <div className="text-3xl font-extrabold tracking-tight text-white flex items-baseline">
            <span>{score.toFixed(1)}</span>
            <span className="text-lg font-bold text-gray-400 ml-0.5">%</span>
          </div>
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            Default Probability
          </span>
        </div>
      </div>

      {/* Decision Badge */}
      <div className={`mt-4 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-bold tracking-wide shadow-sm ${style.bgColor}`}>
        <IconComponent className="w-4 h-4" />
        <span>{style.label}</span>
      </div>
      <span className="text-xs text-gray-400 mt-1">{style.subtext}</span>
    </div>
  );
}
