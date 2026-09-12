import Panel from './Panel';
import { tamperingAnalysis } from '../data/mockData';

function scoreColor(score) {
  if (score < 20) return '#33D6A0';
  if (score < 50) return '#F2B84B';
  return '#F2495C';
}

/**
 * Shows the real Error-Level-Analysis tamper result returned by
 * services/tampering.py (a single 0-100 score + risk level +
 * method + notes) once a verification has run. Falls back to
 * the mock per-region breakdown before any scan has run.
 */
export default function TamperingAnalysisPanel({ data }) {
  const overallFlag = data?.overallFlag ?? tamperingAnalysis.overallFlag;
  const regions = data?.regions ?? tamperingAnalysis.regions;
  const notes = data?.notes;

  return (
    <Panel eyebrow={overallFlag} title="Tampering Analysis">
      <ul className="list-none m-0 p-0 flex flex-col gap-3">
        {regions.map((r) => {
          const color = scoreColor(r.anomalyScore);
          return (
            <li key={r.area} className="grid grid-cols-2 items-center gap-2.5" style={{ gridTemplateColumns: '1fr 1fr 28px' }}>
              <span className="text-xs text-text-secondary whitespace-nowrap overflow-hidden text-ellipsis">{r.area}</span>
              <div className="h-1.5 rounded-full bg-bg-inset overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${r.anomalyScore}%`, background: color }} />
              </div>
              <span className="font-mono text-[11.5px] text-right" style={{ color }}>{r.anomalyScore}</span>
            </li>
          );
        })}
      </ul>

      {notes && (
        <p className="text-[11px] leading-relaxed text-text-muted mt-1 mb-0">
          {notes}
        </p>
      )}
    </Panel>
  );
}
