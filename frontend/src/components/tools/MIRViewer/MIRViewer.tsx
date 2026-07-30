import { useState, useEffect, useRef } from 'react'
import { MIRPassSidebar } from './MIRPassSidebar'
import { MIRContentView } from './MIRContentView'
import { InputPanel } from '../../common'
import type { TerminalLine } from '../../common'

interface MIRViewerProps {
  irCode: string
  llcPath: string
  arch: string
  mcpu: string
  onIRCodeChange: (code: string) => void
  terminalOutput: TerminalLine[]
  onTerminalUpdate?: (lines: TerminalLine[]) => void  // NEW: Update terminal
  onDiscoverPassesChange?: (handler: () => void, isLoading: boolean) => void
  onPipelineChange?: (pipeline: MIRPipeline | null) => void
  onSelectedPassChange?: (passId: string | null) => void
  onPassSelectHandlerChange?: (handler: (passId: string) => void) => void  // Expose pass selector
}

export interface MIRPass {
  name: string
  id: string
  viewable?: boolean
  section?: string
  color?: string
  importance?: string
  stage?: string
  is_transition?: boolean
  reason?: string
  supports_stop_after?: boolean
}

export interface MIRSection {
  name: string
  stage_id: string
  passes: MIRPass[]
  count: number
}

export interface MIRPipeline {
  total_passes: number
  viewable_count: number
  all_passes: MIRPass[]  // All 171 passes with sections/colors
  viewable_passes: MIRPass[]  // 85 viewable with full analysis
  sections: MIRSection[]  // Dynamically detected sections
  semantic_stages?: any  // DEPRECATED: For backward compatibility
}

