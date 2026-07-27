import { CustomSelect } from './CustomSelect'

interface FooterProps {
  llcPath: string
  onLlcPathChange: (path: string) => void
  architectures: Array<{name: string, description: string}>
  arch: string
  onArchChange: (arch: string) => void
  cpus: Array<{name: string, description: string}>
  cpu: string
  onCpuChange: (cpu: string) => void
  stage: string
  onStageChange: (stage: string) => void
  compareEnabled: boolean
  onCompareEnabledChange: (enabled: boolean) => void
  compareStage: string
  onCompareStageChange: (stage: string) => void
  onRun: () => void
  isLoading: boolean
  onViewMIR?: () => void
  isMIRLoading?: boolean
  mode?: 'selectiondag' | 'mir'
  onDiscoverPasses?: () => void
  isDiscovering?: boolean
  mirPasses?: Array<{name: string, id: string}>  // All MIR passes for dropdown
  selectedMirPass?: string  // Currently selected MIR pass ID
  onMirPassChange?: (passId: string) => void  // Handler for MIR pass selection
}

const DAG_STAGES = [
  { value: 'dag-combine1', label: 'dag-combine1' },
  { value: 'legalize', label: 'legalize' },
  { value: 'dag-combine2', label: 'dag-combine2' },
  { value: 'isel', label: 'isel' },
  { value: 'sched', label: 'sched' },
]

export function Footer({
  llcPath,
  onLlcPathChange,
  architectures,
  arch,
  onArchChange,
  cpus,
  cpu,
  onCpuChange,
  stage,
  onStageChange,
  compareEnabled,
  onCompareEnabledChange,
  compareStage,
  onCompareStageChange,
  onRun,
  isLoading,
  onViewMIR,
  isMIRLoading = false,
  mode = 'selectiondag',
  onDiscoverPasses,
  isDiscovering = false,
  mirPasses = [],
  selectedMirPass = '',
  onMirPassChange
}: FooterProps) {
  const archOptions = architectures.map(a => ({ value: a.name, label: a.name }))
  const cpuOptions = cpus.map(c => ({ value: c.name, label: c.name }))

  // MIR pass options with count header
  const mirPassOptions = mirPasses.length > 0
    ? [
        { value: '', label: `${mirPasses.length} passes discovered` },
        ...mirPasses.map(p => ({ value: p.id, label: p.name }))
      ]
    : [{ value: '', label: 'Discover passes first' }]
  return (
    <div
      className="bg-[#000000] border-t border-[#1a1a1a] px-6 py-2 flex items-center justify-between"
      style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}
    >
      {/* Left side - Settings display */}
      <div className="flex items-center gap-4 text-[#c8c8c8]">
        <div className="flex items-center gap-2">
          <span className="text-[#909090]">llc:</span>
          <input
            type="text"
            value={llcPath}
            onChange={(e) => onLlcPathChange(e.target.value)}
            placeholder="/path/to/llc"
            className="bg-[#000000] text-[#18a018] border border-[#1a1a1a] px-2 py-1 rounded text-xs hover:border-[#18a018] focus:border-[#18a018] focus:outline-none"
            style={{ fontFamily: 'JetBrains Mono, monospace', width: '350px' }}
          />
        </div>
        <div className="w-px h-4 bg-[#1a1a1a]"></div>
        <div className="flex items-center gap-2">
          <span className="text-[#909090]">Arch:</span>
          <CustomSelect
            value={arch}
            options={archOptions.length > 0 ? archOptions : [{ value: arch, label: arch }]}
            onChange={onArchChange}
            disabled={archOptions.length === 0}
          />
        </div>
        <div className="w-px h-4 bg-[#1a1a1a]"></div>
        <div className="flex items-center gap-2">
          <span className="text-[#909090]">GPU:</span>
          <CustomSelect
            key={`cpu-${cpus.length}-${cpu}`}
            value={cpu}
            options={cpuOptions.length > 0 ? cpuOptions : [{ value: cpu, label: cpu }]}
            onChange={onCpuChange}
            disabled={cpuOptions.length === 0}
          />
        </div>

        {/* Common control - Stage/MIR Pass selector */}
        <div className="w-px h-4 bg-[#1a1a1a]"></div>
        <div className="flex items-center gap-2">
          <span className="text-[#909090]">
            {mode === 'selectiondag' ? 'Stage:' : 'MIR Pass:'}
          </span>
          {mode === 'selectiondag' ? (
            <CustomSelect value={stage} options={DAG_STAGES} onChange={onStageChange} />
          ) : (
            <CustomSelect
              value={selectedMirPass}
              options={mirPassOptions}
              onChange={(value) => onMirPassChange && onMirPassChange(value)}
              disabled={mirPasses.length === 0}
            />
          )}
        </div>

        {/* SelectionDAG-specific controls */}
        {mode === 'selectiondag' && (
          <>
            <div className="w-px h-4 bg-[#1a1a1a]"></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => onCompareEnabledChange(e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer accent-[#18a018]"
                />
                <span className="text-[#909090]">Compare</span>
              </label>
              {compareEnabled && (
                <>
                  <span className="text-[#909090]">vs</span>
                  <CustomSelect value={compareStage} options={DAG_STAGES} onChange={onCompareStageChange} />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right side - Buttons */}
      <div className="flex items-center gap-3">
        {/* SelectionDAG mode buttons */}
        {mode === 'selectiondag' && (
          <>
            {onViewMIR && (
              <button
                onClick={onViewMIR}
                disabled={isMIRLoading}
                className="px-6 py-1.5 text-[#18a018] font-bold text-sm hover:text-[#20c020] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {isMIRLoading ? 'Generating...' : 'View MIR'}
              </button>
            )}
            <button
              onClick={onRun}
              disabled={isLoading}
              className="px-6 py-1.5 text-[#18a018] font-bold text-sm hover:text-[#20c020] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {isLoading ? 'Running...' : '▶ RUN'}
            </button>
          </>
        )}

        {/* MIR mode buttons */}
        {mode === 'mir' && (
          <>
            {onViewMIR && (
              <button
                onClick={onViewMIR}
                disabled={isMIRLoading}
                className="px-6 py-1.5 text-[#18a018] font-bold text-sm hover:text-[#20c020] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {isMIRLoading ? 'Generating...' : 'View MIR'}
              </button>
            )}
            {onDiscoverPasses && (
              <button
                onClick={onDiscoverPasses}
                disabled={isDiscovering}
                className="px-6 py-1.5 text-[#18a018] font-bold text-sm hover:text-[#20c020] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {isDiscovering ? 'Discovering...' : 'Discover Passes'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
