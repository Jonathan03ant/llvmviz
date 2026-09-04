interface HeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: 'selectiondag', label: 'SelectionDAG' },
  { id: 'globalisel', label: 'GlobalISel' },
  { id: 'scheduledag', label: 'ScheduleDAG', disabled: true },
  { id: 'irpasses', label: 'IR Passes', disabled: true },
  { id: 'mir', label: 'MIR', disabled: false },
  { id: 'assembly', label: 'Assembly', disabled: true },
]

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <div className="bg-[#000000] border-b border-[#1a1a1a] relative overflow-hidden">
      {/* Top bar with branding */}
      <div className="px-6 py-1.5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5">
          {/* Logo Icon */}
          <div className="w-10 h-10 flex items-center justify-center">
            <img
              src="/llvm-dragon.png"
              alt="LLVM"
              style={{
                width: '40px',
                height: '40px',
                mixBlendMode: 'lighten',
                filter: 'brightness(1.2) contrast(1.1)',
              }}
            />
          </div>
          <h1 className="text-lg font-bold text-[#18a018] tracking-tight" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            LLVMViz
          </h1>
          <span className="text-xs text-[#a0a0a0]" style={{ fontFamily: 'Inter, sans-serif' }}>
            LLVM Visualization Suite
          </span>
        </div>
        <div className="flex gap-3">
          <button className="text-[#808080] hover:text-[#18a018] text-xs transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
            Settings
          </button>
          <button className="text-[#808080] hover:text-[#18a018] text-xs transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
            Help
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-6 flex gap-1 relative z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
            className={`
              px-4 py-2 text-xs font-medium transition-all relative
              ${activeTab === tab.id
                ? 'text-[#18a018] border-b-2 border-[#18a018] bg-[#0a0a0a] shadow-[0_0_15px_rgba(24,160,24,0.1)]'
                : tab.disabled
                ? 'text-[#606060] cursor-not-allowed border-b-2 border-transparent'
                : 'text-[#c0c0c0] hover:text-[#18a018] hover:bg-[#0a0a0a]/50 border-b-2 border-transparent'
              }
            `}
          >
            {tab.label}
            {tab.disabled && <span className="ml-1.5 text-[10px] opacity-50" style={{ fontFamily: 'Inter, sans-serif' }}>(Soon)</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
