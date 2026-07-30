import { useState, useEffect } from 'react'
import { GraphCanvas, NodeDetailsPanel, layoutDag } from '../graph'

interface SelectionDAGViewerProps {
  nodes: any[]
  edges: any[]
  stage?: string
  compareNodes?: any[]
  compareEdges?: any[]
  comparison?: any
}

/**
 * SelectionDAG visualization tool
 * Orchestrates graph layout, rendering, and interaction
 */
export function SelectionDAGViewer({
  nodes,
  edges,
  stage = 'isel',
  compareNodes = [],
  compareEdges = [],
  comparison = null
}: SelectionDAGViewerProps) {
  // Check if we're in compare mode
  const isCompareMode = compareNodes.length > 0 && compareEdges.length > 0 && comparison

  // Primary stage state
  const [layoutedNodes, setLayoutedNodes] = useState<any[]>([])
  const [layoutedEdges, setLayoutedEdges] = useState<any[]>([])
  const [allNodes, setAllNodes] = useState<any[]>([])
  const [allEdges, setAllEdges] = useState<any[]>([])

  // Compare stage state
  const [compareLayoutedNodes, setCompareLayoutedNodes] = useState<any[]>([])
  const [compareLayoutedEdges, setCompareLayoutedEdges] = useState<any[]>([])
  const [allCompareNodes, setAllCompareNodes] = useState<any[]>([])
  const [allCompareEdges, setAllCompareEdges] = useState<any[]>([])

  // Suppress unused warnings - will be used for compare graph node selection
  void allCompareNodes
  void allCompareEdges

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [overlayPosition, setOverlayPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [activeTab, setActiveTab] = useState<'all' | 'isd' | 'amdgpu' | 'regs' | null>(null)
  const [compareActiveTab, setCompareActiveTab] = useState<'all' | 'isd' | 'amdgpu' | 'regs' | null>(null)

  // Compare graph selection state
  const [compareSelectedNodeId, setCompareSelectedNodeId] = useState<string | null>(null)
  const [compareOverlayPosition, setCompareOverlayPosition] = useState<{ x: number; y: number } | null>(null)
  const [compareIsDragging, setCompareIsDragging] = useState(false)
  const [compareDragOffset, setCompareDragOffset] = useState({ x: 0, y: 0 })

  // Layout primary stage nodes/edges
  useEffect(() => {
    console.log('🔄 Primary graph data received:', nodes.length, 'nodes,', edges.length, 'edges')

    // Clear state
    setLayoutedNodes([])
    setLayoutedEdges([])
    setSelectedNodeId(null)
    setOverlayPosition(null)
    setIsDragging(false)

    if (nodes.length > 0) {
      const { nodes: laidOutNodes, edges: laidOutEdges } = layoutDag(nodes, edges)

      // Apply comparison highlighting if in compare mode
      let highlightedNodes = laidOutNodes
      if (comparison) {
        highlightedNodes = laidOutNodes.map(node => {
          const opcode = node.data?.opcode || ''

          // Check if this operation will be REMOVED going from stage1→stage2
          const willBeRemoved = comparison.added_opcodes?.includes(opcode)

          if (willBeRemoved) {
            // Red shadow for operations that will be removed
            return {
              ...node,
              style: {
                ...node.style,
                border: '2px solid #ef4444',
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.8)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)'
              }
            }
          }

          return node
        })
      }

      setAllNodes(highlightedNodes)
      setAllEdges(laidOutEdges)
      setLayoutedNodes(highlightedNodes)
      setLayoutedEdges(laidOutEdges)
    }
  }, [nodes, edges, comparison])

  // Layout compare stage nodes/edges
  useEffect(() => {
    if (compareNodes.length > 0 && compareEdges.length > 0) {
      console.log('🔄 Compare graph data received:', compareNodes.length, 'nodes,', compareEdges.length, 'edges')
      const { nodes: laidOutNodes, edges: laidOutEdges } = layoutDag(compareNodes, compareEdges)

      // Apply comparison highlighting
      let highlightedNodes = laidOutNodes
      if (comparison) {
        highlightedNodes = laidOutNodes.map(node => {
          const opcode = node.data?.opcode || ''

          // Check if this operation was ADDED going from stage1→stage2
          const wasAdded = comparison.removed_opcodes?.includes(opcode)

          if (wasAdded) {
            // Blue shadow for operations that were added
            return {
              ...node,
              style: {
                ...node.style,
                border: '2px solid #3b82f6',
                boxShadow: '0 0 16px rgba(59, 130, 246, 0.8)',
                backgroundColor: 'rgba(59, 130, 246, 0.15)'
              }
            }
          }

          return node
        })
      }

      setAllCompareNodes(highlightedNodes)
      setAllCompareEdges(laidOutEdges)
      setCompareLayoutedNodes(highlightedNodes)
      setCompareLayoutedEdges(laidOutEdges)
    } else {
      // Clear compare state when not in compare mode
      setAllCompareNodes([])
      setAllCompareEdges([])
      setCompareLayoutedNodes([])
      setCompareLayoutedEdges([])
    }
  }, [compareNodes, compareEdges, comparison])

  // Node click handler
  const handleNodeClick = (event: any, node: any) => {
    if (selectedNodeId === node.id) {
      // Deselect - restore all nodes/edges
      setSelectedNodeId(null)
      setOverlayPosition(null)
      setLayoutedEdges(allEdges)
      setLayoutedNodes(allNodes.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } })))
    } else {
      // Select node - filter edges and dim unconnected nodes
      setSelectedNodeId(node.id)

      // Find connected edges
      const connectedEdges = allEdges.filter((edge) => edge.source === node.id || edge.target === node.id)

      // Build set of connected node IDs
      const connectedNodeIds = new Set<string>([node.id])
      connectedEdges.forEach((edge) => {
        connectedNodeIds.add(edge.source)
        connectedNodeIds.add(edge.target)
      })

      // Dim unconnected nodes
      setLayoutedNodes(
        allNodes.map((n) => ({
          ...n,
          style: {
            ...n.style,
            opacity: connectedNodeIds.has(n.id) ? 1 : 0.2,
          },
        }))
      )

      // Show only connected edges
      setLayoutedEdges(connectedEdges)

      // Position overlay near click
      setOverlayPosition({ x: event.clientX, y: event.clientY })
    }
  }

  // Edge click handler (placeholder)
  const handleEdgeClick = (_event: any, edge: any) => {
    console.log('Edge clicked:', edge)
    // TODO: Highlight edge, show edge details
  }

  // Pane click handler - deselect
  const handlePaneClick = () => {
    setSelectedNodeId(null)
    setOverlayPosition(null)
    setLayoutedEdges(allEdges)
    setLayoutedNodes(allNodes.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } })))
  }

  // Compare graph node click handler
  const handleCompareNodeClick = (event: any, node: any) => {
    if (compareSelectedNodeId === node.id) {
      // Deselect
      setCompareSelectedNodeId(null)
      setCompareOverlayPosition(null)
      setCompareLayoutedEdges(allCompareEdges)
      setCompareLayoutedNodes(allCompareNodes.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } })))
    } else {
      // Select node
      setCompareSelectedNodeId(node.id)

      // Find connected edges
      const connectedEdges = allCompareEdges.filter((edge) => edge.source === node.id || edge.target === node.id)

      // Build set of connected node IDs
      const connectedNodeIds = new Set<string>([node.id])
      connectedEdges.forEach((edge) => {
        connectedNodeIds.add(edge.source)
        connectedNodeIds.add(edge.target)
      })

      // Dim unconnected nodes
      setCompareLayoutedNodes(
        allCompareNodes.map((n) => ({
          ...n,
          style: {
            ...n.style,
            opacity: connectedNodeIds.has(n.id) ? 1 : 0.2,
          },
        }))
      )

      // Show only connected edges
      setCompareLayoutedEdges(connectedEdges)

      // Position overlay near click
      setCompareOverlayPosition({ x: event.clientX, y: event.clientY })
    }
  }

  // Compare graph pane click handler
  const handleComparePaneClick = () => {
    setCompareSelectedNodeId(null)
    setCompareOverlayPosition(null)
    setCompareLayoutedEdges(allCompareEdges)
    setCompareLayoutedNodes(allCompareNodes.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } })))
  }

  // Overlay drag handlers
  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (overlayPosition) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - overlayPosition.x,
        y: e.clientY - overlayPosition.y,
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && overlayPosition) {
      setOverlayPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add/remove drag listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  // Compare overlay drag handlers
  const handleCompareMouseMove = (e: MouseEvent) => {
    if (compareIsDragging && compareOverlayPosition) {
      setCompareOverlayPosition({
        x: e.clientX - compareDragOffset.x,
        y: e.clientY - compareDragOffset.y,
      })
    }
  }

  const handleCompareMouseUp = () => {
    setCompareIsDragging(false)
  }

  // Add/remove compare drag listeners
  useEffect(() => {
    if (compareIsDragging) {
      window.addEventListener('mousemove', handleCompareMouseMove)
      window.addEventListener('mouseup', handleCompareMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleCompareMouseMove)
        window.removeEventListener('mouseup', handleCompareMouseUp)
      }
    }
  }, [compareIsDragging, compareDragOffset])

  // Get selected node and its connections
  const selectedNode = selectedNodeId ? allNodes.find((n) => n.id === selectedNodeId) : null
  const inputs = selectedNodeId ? allEdges.filter((e) => e.target === selectedNodeId) : []
  const outputs = selectedNodeId ? allEdges.filter((e) => e.source === selectedNodeId) : []

  // Helper: Calculate graph statistics for any node set
  const calculateStats = (nodeSet: any[], edgeSet: any[]) => {
    if (nodeSet.length === 0) return null

    // Count AMDGPU-specific vs generic ISD nodes
    let amdgpuCount = 0
    let isdCount = 0
    const physicalRegs = new Set<string>()
    const virtualRegs = new Set<string>()

    nodes.forEach(node => {
      const opcode = node.data?.opcode || node.data?.label || ''

      // Check if AMDGPU-specific
      if (opcode.includes('AMDGPUISD') || opcode.includes('AMDGPU') || opcode.startsWith('SI_') || opcode.startsWith('V_')) {
        amdgpuCount++
      } else {
        isdCount++
      }

      // Extract registers from node data
      const nodeText = JSON.stringify(node.data)

      // Physical registers: $vgpr, $sgpr, $v, $s
      const physMatches = nodeText.match(/\$[vs]gpr\d+|\$[vs]\d+/g)
      if (physMatches) {
        physMatches.forEach(reg => physicalRegs.add(reg))
      }

      // Virtual registers: %name or %number
      const virtMatches = nodeText.match(/%[a-zA-Z_]\w*|%\d+/g)
      if (virtMatches) {
        virtMatches.forEach(reg => virtualRegs.add(reg))
      }
    })

    return {
      nodeCount: nodeSet.length,
      edgeCount: edgeSet.length,
      amdgpuCount,
      isdCount,
      physicalCount: physicalRegs.size,
      virtualCount: virtualRegs.size
    }
  }

  const stats = calculateStats(nodes, edges)
  const compareStats = calculateStats(compareNodes, compareEdges)
  void compareStats // Future: display stats for compare graph

  // Helper: Get nodes by category for any node set
  const getNodesByCategory = (nodeSet: any[], category: 'isd' | 'amdgpu' | 'regs') => {
    return nodeSet.filter(node => {
      const opcode = node.data?.opcode || node.data?.label || ''

      // Skip non-operation nodes (Register, Constant, EntryToken, etc.)
      if (!opcode || opcode.startsWith('Register') || opcode.startsWith('Constant') ||
          opcode === 'EntryToken' || opcode.includes('\\<')) {
        return false
      }

      if (category === 'isd') {
        // Generic ISD operations
        return !opcode.includes('AMDGPUISD') && !opcode.includes('AMDGPU') &&
               !opcode.startsWith('SI_') && !opcode.startsWith('V_')
      } else if (category === 'amdgpu') {
        // AMDGPU-specific operations
        return opcode.includes('AMDGPUISD') || opcode.includes('AMDGPU') ||
               opcode.startsWith('SI_') || opcode.startsWith('V_')
      } else if (category === 'regs') {
        // Register operations only
        return opcode.includes('CopyFromReg') || opcode.includes('CopyToReg') ||
               opcode.includes('COPY')
      }
      return false
    })
  }

  // Helper: Extract register list from any node set
  const getRegisterList = (nodeSet: any[]) => {
    const physicalRegs = new Set<string>()
    const virtualRegs = new Set<string>()

    nodeSet.forEach(node => {
      const nodeText = JSON.stringify(node.data)

      // Physical registers: $vgpr, $sgpr
      const physMatches = nodeText.match(/\$[vs]gpr\d+|\$[vs]\d+/g)
      if (physMatches) {
        physMatches.forEach(reg => physicalRegs.add(reg))
      }

      // Virtual registers: %name or %number
      const virtMatches = nodeText.match(/%[a-zA-Z_]\w*|%\d+/g)
      if (virtMatches) {
        virtMatches.forEach(reg => virtualRegs.add(reg))
      }
    })

    return {
      physical: Array.from(physicalRegs).sort(),
      virtual: Array.from(virtualRegs).sort()
    }
  }

  return (
    <div style={{
      height: '100%',
      width: '100%',
      backgroundColor: '#0a0a0a',
      position: 'relative',
      display: 'flex',
      flexDirection: 'row'
    }}>
      {/* Left Graph - Primary Stage */}
      <div style={{
        width: isCompareMode ? '50%' : '100%',
        height: '100%',
        position: 'relative',
        borderRight: isCompareMode ? '1px solid #1a1a1a' : 'none'
      }}>
        {/* Stage Label */}
        {isCompareMode && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '3px',
            padding: '4px 12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: '#f87171',
            fontWeight: 'bold'
          }}>
            {comparison?.stage1_name || stage} (red = removed)
          </div>
        )}

        {/* Floating Info Tabs - Top Left */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
        <div
          style={{
            backgroundColor: '#000000',
            border: '1px solid rgba(24, 160, 24, 0.3)',
            borderRadius: '2px',
            padding: '4px 6px',
            display: 'flex',
            gap: '6px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
          }}
        >
          {(['all', 'isd', 'amdgpu', 'regs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(activeTab === tab ? null : tab)}
              style={{
                background: activeTab === tab ? '#0a0a0a' : 'transparent',
                color: activeTab === tab ? '#18a018' : '#e0e0e0',
                border: activeTab === tab ? '1px solid #18a018' : '1px solid transparent',
                borderRadius: '2px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                fontWeight: activeTab === tab ? '500' : 'normal',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.color = '#ffffff'
                  e.currentTarget.style.background = '#0a0a0a'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.color = '#e0e0e0'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {tab === 'all' ? 'All' :
               tab === 'isd' ? 'Generic ISD' :
               tab === 'amdgpu' ? 'Target-Specific' : 'Registers'}
            </button>
          ))}
        </div>

        {/* Info Panel (drops down when tab is clicked) */}
        {activeTab && activeTab !== 'all' && (
          <div
            style={{
              marginTop: '6px',
              backgroundColor: '#000000',
              border: '1px solid #1a1a1a',
              borderRadius: '2px',
              padding: '8px 10px',
              maxWidth: '220px',
              maxHeight: '280px',
              overflowY: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              lineHeight: '1.5',
              color: '#c8c8c8',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
            }}
          >
            {activeTab === 'isd' && (() => {
              const opcodes = Array.from(new Set(
                getNodesByCategory(nodes, 'isd').map(node => node.data?.opcode || node.data?.label || node.id)
              )).sort()
              return (
                <div>
                  <div style={{ color: '#18a018', fontWeight: '600', marginBottom: '6px', fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>
                    Generic ISD Opcodes ({opcodes.length})
                  </div>
                  {opcodes.map((opcode, idx) => (
                    <div key={idx} style={{ padding: '3px 0', borderBottom: idx < opcodes.length - 1 ? '1px solid #0a0a0a' : 'none', color: '#f0f0f0' }}>
                      {opcode}
                    </div>
                  ))}
                </div>
              )
            })()}
            {activeTab === 'amdgpu' && (() => {
              const opcodes = Array.from(new Set(
                getNodesByCategory(nodes, 'amdgpu').map(node => node.data?.opcode || node.data?.label || node.id)
              )).sort()
              return (
                <div>
                  <div style={{ color: '#18a018', fontWeight: '600', marginBottom: '6px', fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>
                    Target-Specific Opcodes ({opcodes.length})
                  </div>
                  {opcodes.map((opcode, idx) => (
                    <div key={idx} style={{ padding: '3px 0', borderBottom: idx < opcodes.length - 1 ? '1px solid #0a0a0a' : 'none', color: '#f0f0f0' }}>
                      {opcode}
                    </div>
                  ))}
                </div>
              )
            })()}
            {activeTab === 'regs' && (() => {
              const regs = getRegisterList(nodes)
              return (
                <div>
                  <div style={{ color: '#18a018', fontWeight: '600', marginBottom: '6px', fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>
                    Physical Registers ({regs.physical.length})
                  </div>
                  {regs.physical.map((reg, idx) => (
                    <div key={idx} style={{ padding: '3px 0', borderBottom: idx < regs.physical.length - 1 ? '1px solid #0a0a0a' : 'none', color: '#f0f0f0' }}>
                      {reg}
                    </div>
                  ))}
                  <div style={{ color: '#18a018', fontWeight: '600', marginTop: '10px', marginBottom: '6px', fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>
                    Virtual Registers ({regs.virtual.length})
                  </div>
                  {regs.virtual.map((reg, idx) => (
                    <div key={idx} style={{ padding: '3px 0', borderBottom: idx < regs.virtual.length - 1 ? '1px solid #0a0a0a' : 'none', color: '#f0f0f0' }}>
                      {reg}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}
      </div>

        <GraphCanvas
          nodes={layoutedNodes}
          edges={layoutedEdges}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
        />

        {/* Floating Node Details Panel */}
        {selectedNode && overlayPosition && (
          <NodeDetailsPanel
            node={selectedNode}
            inputs={inputs}
            outputs={outputs}
            allNodes={allNodes}
            position={overlayPosition}
            isDragging={isDragging}
            onMouseDown={handleOverlayMouseDown}
          />
        )}

        {/* Floating Graph Stats Overlay - Bottom Right (only when NOT comparing) */}
        {stats && !isCompareMode && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(24, 160, 24, 0.3)',
            borderRadius: '4px',
            padding: '10px 14px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            color: '#c8c8c8',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          <div style={{ color: '#18a018', fontWeight: 'bold', marginBottom: '5px' }}>
            {stage}
          </div>
          <div>
            {stats.nodeCount} nodes, {stats.edgeCount} edges
          </div>
          <div>
            {stats.isdCount} generic ISD, {stats.amdgpuCount} target-specific
          </div>
          <div>
            phys: {stats.physicalCount} | virt: {stats.virtualCount}
          </div>
        </div>
        )}
      </div>

      {/* Right Graph - Compare Stage (only shown in compare mode) */}
      {isCompareMode && (
        <div style={{ width: '50%', height: '100%', position: 'relative' }}>
          {/* Stage Label */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '3px',
            padding: '4px 12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: '#60a5fa',
            fontWeight: 'bold'
          }}>
            {comparison?.stage2_name || 'compare'} (blue = added)
          </div>

          {/* Floating Info Tabs - Top Left (Compare Graph) */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
            <div style={{
              backgroundColor: '#000000',
              border: '1px solid rgba(24, 160, 24, 0.3)',
              borderRadius: '2px',
              padding: '4px 6px',
              display: 'flex',
              gap: '6px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
            }}>
              {(['all', 'isd', 'amdgpu', 'regs'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCompareActiveTab(compareActiveTab === tab ? null : tab)}
                  style={{
                    background: compareActiveTab === tab ? '#0a0a0a' : 'transparent',
                    color: compareActiveTab === tab ? '#18a018' : '#e0e0e0',
                    border: compareActiveTab === tab ? '1px solid #18a018' : '1px solid transparent',
                    borderRadius: '2px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    fontWeight: compareActiveTab === tab ? '500' : 'normal',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (compareActiveTab !== tab) {
                      e.currentTarget.style.color = '#ffffff'
                      e.currentTarget.style.background = '#0a0a0a'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (compareActiveTab !== tab) {
                      e.currentTarget.style.color = '#e0e0e0'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {tab === 'all' ? 'All' :
                   tab === 'isd' ? 'Generic ISD' :
                   tab === 'amdgpu' ? 'Target-Specific' : 'Registers'}
                </button>
              ))}
            </div>

            {/* Info Panel for Compare Graph */}
            {compareActiveTab && compareActiveTab !== 'all' && (
              <div style={{
                marginTop: '6px',
                backgroundColor: '#000000',
                border: '1px solid #1a1a1a',
                borderRadius: '2px',
                padding: '8px 10px',
                maxWidth: '220px',
                maxHeight: '280px',
                overflowY: 'auto',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                lineHeight: '1.5',
                color: '#c8c8c8',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
              }}>
                {compareActiveTab === 'isd' && (() => {
                  const opcodes = Array.from(new Set(
                    getNodesByCategory(compareNodes, 'isd').map(node => node.data?.opcode || node.data?.label || node.id)
                  )).sort()
                  return (
                    <div>
                      <div style={{ color: '#18a018', fontWeight: '600', marginBottom: '6px', fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>
                        Generic ISD Opcodes ({opcodes.length})
                      </div>
                      {opcodes.map((opcode, idx) => (
                        <div key={idx} style={{ padding: '3px 0', borderBottom: idx < opcodes.length - 1 ? '1px solid #0a0a0a' : 'none', color: '#c8c8c8' }}>
                          {opcode}
                        </div>
                      ))}
                    </div>
                  )
                })()}
                {compareActiveTab === 'amdgpu' && (() => {
                  const opcodes = Array.from(new Set(
                    getNodesByCategory(compareNodes, 'amdgpu').map(node => node.data?.opcode || node.data?.label || node.id)
                  )).sort()
                  return (
                    <div>
                      <div style={{ color: '#18a018', fontWeight: '600', marginBottom: '6px', fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>
                        Target-Specific Opcodes ({opcodes.length})
                      </div>
                      {opcodes.map((opcode, idx) => (
                        <div key={idx} style={{ padding: '3px 0', borderBottom: idx < opcodes.length - 1 ? '1px solid #0a0a0a' : 'none', color: '#c8c8c8' }}>
                          {opcode}
                        </div>
                      ))}
                    </div>
                  )
                })()}
                {compareActiveTab === 'regs' && (() => {
                  const regs = getRegisterList(compareNodes)
                  return (
                    <div>
                      <div style={{ color: '#18a018', fontWeight: '600', marginBottom: '6px', fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>
                        Physical Registers ({regs.physical.length})
                      </div>
                      {regs.physical.map((reg, idx) => (
                        <div key={idx} style={{ padding: '3px 0', borderBottom: idx < regs.physical.length - 1 ? '1px solid #0a0a0a' : 'none', color: '#c8c8c8' }}>
                          {reg}
                        </div>
                      ))}
                      <div style={{ color: '#18a018', fontWeight: '600', marginTop: '10px', marginBottom: '6px', fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>
                        Virtual Registers ({regs.virtual.length})
                      </div>
                      {regs.virtual.map((reg, idx) => (
                        <div key={idx} style={{ padding: '3px 0', borderBottom: idx < regs.virtual.length - 1 ? '1px solid #0a0a0a' : 'none', color: '#c8c8c8' }}>
                          {reg}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <GraphCanvas
            nodes={compareLayoutedNodes}
            edges={compareLayoutedEdges}
            onNodeClick={handleCompareNodeClick}
            onEdgeClick={() => {}}
            onPaneClick={handleComparePaneClick}
          />

          {/* Node Details Panel for Compare Graph */}
          {compareSelectedNodeId && compareOverlayPosition && (() => {
            const selectedNode = allCompareNodes.find((n) => n.id === compareSelectedNodeId)
            const inputs = allCompareEdges.filter((e) => e.target === compareSelectedNodeId)
            const outputs = allCompareEdges.filter((e) => e.source === compareSelectedNodeId)

            return selectedNode ? (
              <NodeDetailsPanel
                node={selectedNode}
                inputs={inputs}
                outputs={outputs}
                allNodes={allCompareNodes}
                position={compareOverlayPosition}
                isDragging={compareIsDragging}
                onMouseDown={(e: React.MouseEvent) => {
                  if (compareOverlayPosition) {
                    setCompareIsDragging(true)
                    setCompareDragOffset({
                      x: e.clientX - compareOverlayPosition.x,
                      y: e.clientY - compareOverlayPosition.y,
                    })
                  }
                }}
              />
            ) : null
          })()}
        </div>
      )}

      {/* Comparison Panel - Bottom Right (only shown in compare mode) */}
      {isCompareMode && comparison && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(24, 160, 24, 0.4)',
            borderRadius: '4px',
            padding: '12px 16px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            lineHeight: '1.6',
            color: '#c8c8c8',
            maxWidth: '400px',
            maxHeight: '500px',
            overflowY: 'auto'
          }}
        >
          <div style={{ color: '#18a018', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>
            Comparison: {comparison.stage1_name} vs {comparison.stage2_name}
          </div>

          {/* Stage Stats */}
          <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>{comparison.stage1_name}:</span>
              <span>{comparison.stage1_nodes} nodes, {comparison.stage1_edges} edges</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{comparison.stage2_name}:</span>
              <span>{comparison.stage2_nodes} nodes, {comparison.stage2_edges} edges</span>
            </div>
            <div style={{ marginTop: '4px', color: comparison.node_count_change >= 0 ? '#18a018' : '#ef4444' }}>
              Change: {comparison.node_count_change >= 0 ? '+' : ''}{comparison.node_count_change} nodes,
              {' '}{comparison.edge_count_change >= 0 ? '+' : ''}{comparison.edge_count_change} edges
            </div>
          </div>

          {/* Removed Operations */}
          {comparison.added_opcodes && comparison.added_opcodes.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '4px' }}>
                ✗ Removed in {comparison.stage1_name} ({comparison.added_opcodes.length})
              </div>
              <div style={{ paddingLeft: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                {comparison.added_opcodes.map((op: string, idx: number) => (
                  <div key={idx} style={{ padding: '2px 0', color: '#f87171', fontSize: '10px' }}>
                    - {op}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Added Operations */}
          {comparison.removed_opcodes && comparison.removed_opcodes.length > 0 && (
            <div>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: '4px' }}>
                ✓ Added in {comparison.stage2_name} ({comparison.removed_opcodes.length})
              </div>
              <div style={{ paddingLeft: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                {comparison.removed_opcodes.map((op: string, idx: number) => (
                  <div key={idx} style={{ padding: '2px 0', color: '#60a5fa', fontSize: '10px' }}>
                    + {op}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Changes */}
          {(!comparison.added_opcodes || comparison.added_opcodes.length === 0) &&
           (!comparison.removed_opcodes || comparison.removed_opcodes.length === 0) && (
            <div style={{ color: '#909090', fontStyle: 'italic' }}>
              No operation changes detected
            </div>
          )}
        </div>
      )}
    </div>
  )
}
