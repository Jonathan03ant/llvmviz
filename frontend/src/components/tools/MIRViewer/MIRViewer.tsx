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

interface MIRTab {
  passId: string
  passName: string
  content: string | null
  loading: boolean
}

export function MIRViewer({ irCode, llcPath, arch, mcpu, onIRCodeChange, terminalOutput, onTerminalUpdate, onDiscoverPassesChange, onPipelineChange, onSelectedPassChange, onPassSelectHandlerChange }: MIRViewerProps) {
  const [pipeline, setPipeline] = useState<MIRPipeline | null>(null)
  const [tabs, setTabs] = useState<MIRTab[]>([])
  const [activeTabIndex, setActiveTabIndex] = useState<number>(-1)
  const [loadingPipeline, setLoadingPipeline] = useState(false)

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
  }, [loadingPipeline, irCode, llcPath, arch, mcpu])

  // Expose pipeline to parent (for Footer dropdown)
  useEffect(() => {
    if (onPipelineChange) {
      onPipelineChange(pipeline)
    }
  }, [pipeline])

  // Expose selected pass to parent (for Footer dropdown)
  useEffect(() => {
    if (onSelectedPassChange) {
      const activeTab = tabs[activeTabIndex]
      onSelectedPassChange(activeTab?.passId || null)
    }
  }, [activeTabIndex])

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
    const existingTabIndex = tabs.findIndex(tab => tab.passId === passId)

    if (existingTabIndex !== -1) {
      setActiveTabIndex(existingTabIndex)
      return
    }

    const passName = pipeline?.all_passes.find(p => p.id === passId)?.name || passId

    const newTab: MIRTab = {
      passId,
      passName,
      content: null,
      loading: true
    }

    const newTabIndex = tabs.length
    setTabs([...tabs, newTab])
    setActiveTabIndex(newTabIndex)

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

      const text = await response.text()

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from server')
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`)
      }

      let data
      try {
        data = JSON.parse(text)
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError)
        console.error('Response text:', text.substring(0, 500))
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`)
      }

      if (data.terminal_output && onTerminalUpdate) {
        onTerminalUpdate(data.terminal_output)
      }

      const mirContent = data.success
        ? data.mir_content
        : `# Error generating MIR for pass: ${passId}\n\n${data.error || 'Unknown error'}\n\n# This pass may not support -stop-after\n# Try selecting a different pass from the sidebar`

      setTabs(prevTabs => prevTabs.map((tab, idx) =>
        idx === newTabIndex ? { ...tab, content: mirContent, loading: false } : tab
      ))
    } catch (error) {
      console.error('Error generating MIR:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorContent = `# Error: ${errorMessage}\n\n# Failed to communicate with backend\n# Pass ID: ${passId}`

      setTabs(prevTabs => prevTabs.map((tab, idx) =>
        idx === newTabIndex ? { ...tab, content: errorContent, loading: false } : tab
      ))

      if (onTerminalUpdate) {
        const timestamp = new Date().toLocaleTimeString()
        onTerminalUpdate([{
          type: 'error',
          text: `Error generating MIR for ${passId}: ${errorMessage}`,
          timestamp
        }])
      }
    }
  }

  const handleCloseTab = (index: number) => {
    const newTabs = tabs.filter((_, idx) => idx !== index)

    if (newTabs.length === 0) {
      setTabs([])
      setActiveTabIndex(-1)
      return
    }

    setTabs(newTabs)

    if (activeTabIndex === index) {
      const newActiveIndex = index >= newTabs.length ? newTabs.length - 1 : index
      setActiveTabIndex(newActiveIndex)
    } else if (activeTabIndex > index) {
      setActiveTabIndex(activeTabIndex - 1)
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
            selectedPass={tabs[activeTabIndex]?.passId || null}
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
            tabs={tabs}
            activeTabIndex={activeTabIndex}
            onTabChange={setActiveTabIndex}
            onTabClose={handleCloseTab}
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
            isRunning={loadingPipeline || tabs.some(tab => tab.loading)}
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
