import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Panel from './Panel';
import { riskDistribution } from '../data/mockData';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-bg-panel-raised border border-border-hairline rounded-md py-1.5 px-2.5 text-[11.5px] text-text-primary">
      <span style={{ color: p.payload.color }}>{p.name}</span>: {p.value}%
    </div>
  );
}

/**
 * Shows the real weighted risk-score breakdown returned by
 * services/risk_score.py (validation / tampering / face-match
 * contributions) once a verification has run. Falls back to the
 * mock low/moderate/high distribution before any scan has run.
 */
export default function RiskDistributionPanel({ data, title, eyebrow }) {
  const rows = data ?? riskDistribution;

  return (
    <Panel eyebrow={eyebrow ?? 'This Week'} title={title ?? 'Risk Distribution'}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={70}
                paddingAngle={3}
                stroke="none"
              >
                {rows.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="list-none m-0 p-0 flex flex-col gap-2.5 shrink-0">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
              <span className="text-text-secondary min-w-16">{r.name}</span>
              <span className="font-mono text-[11.5px] text-text-primary">{r.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
