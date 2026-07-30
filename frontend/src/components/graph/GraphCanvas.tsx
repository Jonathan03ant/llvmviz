import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from 'reactflow'
import { useEffect } from 'react'
import 'reactflow/dist/style.css'

interface GraphCanvasProps {
  nodes: any[]
  edges: any[]
  onNodeClick?: (event: any, node: any) => void
  onEdgeClick?: (event: any, edge: any) => void
  onPaneClick?: () => void
}

/**
 * ReactFlow wrapper with styled background and controls
 * Reusable across SelectionDAG, MIR, and other graph visualizations
 */
export function GraphCanvas({ nodes, edges, onNodeClick, onEdgeClick, onPaneClick }: GraphCanvasProps) {
  const [nodesState, setNodes, onNodesChange] = useNodesState([])
  const [edgesState, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    // Clear and reset when new data arrives
    setNodes([])
    setEdges([])

    if (nodes.length > 0) {
      // Use setTimeout to force React Flow to fully reset
      setTimeout(() => {
        setNodes(nodes)
        setEdges(edges)
      }, 0)
    }
  }, [nodes, edges, setNodes, setEdges])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Empty state overlay - rendered ABOVE ReactFlow */}
      {nodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            fontFamily: 'JetBrains Mono, monospace',
            zIndex: 10,
            animation: 'pulse 6s ease-in-out infinite',
          }}
        >
          <div style={{ fontSize: '48px', fontWeight: '300', marginBottom: '8px', color: '#18a018' }}>
            Graph Viewer
          </div>
          <div style={{ fontSize: '14px', color: '#0d5d0d' }}>
            Compile IR to visualize SelectionDAG
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <ReactFlow
        key={`${nodes.length}-${edges.length}`}
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView={nodes.length > 0}
      >
        <Background color="#0a4a0a" gap={16} size={1} style={{ backgroundColor: '#0a0a0a' }} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
