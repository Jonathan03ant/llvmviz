import { EDGE_COLORS } from './nodeStyles'

interface NodeDetailsPanelProps {
  node: any
  inputs: any[]
  outputs: any[]
  allNodes: any[]
  position: { x: number; y: number }
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
}

/**
 * Floating draggable panel showing node details
 * Displays: opcode, LLVM node class, node_num, output_type, inputs, outputs
 */
export function NodeDetailsPanel({
  node,
  inputs,
  outputs,
  allNodes,
  position,
  isDragging,
  onMouseDown,
}: NodeDetailsPanelProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed',
        left: `${position.x + 20}px`,
        top: `${position.y}px`,
        backgroundColor: '#0a0a0a',
        border: '2px solid #18a018',
        borderRadius: '8px',
        padding: '18px',
        color: '#cccccc',
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        minWidth: '280px',
        maxWidth: '450px',
        maxHeight: '450px',
        overflowY: 'auto',
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(24, 160, 24, 0.3)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '15px', borderBottom: '1px solid #1a1a1a', paddingBottom: '10px' }}>
        <h3
          style={{
            marginTop: 0,
            marginBottom: '5px',
            color: '#18a018',
            fontSize: '15px',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {node.data.opcode}
        </h3>
        <p style={{ color: '#888', margin: 0, fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
          {node.data.node_num} | {Array.isArray(node.data.output_types) ? node.data.output_types.join(', ') : node.data.output_types}
        </p>
        <p style={{ color: '#18a018', margin: '5px 0 0', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
          {node.data.node_class || 'unknown'}
        </p>
      </div>

      {/* Inputs Section */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ color: '#999', fontSize: '12px', marginBottom: '10px', marginTop: 0, fontWeight: 600 }}>
          INPUTS ({inputs.length})
        </h4>
        {inputs.length === 0 ? (
          <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>None</p>
        ) : (
          inputs.map((edge, i) => {
            const sourceNode = allNodes.find((n) => n.id === edge.source)
            // Get output types (array) from source node
            const outputTypes = sourceNode?.data.output_types || ['?']
            const inputType = Array.isArray(outputTypes) ? outputTypes[0] : outputTypes
            const borderColor = EDGE_COLORS[edge.type as keyof typeof EDGE_COLORS] || EDGE_COLORS.data
            return (
              <div key={i} style={{ marginBottom: '8px', paddingLeft: '10px', borderLeft: `3px solid ${borderColor}` }}>
                <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                  ← {sourceNode?.data.opcode} ({sourceNode?.data.node_num})
                </div>
                <div style={{ fontSize: '10px', color: '#888' }}>
                  <span style={{ color: '#18a018' }}>{inputType}</span> [{edge.type}]
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Outputs Section */}
      <div>
        <h4 style={{ color: '#999', fontSize: '12px', marginBottom: '10px', marginTop: 0, fontWeight: 600 }}>
          OUTPUTS ({outputs.length})
        </h4>
        {outputs.length === 0 ? (
          <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>None</p>
        ) : (
          outputs.map((edge, i) => {
            const targetNode = allNodes.find((n) => n.id === edge.target)
            const borderColor = EDGE_COLORS[edge.type as keyof typeof EDGE_COLORS] || EDGE_COLORS.data
            return (
              <div key={i} style={{ marginBottom: '8px', paddingLeft: '10px', borderLeft: `3px solid ${borderColor}` }}>
                <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                  → {targetNode?.data.opcode} ({targetNode?.data.node_num})
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>[{edge.type}]</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
