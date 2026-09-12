import { riskScore } from '../data/mockData';

const SIZE = 168;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function bandColor(value) {
  if (value < 34) return '#33D6A0';
  if (value < 67) return '#F2B84B';
  return '#F2495C';
}

const WEIGHT_COLOR = { low: 'bg-risk-low', medium: 'bg-risk-mid', high: 'bg-risk-high' };

/**
 * Shows the real overall risk score returned by
 * services/risk_score.py once a verification has run. Falls
 * back to the mock score before any scan has run.
 */
export default function RiskScoreGauge({ data }) {
  const { value, band, reasons } = data ?? riskScore;
  const offset = CIRC - (value / 100) * CIRC;
  const color = bandColor(value);

  return (
    <section
      className="rounded-2xl p-5 border border-border-hairline flex flex-col gap-3.5"
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, var(--color-bg-panel-raised) 0%, var(--color-bg-panel) 60%)' }}
    >
      <div className="font-mono text-[11px] tracking-wider uppercase text-text-muted">Overall Risk Score</div>
      <div className="flex items-center gap-8 flex-wrap max-[560px]:justify-center max-[560px]:text-center">
        <div className="relative w-[168px] h-[168px] shrink-0">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="block">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#1D2A3F" strokeWidth={STROKE} />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
            />
            <circle
              className="animate-spin-slow"
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS - STROKE / 2 - 6}
              fill="none"
              stroke={color}
              strokeOpacity="0.25"
              strokeWidth="1"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="font-display text-[40px] font-bold text-text-primary leading-none">{value}</span>
            <span className="font-mono text-xs text-text-muted">/ 100</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-[220px] flex-1">
          <div className="flex items-center gap-2 font-display font-semibold text-[15px] capitalize max-[560px]:justify-center" style={{ color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {band} risk
          </div>
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {reasons.map((r) => (
              <li key={r.label} className="flex items-center gap-2.5 text-[12.5px] text-text-secondary">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${WEIGHT_COLOR[r.weight]}`} />
                {r.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
