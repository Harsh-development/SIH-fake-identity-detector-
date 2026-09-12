export default function Panel({ title, eyebrow, action, className = '', children }) {
  return (
    <section className={`bg-bg-panel border border-border-hairline rounded-2xl p-5 flex flex-col gap-3.5 min-w-0 ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <div className="font-mono text-[10.5px] tracking-wider uppercase text-text-muted mb-1">
                {eyebrow}
              </div>
            )}
            {title && <h2 className="font-display text-[15px] font-semibold text-text-primary m-0">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className="min-w-0">{children}</div>
    </section>
  );
}
