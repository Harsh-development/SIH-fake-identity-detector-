import { ScanLine, Upload } from 'lucide-react';
import Panel from './Panel';
import { latestScan } from '../data/mockData';

/**
 * LatestScanPanel
 * ---------------------------------------------------------
 * Pure display component driven by props from App.jsx.
 *
 * Previously this panel ran its own independent file upload
 * that POSTed to a `/analyze` endpoint the backend never
 * exposed (only `/api/verify-document` exists), so every scan
 * here silently failed with "Error connecting to Backend".
 *
 * It now mirrors the SAME verification pipeline driven by the
 * "Government ID Verification" upload boxes above, so the data
 * shown here is always the real result returned by FastAPI
 * (OCR + validation + tampering + face verification), not a
 * disconnected mock request.
 */
export default function LatestScanPanel({
  docId,
  docType,
  submittedAt,
  officer,
  status,
  previewUrl,
  loading = false,
}) {
  const data = {
    docId: docId ?? latestScan.docId,
    docType: docType ?? latestScan.docType,
    submittedAt: submittedAt ?? latestScan.submittedAt,
    officer: officer ?? latestScan.officer,
    status: status ?? latestScan.status,
  };

  return (
    <Panel eyebrow="Live Feed" title="Latest Scan">
      <div className="relative overflow-hidden h-[120px] rounded-lg bg-bg-inset border border-dashed border-border-hairline flex flex-col items-center justify-center gap-1.5 text-text-muted text-[11.5px]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Scan Preview"
            className="h-full w-full object-cover rounded-lg"
          />
        ) : (
          <>
            {loading ? (
              <ScanLine size={26} className="animate-spin text-accent-cyan" />
            ) : (
              <Upload size={26} strokeWidth={1.5} />
            )}
            <span>
              {loading
                ? 'Analyzing document...'
                : 'Upload a document above to scan'}
            </span>
          </>
        )}

        {loading && (
          <div className="animate-scan absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent-cyan to-transparent shadow-[0_0_10px_var(--color-accent-cyan)]" />
        )}
      </div>

      <dl className="flex flex-col gap-2.5 m-0 mt-3.5">
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Document ID</dt>
          <dd className="m-0 font-mono text-[12.5px] text-text-primary text-right">{data.docId}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Type</dt>
          <dd className="m-0 text-[12.5px] text-text-primary text-right">{data.docType}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Submitted</dt>
          <dd className="m-0 font-mono text-[12.5px] text-text-primary text-right">{data.submittedAt}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2.5">
          <dt className="text-[11.5px] text-text-muted">Officer</dt>
          <dd className="m-0 font-mono text-[12.5px] text-text-primary text-right">{data.officer}</dd>
        </div>
      </dl>

      <div className="text-[11.5px] text-risk-mid bg-risk-mid-dim border border-risk-mid/30 rounded-md py-1.5 px-2.5 text-center mt-3.5">
        {data.status}
      </div>
    </Panel>
  );
}
