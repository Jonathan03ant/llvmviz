import { useState, useRef, useEffect } from 'react'

interface TerminalOutputProps {
  output: TerminalLine[]
  isRunning: boolean
  alwaysExpanded?: boolean
}

export interface TerminalLine {
  type: 'command' | 'stdout' | 'stderr' | 'success' | 'error'
  text: string
  timestamp?: string
}

export function TerminalOutput({ output, isRunning, alwaysExpanded = false }: TerminalOutputProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [height, setHeight] = useState(400)
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current && output.length > 0) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [output])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaY = startYRef.current - e.clientY
      const newHeight = Math.max(80, Math.min(400, startHeightRef.current + deltaY))
      setHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startYRef.current = e.clientY
    startHeightRef.current = height
  }

  const hasError = output.some(line => line.type === 'error')
  const hasSuccess = output.some(line => line.type === 'success')

  const getStatusIcon = () => {
    if (isRunning) return <span className="text-[#18a018] text-xs animate-pulse">●</span>
    if (hasError) return <span className="text-[#ff4444] text-sm">✗</span>
    if (hasSuccess) return <span className="text-[#18a018] text-sm">✓</span>
    return null
  }

  const getStatusText = () => {
    if (isRunning) return 'Running...'
    if (hasError) return 'Failed'
    if (hasSuccess) return 'Success'
    return 'Ready'
  }

  return (
    <div className={alwaysExpanded ? "" : "border-t border-[#1a1a1a] relative"} style={alwaysExpanded ? { height: '100%', display: 'flex', flexDirection: 'column' } : undefined}>
      {/* Resize handle - hide when always expanded */}
      {!alwaysExpanded && isExpanded && (
        <div
          onMouseDown={handleDragStart}
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize z-10 group"
          style={{ transform: 'translateY(-2px)' }}
        >
          <div className="h-0.5 bg-transparent group-hover:bg-[#18a018] transition-colors" />
        </div>
      )}

      {/* Header - hide when always expanded */}
      {!alwaysExpanded && (
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-[#0a0a0a] px-3 py-1 flex items-center justify-between cursor-pointer hover:bg-[#111111] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[#606060] text-xs">{isExpanded ? '▼' : '▶'}</span>
            <span className="text-[#909090] text-xs">Terminal</span>
            <div className="flex items-center gap-1.5">
              {getStatusIcon()}
              <span className={`text-xs ${hasError ? 'text-[#ff4444]' : hasSuccess ? 'text-[#18a018]' : 'text-[#606060]'}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
          <span className="text-[#606060] text-xs">{output.length} lines</span>
        </div>
      )}

      {(isExpanded || alwaysExpanded) && (
        <div
          ref={terminalRef}
          className="bg-[#000000] px-2 py-1.5 overflow-y-auto text-left"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            height: alwaysExpanded ? '100%' : `${height}px`,
            lineHeight: '1.4',
            flex: alwaysExpanded ? 1 : undefined
          }}
        >
          {output.length === 0 ? (
            <div className="text-[#505050]">No output yet. Click RUN to compile.</div>
          ) : (
            output.map((line, idx) => (
              <div key={idx} className={getLineColor(line.type)} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {line.type === 'command' && '$ '}
                {line.text}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function getLineColor(type: TerminalLine['type']): string {
  switch (type) {
    case 'command':
      return 'text-[#18a018] font-semibold'
    case 'success':
      return 'text-[#18a018]'
    case 'error':
      return 'text-[#ff4444]'
    case 'stderr':
      return 'text-[#ff9944]'
    case 'stdout':
      return 'text-[#c8c8c8]'
    default:
      return 'text-[#909090]'
  }
}
