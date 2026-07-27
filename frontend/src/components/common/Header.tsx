import { NeuralNetwork } from '../NeuralNetwork'

interface HeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: 'selectiondag', label: 'SelectionDAG' },
  { id: 'irpasses', label: 'IR Passes', disabled: true },
  { id: 'mir', label: 'MIR', disabled: false },
  { id: 'assembly', label: 'Assembly', disabled: true },
]

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <div className="bg-[#000000] border-b border-[#1a1a1a] relative overflow-hidden">
      {/* Neural Network Background */}
      <NeuralNetwork />

      {/* Top bar with branding */}
      <div className="px-6 py-2.5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[#18a018] tracking-tight" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            LLVMViz
          </h1>
          <span className="text-xs text-[#a0a0a0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            LLVM Visualization Suite
          </span>
        </div>
        <div className="flex gap-4">
          <button className="text-[#a0a0a0] hover:text-[#18a018] text-xs transition-colors" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Settings
          </button>
          <button className="text-[#a0a0a0] hover:text-[#18a018] text-xs transition-colors" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Help
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-6 flex gap-1 relative z-10" style={{ fontFamily: 'Inter, sans-serif' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
            className={`
              px-5 py-2.5 text-sm font-medium transition-all relative
              ${activeTab === tab.id
                ? 'text-[#18a018] border-b-2 border-[#18a018] bg-[#0a0a0a] shadow-[0_0_20px_rgba(24,160,24,0.1)]'
                : tab.disabled
                ? 'text-[#808080] cursor-not-allowed border-b-2 border-transparent'
                : 'text-[#c8c8c8] hover:text-[#18a018] hover:bg-[#0a0a0a]/50 border-b-2 border-transparent'
              }
            `}
          >
            {tab.label}
            {tab.disabled && <span className="ml-2 text-[11px] opacity-60" style={{ fontFamily: 'Inter, sans-serif' }}>(Soon)</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
