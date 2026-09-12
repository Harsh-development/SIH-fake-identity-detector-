import Panel from './Panel';
import { caseDetails } from '../data/mockData';

/**
 * Shows the real case/request details built by App.jsx from the
 * backend response (request ID, computed priority from the risk
 * score, recommendation as the review note). Falls back to mock
 * data before any scan has run.
 */
export default function DetailsPanel({ data }) {
  const d = data ?? caseDetails;

  return (
    <Panel eyebrow="Case File" title="Details">
      <dl className="flex flex-col gap-2.5 m-0">
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Case ID</dt>
          <dd className="m-0 font-mono text-[12.5px] text-text-primary text-right">{d.caseId}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Priority</dt>
          <dd className="m-0 text-right">
            <span className="inline-block text-[10.5px] font-mono text-risk-mid bg-risk-mid-dim border border-risk-mid/30 rounded-full py-0.5 px-2.5">
              {d.priority}
            </span>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Assigned Officer</dt>
          <dd className="m-0 font-mono text-[12.5px] text-text-primary text-right">{d.assignedOfficer}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Location</dt>
          <dd className="m-0 text-[12.5px] text-text-primary text-right">{d.location}</dd>
        </div>
      </dl>
      <p className="text-xs leading-relaxed text-text-secondary bg-bg-inset border-l-2 border-accent-cyan py-2 px-2.5 rounded-r-md mt-0.5 mb-0">
        {d.notes}
      </p>
      <div className="flex gap-2 mt-0.5">
        <button className="flex-1 rounded-md py-2.5 px-2.5 text-xs font-semibold cursor-pointer bg-risk-low-dim text-risk-low border border-risk-low/30">
          Clear
        </button>
        <button className="flex-1 rounded-md py-2.5 px-2.5 text-xs font-semibold cursor-pointer bg-risk-high-dim text-risk-high border border-risk-high/30">
          Flag for review
        </button>
      </div>
    </Panel>
  );
}
