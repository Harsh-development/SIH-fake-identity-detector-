import { CheckCircle2, AlertTriangle } from 'lucide-react';
import Panel from './Panel';
import { aiVerification } from '../data/mockData';

/**
 * Shows a per-module pass/review summary built from the real
 * backend response (OCR confidence, document validation,
 * tampering score, face match) once a verification has run.
 * Falls back to mock rows before any scan has run.
 */
export default function AIVerificationPanel({ data }) {
  const rows = data ?? aiVerification;

  return (
    <Panel eyebrow="Model Output" title="AI Verification Results">
      <ul className="list-none m-0 p-0 flex flex-col gap-8">
        {rows.map((row) => {
          const pass = row.result === 'Pass';
          const Icon = pass ? CheckCircle2 : AlertTriangle;
          return (
            <li key={row.check} className="grid grid-cols-[18px_1fr_70px_40px] items-center gap-2.5">
              <Icon size={16} strokeWidth={1.8} className={pass ? 'text-risk-low' : 'text-risk-mid'} />
              <div className="flex flex-col min-w-0">
                <span className="text-[12.5px] text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">{row.check}</span>
                <span className={`text-[10.5px] font-mono ${pass ? 'text-risk-low' : 'text-risk-mid'}`}>{row.result}</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-inset overflow-hidden">
                <div
                  className={`h-full rounded-full ${pass ? 'bg-risk-low' : 'bg-risk-mid'}`}
                  style={{ width: `${Math.min(100, Math.max(0, row.confidence))}%` }}
                />
              </div>
              <span className="font-mono text-[11.5px] text-text-secondary text-right">{Math.round(row.confidence)}%</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
