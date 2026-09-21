import { useEffect, useRef, useState } from 'react'

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
  const [openMenu, setOpenMenu] = useState<'settings' | 'help' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openMenu) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openMenu])

  return (
    <div className="bg-[#000000] border-b border-[#1a1a1a] relative">
      {/* Top bar with branding */}
      <div className="px-6 py-1.5 flex items-center justify-between relative z-20">
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
        <div ref={menuRef} className="flex gap-3">
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')}
              className={`text-xs transition-colors ${openMenu === 'settings' ? 'text-[#18a018]' : 'text-[#808080] hover:text-[#18a018]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Settings
            </button>

            {openMenu === 'settings' && (
              <div
                className="absolute top-full right-0 mt-1 w-48 bg-[#0a0a0a] border border-[#1a1a1a] rounded shadow-lg z-50"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
              >
                <div className="px-2 py-px flex items-center justify-between leading-4 text-[#808080]">
                  <span>Theme</span>
                  <span className="text-[#18a018]">Dark</span>
                </div>
                <div className="px-2 py-px flex items-center justify-between leading-4 text-[#808080]">
                  <span>Default target</span>
                  <span className="text-[#606060]">—</span>
                </div>
                <div className="px-2 py-px flex items-center justify-between leading-4 text-[#808080]">
                  <span>Restore session</span>
                  <span className="text-[#606060]">Off</span>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
              className={`text-xs transition-colors ${openMenu === 'help' ? 'text-[#18a018]' : 'text-[#808080] hover:text-[#18a018]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Help
            </button>

            {openMenu === 'help' && (
              <div
                className="absolute top-full right-0 mt-1 w-32 bg-[#0a0a0a] border border-[#1a1a1a] rounded shadow-lg z-50 text-left"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
              >
                <div className="w-full px-2 py-px text-left leading-4 text-[#808080]">Quick Start</div>
                <a
                  href="https://github.com/Jonathan03ant/llvmviz"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full px-2 py-px flex items-center justify-between leading-4 text-[#808080] hover:text-[#18a018] hover:bg-[#111111] transition-colors"
                >
                  <span>GitHub</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3 h-3 fill-current">
                    <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.39.97.1-.75.41-1.27.74-1.56-2.58-.29-5.29-1.29-5.29-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.97 10.97 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.72 5.39-5.3 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
                  </svg>
                </a>
                <a
                  href="https://github.com/Jonathan03ant/llvmviz/issues/new"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full px-2 py-px flex items-center justify-between leading-4 text-[#808080] hover:text-[#18a018] hover:bg-[#111111] transition-colors"
                >
                  <span>Report Issue</span>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="w-3 h-3 fill-none stroke-current"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v6M12 17h.01" />
                  </svg>
                </a>
              </div>
            )}
          </div>
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
