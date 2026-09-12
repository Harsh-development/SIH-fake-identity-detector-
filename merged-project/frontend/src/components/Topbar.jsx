import { Search, Bell, ChevronDown } from 'lucide-react';

const TABS = ['Dashboard', 'Face Detection', 'Search', 'Notification', 'Officer Profile'];

export default function Topbar({ activeTab, onTabChange }) {
  return (
    <header className="flex items-center justify-between gap-6 px-7 h-16 border-b border-border-hairline bg-bg-base sticky top-0 z-10 max-[700px]:px-4">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Sections">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange?.(tab)}
            className={`border-none text-[13.5px] font-medium px-3.5 py-2 rounded-md cursor-pointer whitespace-nowrap transition-colors
              ${activeTab === tab ? 'text-text-primary bg-bg-panel' : 'text-text-muted hover:text-text-secondary bg-transparent'}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3.5 shrink-0">
        <div className="hidden min-[901px]:flex items-center gap-2 bg-bg-panel border border-border-hairline rounded-md px-3 py-1.5 text-text-muted w-65">
          <Search size={15} strokeWidth={1.8} />
          <input
            type="text"
            placeholder="Search case ID, document, officer…"
            className="bg-transparent border-none outline-none text-text-primary text-xs w-full placeholder:text-text-muted"
          />
        </div>
        <button className="relative w-8.5 h-8.5 grid place-items-center rounded-md border border-border-hairline bg-bg-panel text-text-secondary cursor-pointer" aria-label="Notifications">
          <Bell size={17} strokeWidth={1.8} />
          <span className="absolute -top-1 -right-1 bg-risk-high text-bg-base text-[9px] font-bold w-3.5 h-3.5 rounded-full grid place-items-center">3</span>
        </button>
        <button className="flex items-center gap-2 border border-border-hairline bg-bg-panel rounded-md pl-1 pr-2.5 py-1 text-text-secondary text-xs cursor-pointer">
          <div className="w-6 h-6 rounded-full bg-accent-cyan-glow text-accent-cyan font-mono text-[10px] font-bold grid place-items-center">SS</div>
          <span>SSB-102</span>
          <ChevronDown size={14} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
