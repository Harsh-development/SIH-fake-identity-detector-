import { ScanFace } from 'lucide-react';
import Panel from './Panel';
import { faceVerification } from '../data/mockData';

export default function FaceVerificationPanel({ data }) {
  // Use the live backend result when it's available, otherwise fall
  // back to the mock data so the panel still renders something
  // meaningful before a verification has been run.
  const f = data || faceVerification;
  return (
    <Panel eyebrow="Biometric Match" title="Face Verification">
      <div className="flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-full border-[1.5px] border-accent-cyan shadow-[0_0_0_4px_var(--color-accent-cyan-glow)] grid place-items-center text-accent-cyan shrink-0">
          <ScanFace size={30} strokeWidth={1.4} />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-2xl font-bold text-text-primary">{f.matchScore}%</span>
          <span className="text-[11.5px] text-text-muted">Match confidence</span>
        </div>
      </div>
      <dl className="flex flex-col gap-2.5 m-0 mt-3">
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Liveness check</dt>
          <dd className="m-0 text-[12.5px] text-risk-low">{f.livenessCheck}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Spoof attempt</dt>
          <dd className="m-0 text-[12.5px] text-risk-low">{f.spoofAttempt}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Landmarks matched</dt>
          <dd className="m-0 font-mono text-[12.5px] text-text-primary">{f.landmarksMatched} / 68</dd>
        </div>
      </dl>
    </Panel>
  );
}
