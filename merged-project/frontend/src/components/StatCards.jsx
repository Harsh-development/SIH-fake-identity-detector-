import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { stats } from '../data/mockData';

const TREND_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };
const TREND_COLOR = { up: 'text-risk-low', down: 'text-risk-high', flat: 'text-text-muted' };

/**
 * These are department-wide KPIs (not a single document's
 * result), so they stay seeded from mockData, but App.jsx
 * overlays real session counters (documents scanned / pending
 * review / high risk) on top as verifications complete.
 */
export default function StatCards({ data }) {
  const rows = data ?? stats;

  return (
    <div className="grid grid-cols-4 gap-3.5 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
      {rows.map((stat) => {
        const TrendIcon = TREND_ICON[stat.trend];
        return (
          <div key={stat.label} className="bg-bg-panel border border-border-hairline rounded-2xl p-4.5 flex flex-col gap-2">
            <div className="text-xs text-text-secondary font-medium">{stat.label}</div>
            <div className="font-display text-[26px] font-bold text-text-primary tracking-tight">{stat.value}</div>
            <div className={`inline-flex items-center gap-1 text-[11.5px] font-mono w-fit ${TREND_COLOR[stat.trend]}`}>
              <TrendIcon size={12} strokeWidth={2} />
              <span>{stat.delta}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
