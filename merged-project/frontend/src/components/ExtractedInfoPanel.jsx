import Panel from './Panel';
import { extractedInfo } from '../data/mockData';

/**
 * Shows the real OCR output returned by the backend
 * (services/ocr.py) once a document has been verified.
 * Falls back to mock rows before any scan has run.
 */
export default function ExtractedInfoPanel({ data }) {
  const rows = data ?? extractedInfo;

  return (
    <Panel eyebrow="OCR Output" title="Extracted Information">
      <dl className="flex flex-col m-0">
        {rows.map((row, i) => (
          <div
            key={row.field}
            className={`flex items-baseline justify-between gap-3 py-2 ${i < rows.length - 1 ? 'border-b border-border-soft' : ''}`}
          >
            <dt className="text-[11.5px] text-text-muted shrink-0">{row.field}</dt>
            <dd className="m-0 font-mono text-[12.5px] text-text-primary text-right break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
