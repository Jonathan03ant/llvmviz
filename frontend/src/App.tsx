import { useState, useEffect, useRef } from 'react'
import { Header, InputPanel, Footer, MIRModal } from './components/common'
import type { TerminalLine } from './components/common'
import { SelectionDAGViewer, MIRViewer } from './components/tools'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('selectiondag')
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [irCode, setIrCode] = useState('')
  const [stage, setStage] = useState('isel')
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([])


  // Compare mode state
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [compareStage, setCompareStage] = useState('legalize')
  const [compareNodes, setCompareNodes] = useState<any[]>([])
  const [compareEdges, setCompareEdges] = useState<any[]>([])
  const [comparison, setComparison] = useState<any>(null)

  // Settings - dynamic arch/CPU
  const [llcConfigs, setLlcConfigs] = useState<Array<{id: string, name: string, description: string, path: string, default: boolean, default_arch: string | null, default_cpu: string | null}>>([])
  const [selectedLlcConfig, setSelectedLlcConfig] = useState('universal')
  const [llcPath, setLlcPath] = useState('')  // Will be set by fetchLlcConfigs
  const [architectures, setArchitectures] = useState<Array<{name: string, description: string}>>([])
  const [cpus, setCpus] = useState<Array<{name: string, description: string}>>([])
  const [arch, setArch] = useState('')
  const [cpu, setCpu] = useState('')
  const [loadingTargets, setLoadingTargets] = useState(false)

  // MIR viewer state
  const [showMIRModal, setShowMIRModal] = useState(false)
  const [mirContent, setMirContent] = useState('')
  const [mirLoading, setMirLoading] = useState(false)

  // MIR discover state (for Footer button)
  const [mirDiscoverHandler, setMirDiscoverHandler] = useState<(() => void) | null>(null)
  const [mirDiscovering, setMirDiscovering] = useState(false)

  // MIR pipeline state (for Footer dropdown)
  const [mirPipeline, setMirPipeline] = useState<any>(null)
  const [selectedMirPass, setSelectedMirPass] = useState<string>('')
  const [mirPassSelectHandler, setMirPassSelectHandler] = useState<((passId: string) => void) | null>(null)

  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(40)
  const [isResizing, setIsResizing] = useState(false)
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const deltaX = e.clientX - startXRef.current
      const containerWidth = window.innerWidth
      const deltaPercent = (deltaX / containerWidth) * 100
      const newWidth = Math.max(20, Math.min(80, startWidthRef.current + deltaPercent))
      setLeftPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = leftPanelWidth
  }

  // Fetch LLC configs on mount
  useEffect(() => {
    const fetchLlcConfigs = async () => {
      try {
        const response = await fetch('/api/llc_configs')
        const data = await response.json()
        if (data.configs) {
          setLlcConfigs(data.configs)
          // Set default config
          const defaultConfig = data.configs.find((c: any) => c.default)
          if (defaultConfig) {
            setSelectedLlcConfig(defaultConfig.id)
            setLlcPath(defaultConfig.path)
            // Set default arch/cpu based on config
            setArch(defaultConfig.default_arch || '')
            setCpu(defaultConfig.default_cpu || '')
          }
        }
      } catch (error) {
        console.error('Failed to fetch LLC configs:', error)
      }
    }
    fetchLlcConfigs()
  }, [])

  // Get viewable MIR passes for footer dropdown
  const getAllMirPasses = () => {
    if (!mirPipeline) return []

    // Use viewable_passes directly from pipeline
    if (mirPipeline.viewable_passes) {
      return mirPipeline.viewable_passes.map((p: any) => ({
        name: p.name,
        id: p.pass_id
      }))
    }

    return []
  }

  // Handle LLC config change
  const handleLlcConfigChange = (configId: string) => {
    setSelectedLlcConfig(configId)
    const config = llcConfigs.find(c => c.id === configId)
    if (config) {
      setLlcPath(config.path)
      // Set defaults based on config
      setArch(config.default_arch || '')
      setCpu(config.default_cpu || '')
      // Clear architecture/CPU lists, will be fetched when llcPath changes
      setArchitectures([])
      setCpus([])
    }
  }

  // Fetch architectures when llc path changes
  const fetchArchitectures = async (path: string) => {
    if (!path || path === '/path/to/llc') return

    setLoadingTargets(true)
    try {
      const response = await fetch(`/api/targets?llc_path=${encodeURIComponent(path)}`)

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
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`)
      }

      if (response.ok && data.architectures) {
        setArchitectures(data.architectures)
        // Don't auto-select arch - let LLC config defaults handle it
      }
    } catch (error) {
      console.error('Failed to fetch architectures:', error)
    } finally {
      setLoadingTargets(false)
    }
  }

  // Fetch CPUs when arch changes
  const fetchCpus = async (path: string, architecture: string) => {
    if (!path || path === '/path/to/llc' || !architecture) return

    setLoadingTargets(true)
    try {
      const response = await fetch(`/api/targets?llc_path=${encodeURIComponent(path)}&arch=${architecture}`)

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
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`)
      }

      if (response.ok && data.cpus) {
        setCpus(data.cpus)
        // Don't auto-select CPU - let LLC config defaults handle it
      }
    } catch (error) {
      console.error('Failed to fetch CPUs:', error)
    } finally {
      setLoadingTargets(false)
    }
  }

  // Trigger fetch when llc path or arch changes
  useEffect(() => {
    fetchArchitectures(llcPath)
  }, [llcPath])

  useEffect(() => {
    if (arch) {
      fetchCpus(llcPath, arch)
    }
  }, [llcPath, arch])

  const handleRun = async () => {
    if (!irCode.trim()) {
      alert('Please paste LLVM IR code first')
      return
    }

    setLoading(true)

    // Clear previous output and show command
    const timestamp = new Date().toLocaleTimeString()
    setTerminalOutput([{
      type: 'command',
      text: `llc -march=${arch} -mcpu=${cpu} -view-${stage}-dags input.ll`,
      timestamp
    }])

    try {
      const requestBody: any = {
        ir_code: irCode,
        stage: stage,
        llc_path: llcPath.trim(),
        arch: arch,
        mcpu: cpu
      }

      // Add compare_stage if compare mode is enabled
      if (compareEnabled) {
        requestBody.compare_stage = compareStage
      }

      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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

      // Update terminal output (from both success and error responses)
      if (data.terminal_output) {
        setTerminalOutput(data.terminal_output)
      }

      // Only update graph if successful
      if (response.ok) {
        setNodes(data.nodes || [])
        setEdges(data.edges || [])

        // Update compare data if available
        if (data.compare_nodes && data.compare_edges) {
          setCompareNodes(data.compare_nodes)
          setCompareEdges(data.compare_edges)
          setComparison(data.comparison)
        } else {
          // Clear compare data if not in compare mode
          setCompareNodes([])
          setCompareEdges([])
          setComparison(null)
        }
      }
    } catch (error) {
      console.error('Compile error:', error)
      setTerminalOutput(prev => [...prev, {
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleViewMIR = async () => {
    if (!irCode.trim()) {
      alert('Please paste LLVM IR code first')
      return
    }

    setMirLoading(true)
    try {
      const response = await fetch('/api/generate_mir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ir_code: irCode,
          llc_path: llcPath.trim(),
          arch: arch,
          mcpu: cpu
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

      if (data.success) {
        setMirContent(data.mir)
        setShowMIRModal(true)
      } else {
        alert(`Failed to generate MIR: ${data.error}`)
      }
    } catch (error) {
      console.error('Error generating MIR:', error)
      alert('Failed to generate MIR')
    } finally {
      setMirLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Tabs */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: '#000000', position: 'relative' }}>
        {/* SelectionDAG: 2-panel layout (Input + Graph) */}
        {activeTab === 'selectiondag' && (
          <>
            {/* Left Panel - Input */}
            {!isLeftPanelCollapsed && (
              <div style={{
                width: `${leftPanelWidth}%`,
                backgroundColor: '#0a0a0a',
                overflow: 'auto',
                position: 'relative'
              }}>
                <InputPanel
                  value={irCode}
                  onChange={setIrCode}
                  terminalOutput={terminalOutput}
                  isRunning={loading}
                />

                {/* Resize Handle */}
                <div
                  onMouseDown={handleResizeStart}
                  className="group"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '4px',
                    height: '100%',
                    cursor: 'ew-resize',
                    zIndex: 1000
                  }}
                >
                  <div className="w-0.5 h-full bg-transparent group-hover:bg-[#18a018] transition-colors ml-[1.75px]" />
                </div>
              </div>
            )}

            {/* Collapse/Expand Button */}
            <button
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
              style={{
                position: 'absolute',
                left: isLeftPanelCollapsed ? '0' : `${leftPanelWidth}%`,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1001,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                border: 'none',
                color: '#808080',
                padding: '12px 2px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s ease',
                borderRadius: '0 6px 6px 0',
                boxShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
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
              {isLeftPanelCollapsed ? '→' : '←'}
            </button>

            {/* Right Panel - Graph */}
            <div style={{ width: isLeftPanelCollapsed ? '100%' : `${100 - leftPanelWidth}%`, position: 'relative', backgroundColor: '#0a0a0a' }}>
              {loading && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '20px',
                  color: '#18a018'
                }}>
                  Running...
                </div>
              )}
              <SelectionDAGViewer
                nodes={nodes}
                edges={edges}
                stage={stage}
                compareNodes={compareNodes}
                compareEdges={compareEdges}
                comparison={comparison}
              />
            </div>
          </>
        )}

        {/* MIR: Full-width viewer (handles its own layout internally) */}
        {activeTab === 'mir' && (
          <MIRViewer
            irCode={irCode}
            llcPath={llcPath}
            arch={arch}
            mcpu={cpu}
            onIRCodeChange={setIrCode}
            terminalOutput={terminalOutput}
            onTerminalUpdate={setTerminalOutput}
            onDiscoverPassesChange={(handler, isLoading) => {
              setMirDiscoverHandler(() => handler)
              setMirDiscovering(isLoading)
            }}
            onPipelineChange={setMirPipeline}
            onSelectedPassChange={(passId) => setSelectedMirPass(passId || '')}
            onPassSelectHandlerChange={(handler) => setMirPassSelectHandler(() => handler)}
          />
        )}
      </div>

      {/* Footer */}
      <Footer
        llcPath={llcPath}
        onLlcPathChange={setLlcPath}
        llcConfigs={llcConfigs}
        selectedLlcConfig={selectedLlcConfig}
        onLlcConfigChange={handleLlcConfigChange}
        architectures={architectures}
        arch={arch}
        onArchChange={setArch}
        cpus={cpus}
        cpu={cpu}
        onCpuChange={setCpu}
        stage={stage}
        onStageChange={setStage}
        compareEnabled={compareEnabled}
        onCompareEnabledChange={setCompareEnabled}
        compareStage={compareStage}
        onCompareStageChange={setCompareStage}
        onRun={handleRun}
        isLoading={loading || loadingTargets}
        onViewMIR={handleViewMIR}
        isMIRLoading={mirLoading}
        mode={activeTab as 'selectiondag' | 'mir'}
        onDiscoverPasses={mirDiscoverHandler || undefined}
        isDiscovering={mirDiscovering}
        mirPasses={getAllMirPasses()}
        selectedMirPass={selectedMirPass}
        onMirPassChange={(passId) => {
          if (mirPassSelectHandler) {
            mirPassSelectHandler(passId)
          }
        }}
      />

      {/* MIR Modal */}
      <MIRModal
        isOpen={showMIRModal}
        onClose={() => setShowMIRModal(false)}
        mirContent={mirContent}
        filename="output.mir"
      />
    </div>
  )
}

export default App
