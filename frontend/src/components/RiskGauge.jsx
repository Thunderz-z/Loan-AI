import { ShieldCheck, AlertTriangle, ShieldX } from 'lucide-react';

export default function RiskGauge({ 
  riskScore = 0, 
  decision = 'REVIEW', 
  size = 280, 
  showDetails = true 
}) {
  // Clamp score between 0.0 and 100.0
  const score = Math.min(100, Math.max(0, Number(riskScore) || 0));

  // Determine policy tier based on actual score
  const isApprove = score < 15.0;
  const isReview = score >= 15.0 && score <= 30.0;
  const isReject = score > 30.0;

  // Normalized decision styling
  const getDecisionMeta = () => {
    if (decision === 'APPROVE' || isApprove) {
      return {
        label: 'APPROVE',
        subtext: 'Auto-Clear (< 15% Risk Threshold)',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        textColor: 'text-emerald-400',
        strokeColor: '#10b981',
        icon: ShieldCheck,
        tierName: 'Low Risk Tier'
      };
    }
    if (decision === 'REVIEW' || isReview) {
      return {
        label: 'MANUAL REVIEW',
        subtext: 'Underwriter Review Required (15% - 30%)',
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        textColor: 'text-amber-400',
        strokeColor: '#f59e0b',
        icon: AlertTriangle,
        tierName: 'Moderate Risk Tier'
      };
    }
    return {
      label: 'REJECT',
      subtext: 'High Default Risk (> 30% Threshold)',
      badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      textColor: 'text-rose-400',
      strokeColor: '#ef4444',
      icon: ShieldX,
      tierName: 'High Risk Tier'
    };
  };

  const meta = getDecisionMeta();
  const IconComponent = meta.icon;

  // Gauge Geometry:
  // Center (cx, cy) = (140, 135), Radius = 95
  // Semicircle from left (180 deg) to right (0 deg)
  // Total arc length: PI * 95 ≈ 298.45
  const cx = 140;
  const cy = 135;
  const radius = 95;
  const arcLength = Math.PI * radius; // 298.45
  const strokeDashoffset = arcLength - (score / 100) * arcLength;

  // Needle angle: -90° at 0%, 0° at 50%, +90° at 100%
  const needleAngle = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* 1. TOP: The Center Meter Gauge (Zero text inside sweep area, meter is completely ABOVE) */}
      <div 
        className="w-full flex items-center justify-center"
        style={{ maxWidth: size }}
      >
        <svg
          viewBox="0 0 280 150"
          className="w-full h-auto overflow-visible"
        >
          <defs>
            {/* Active needle glow */}
            <filter id="gaugeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={meta.strokeColor} floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Background Track - 3 Distinct Regulatory Policy Zones */}
          {/* Zone 1: 0% to 15% (Emerald - Safe Auto-Approve Zone) */}
          <path
            d="M 45 135 A 95 95 0 0 1 55.35 91.87"
            fill="none"
            stroke="#064e3b"
            strokeWidth="12"
            strokeLinecap="round"
            className="opacity-70"
          />

          {/* Zone 2: 15% to 30% (Amber - Manual Underwriting Zone) */}
          <path
            d="M 55.35 91.87 A 95 95 0 0 1 84.16 58.14"
            fill="none"
            stroke="#78350f"
            strokeWidth="12"
            className="opacity-70"
          />

          {/* Zone 3: 30% to 100% (Rose - Elevated Default Risk Zone) */}
          <path
            d="M 84.16 58.14 A 95 95 0 0 1 235 135"
            fill="none"
            stroke="#7f1d1d"
            strokeWidth="12"
            strokeLinecap="round"
            className="opacity-70"
          />

          {/* Active Illuminated Progress Arc */}
          <path
            d="M 45 135 A 95 95 0 0 1 235 135"
            fill="none"
            stroke={meta.strokeColor}
            strokeWidth="12"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Boundary Divider Ticks outside track */}
          {/* 15% Tick */}
          <line
            x1="48.5"
            y1="88.3"
            x2="42.3"
            y2="85.1"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* 30% Tick */}
          <line
            x1="78.9"
            y1="50.9"
            x2="74.2"
            y2="44.4"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Peripheral Scale Labels (Cleanly positioned on the outer perimeter, zero collision) */}
          <text
            x="24"
            y="140"
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontWeight="600"
            className="font-mono"
          >
            0%
          </text>

          <text
            x="32"
            y="80"
            textAnchor="end"
            fill="#34d399"
            fontSize="10"
            fontWeight="700"
            className="font-mono"
          >
            15%
          </text>

          <text
            x="64"
            y="32"
            textAnchor="middle"
            fill="#fbbf24"
            fontSize="10"
            fontWeight="700"
            className="font-mono"
          >
            30%
          </text>

          <text
            x="256"
            y="140"
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontWeight="600"
            className="font-mono"
          >
            100%
          </text>

          {/* Needle Indicator (Rotates unobstructed with zero overlapping text) */}
          <g
            transform={`rotate(${needleAngle} ${cx} ${cy})`}
            filter="url(#gaugeGlow)"
            className="transition-transform duration-700 ease-out"
          >
            {/* Needle Body */}
            <polygon
              points="138,135 142,135 140.7,52 139.3,52"
              fill="#f8fafc"
            />
            {/* Needle Tip Indicator */}
            <circle
              cx="140"
              cy="50"
              r="3"
              fill={meta.strokeColor}
            />
          </g>

          {/* Center Pivot Hub */}
          <circle
            cx={cx}
            cy={cy}
            r="10"
            fill="#0b1324"
            stroke="#334155"
            strokeWidth="3"
          />
          <circle
            cx={cx}
            cy={cy}
            r="4.5"
            fill={meta.strokeColor}
          />
        </svg>
      </div>

      {/* 2. UNDER: The 23.8% Digital Score & Label Placed UNDER the Center Meter */}
      <div className="flex flex-col items-center justify-center mt-2 text-center">
        <div className="flex items-baseline justify-center space-x-1">
          <span 
            className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono drop-shadow-md"
            style={{ color: meta.strokeColor }}
          >
            {score.toFixed(1)}
          </span>
          <span className="text-xl sm:text-2xl font-bold text-gray-400 font-mono">
            %
          </span>
        </div>
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
          Default Probability
        </span>
      </div>

      {/* 3. POLICY DETAILS & DECISION BADGE (Cleanly stacked below, no overlaps) */}
      {showDetails && (
        <div className="w-full mt-4 flex flex-col items-center space-y-3">
          {/* Policy Tier Segment Strip */}
          <div className="w-full grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-gray-950/80 border border-gray-800 text-[10px]">
            {/* Approve zone */}
            <div className={`py-1.5 px-2 rounded-lg text-center transition-colors ${
              isApprove 
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold shadow-sm' 
                : 'text-gray-500 bg-transparent'
            }`}>
              <span className="block font-mono font-semibold">0 - 15%</span>
              <span className="block text-[9px] uppercase tracking-wide">Auto-Approve</span>
            </div>

            {/* Review zone */}
            <div className={`py-1.5 px-2 rounded-lg text-center transition-colors ${
              isReview 
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shadow-sm' 
                : 'text-gray-500 bg-transparent'
            }`}>
              <span className="block font-mono font-semibold">15 - 30%</span>
              <span className="block text-[9px] uppercase tracking-wide">Manual Review</span>
            </div>

            {/* Reject zone */}
            <div className={`py-1.5 px-2 rounded-lg text-center transition-colors ${
              isReject 
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold shadow-sm' 
                : 'text-gray-500 bg-transparent'
            }`}>
              <span className="block font-mono font-semibold">&gt; 30%</span>
              <span className="block text-[9px] uppercase tracking-wide">Decline</span>
            </div>
          </div>

          {/* Underwriting Decision Badge */}
          <div className="flex flex-col items-center space-y-1">
            <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-bold tracking-wide shadow-sm ${meta.badgeBg}`}>
              <IconComponent className="w-4 h-4" />
              <span>{meta.label}</span>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              {meta.subtext}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