export function MIRViewer({ irCode, llcPath, arch, mcpu, onIRCodeChange, terminalOutput, onTerminalUpdate, onDiscoverPassesChange, onPipelineChange, onSelectedPassChange, onPassSelectHandlerChange }: MIRViewerProps) {
  const [pipeline, setPipeline] = useState<MIRPipeline | null>(null)
  const [selectedPass, setSelectedPass] = useState<string | null>(null)
  const [mirContent, setMirContent] = useState<string | null>(null)
  const [loadingPipeline, setLoadingPipeline] = useState(false)
  const [loadingMIR, setLoadingMIR] = useState(false)

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(400)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const sidebarStartXRef = useRef(0)
  const sidebarStartWidthRef = useRef(0)

  // Collapsible bottom panel state
  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false)

  const handleDiscoverPasses = async () => {
    if (!irCode.trim()) {
      alert('Please enter LLVM IR code first in the input panel below')
      return
    }

    setLoadingPipeline(true)

    try {
      const response = await fetch('/api/discover_mir_passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ir_code: irCode,
          llc_path: llcPath,
          arch: arch,
          mcpu: mcpu
        })
      })

      // Read response text once
      const text = await response.text()
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from server')
      }

      // Parse JSON
      let data
      try {
        data = JSON.parse(text)
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError)
        console.error('Response text:', text.substring(0, 500))
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`)
      }

      // Update terminal output
      if (data.terminal_output && onTerminalUpdate) {
        onTerminalUpdate(data.terminal_output)
      }

      if (data.success) {
        setPipeline(data.pipeline)
      }
    } catch (error) {
      console.error('Error discovering passes:', error)
      // Show error in terminal
      if (onTerminalUpdate) {
        const timestamp = new Date().toLocaleTimeString()
        onTerminalUpdate([{
          type: 'error',
          text: `Error discovering passes: ${error}`,
          timestamp
        }])
      }
    } finally {
      setLoadingPipeline(false)
    }
  }

  // Expose discover handler to parent (for Footer button)
  useEffect(() => {
    if (onDiscoverPassesChange) {
      onDiscoverPassesChange(handleDiscoverPasses, loadingPipeline)
    }
  }, [loadingPipeline, irCode, llcPath, arch, mcpu, onDiscoverPassesChange])

  // Expose pipeline to parent (for Footer dropdown)
  useEffect(() => {
    if (onPipelineChange) {
      onPipelineChange(pipeline)
    }
  }, [pipeline, onPipelineChange])

  // Expose selected pass to parent (for Footer dropdown)
  useEffect(() => {
    if (onSelectedPassChange) {
      onSelectedPassChange(selectedPass)
    }
  }, [selectedPass, onSelectedPassChange])

  // Expose pass selector to parent (for Footer to trigger pass selection)
  useEffect(() => {
    if (onPassSelectHandlerChange) {
      onPassSelectHandlerChange(handlePassSelect)
    }
  }, [])

  // Sidebar resize handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return
      const deltaX = e.clientX - sidebarStartXRef.current
      const newWidth = Math.max(250, Math.min(600, sidebarStartWidthRef.current + deltaX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizingSidebar(false)
    }

    if (isResizingSidebar) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingSidebar])

  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingSidebar(true)
    sidebarStartXRef.current = e.clientX
    sidebarStartWidthRef.current = sidebarWidth
  }

  const handlePassSelect = async (passId: string) => {
    setSelectedPass(passId)
    setLoadingMIR(true)
    setMirContent(null)

    try {
      const response = await fetch('/api/generate_mir_at_pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ir_code: irCode,
          llc_path: llcPath,
          arch: arch,
          mcpu: mcpu,
          pass_id: passId
        })
      })

      // Read response body once (calling .text() twice consumes stream!)
      const text = await response.text()

      // Check if response has content
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from server')
      }

      // Check if response was OK
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`)
      }

      // Parse JSON
      let data
      try {
        data = JSON.parse(text)
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError)
        console.error('Response text:', text.substring(0, 500))
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`)
      }

      // Update terminal output
      if (data.terminal_output && onTerminalUpdate) {
        onTerminalUpdate(data.terminal_output)
      }

      if (data.success) {
        setMirContent(data.mir_content)
      } else {
        // Show error message in MIR content area
        const errorMsg = `# Error generating MIR for pass: ${passId}\n\n${data.error || 'Unknown error'}\n\n# This pass may not support -stop-after\n# Try selecting a different pass from the sidebar`
        setMirContent(errorMsg)
      }
    } catch (error) {
      console.error('Error generating MIR:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setMirContent(`# Error: ${errorMessage}\n\n# Failed to communicate with backend\n# Pass ID: ${passId}`)

      // Show error in terminal
      if (onTerminalUpdate) {
        const timestamp = new Date().toLocaleTimeString()
        onTerminalUpdate([{
          type: 'error',
          text: `Error generating MIR for ${passId}: ${errorMessage}`,
          timestamp
        }])
      }
    } finally {
      setLoadingMIR(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: '#0a0a0a',
      position: 'relative'
    }}>
      {/* Top: Sidebar + Content */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Left Sidebar - Pass List (resizable) */}
        <div style={{ width: `${sidebarWidth}px`, position: 'relative' }}>
          <MIRPassSidebar
            pipeline={pipeline}
            selectedPass={selectedPass}
            onPassSelect={handlePassSelect}
          />
          {/* Resize handle */}
          <div
            onMouseDown={handleSidebarResizeStart}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '4px',
              height: '100%',
              cursor: 'ew-resize',
              backgroundColor: 'transparent',
              zIndex: 10
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#18a018'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          />
        </div>

        {/* Right Content - MIR Display */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MIRContentView
            mirContent={mirContent}
            selectedPass={selectedPass}
            loading={loadingMIR}
          />
        </div>
      </div>

      {/* Bottom: Input Panel */}
      {!isBottomPanelCollapsed && (
        <div style={{
          height: '300px',
          minHeight: '300px',
          borderTop: '1px solid #1a1a1a',
          backgroundColor: '#0a0a0a'
        }}>
          <InputPanel
            value={irCode}
            onChange={onIRCodeChange}
            terminalOutput={terminalOutput}
            isRunning={loadingPipeline || loadingMIR}
            layout="horizontal"
          />
        </div>
      )}

      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsBottomPanelCollapsed(!isBottomPanelCollapsed)}
        style={{
          position: 'absolute',
          bottom: isBottomPanelCollapsed ? '0' : '300px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          border: 'none',
          color: '#808080',
          padding: '2px 12px',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          transition: 'all 0.2s ease',
          borderRadius: '6px 6px 0 0',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.3)',
          opacity: 0.6
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#18a018'
          e.currentTarget.style.opacity = '1'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#808080'
          e.currentTarget.style.opacity = '0.6'
        }}
      >
        {isBottomPanelCollapsed ? '↑' : '↓'}
      </button>
    </div>
  )
}
