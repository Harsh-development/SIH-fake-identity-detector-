import { Home, FileText, ShieldCheck, ScanFace, BarChart3, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { icon: Home, label: 'Home' },
  { icon: FileText, label: 'Verification' },
  { icon: ShieldCheck, label: 'Security Center' },
  { icon: ScanFace, label: 'Face Verification' },
  { icon: BarChart3, label: 'Risk Analysis' },
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="row-span-2 bg-bg-void border-r border-border-hairline flex flex-col p-3.5 gap-7 sticky top-0 h-screen max-[900px]:items-center max-[900px]:px-2.5">
      <div className="flex items-center gap-2.5 px-2">
        <div className="w-8.5 h-8.5 grid place-items-center rounded-md bg-accent-cyan-glow shrink-0" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="22" height="22">
            <path
              d="M16 2 L28 7 V15 C28 22.5 22.8 27.8 16 30 C9.2 27.8 4 22.5 4 15 V7 Z"
              fill="none"
              stroke="#29D6E0"
              strokeWidth="2"
            />
            <path d="M11 16 L14.5 19.5 L21.5 12" fill="none" stroke="#29D6E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="font-display font-bold text-[15px] tracking-wider text-text-primary max-[900px]:hidden">
          NETRA.<span className="text-accent-cyan">AI</span>
        </span>
      </div>

      <nav className="flex flex-col gap-1 flex-1" aria-label="Primary">
        {NAV_ITEMS.map(({ icon: Icon, label }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              onClick={() => onNavigate?.(label)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13.5px] font-medium text-left cursor-pointer transition-colors max-[900px]:justify-center
                ${isActive
                  ? 'bg-accent-cyan-glow text-accent-cyan shadow-[inset_2px_0_0_var(--color-accent-cyan)]'
                  : 'text-text-secondary hover:bg-bg-panel hover:text-text-primary'}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="max-[900px]:hidden">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2.5 border-t border-border-hairline pt-4">
        <div className="flex items-center gap-2.5 px-2 py-1.5 max-[900px]:hidden">
          <span className="w-2 h-2 rounded-full bg-risk-low shadow-[0_0_0_3px_var(--color-risk-low-dim)] shrink-0" aria-hidden="true" />
          <div>
            <div className="font-mono text-xs text-text-primary">Officer SSB-102</div>
            <div className="text-[11px] text-risk-low">Online</div>
          </div>
        </div>
        <button className="flex items-center justify-center gap-2.5 px-3 py-2 border border-border-hairline rounded-md text-text-secondary text-[13px] cursor-pointer transition-colors hover:border-risk-high hover:text-risk-high max-[900px]:justify-center">
          <LogOut size={16} strokeWidth={1.8} />
          <span className="max-[900px]:hidden">Logout</span>
        </button>
      </div>
    </aside>
  );
}
