import { useState } from 'react'

interface InfoTabsProps {
  nodes: any[]
  getNodesByCategory: (nodeSet: any[], category: 'isd' | 'amdgpu' | 'regs') => any[]
  getRegisterList: (nodeSet: any[]) => { physical: string[], virtual: string[] }
}

export function InfoTabs({ nodes, getNodesByCategory, getRegisterList }: InfoTabsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'isd' | 'amdgpu' | 'regs' | null>(null)

  return (
    <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>
      {/* Tab Buttons */}
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(24, 160, 24, 0.3)',
        borderRadius: '3px',
        padding: '2px 4px',
        display: 'flex',
        gap: '4px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px'
      }}>
        {(['all', 'isd', 'amdgpu', 'regs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(activeTab === tab ? null : tab)}
            style={{
              background: activeTab === tab ? 'rgba(24, 160, 24, 0.2)' : 'transparent',
              color: activeTab === tab ? '#18a018' : '#909090',
              border: activeTab === tab ? '1px solid #18a018' : '1px solid transparent',
              borderRadius: '2px',
              padding: '3px 6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.color = '#c8c8c8'
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.color = '#909090'
              }
            }}
          >
            {tab === 'all' ? 'All' :
             tab === 'isd' ? 'ISD' :
             tab === 'amdgpu' ? 'AMD' : 'Reg'}
          </button>
        ))}
      </div>

      {/* Info Panel Dropdown */}
      {activeTab && activeTab !== 'all' && (
        <div style={{
          marginTop: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(24, 160, 24, 0.4)',
          borderRadius: '3px',
          padding: '6px 8px',
          maxWidth: '200px',
          maxHeight: '250px',
          overflowY: 'auto',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          lineHeight: '1.4',
          color: '#c8c8c8'
        }}>
          {activeTab === 'isd' && (() => {
            const opcodes = Array.from(new Set(
              getNodesByCategory(nodes, 'isd').map(node => node.data?.opcode || node.data?.label || node.id)
            )).sort()
            return (
              <div>
                <div style={{ color: '#18a018', fontWeight: 'bold', marginBottom: '4px' }}>
                  ISD Operations ({opcodes.length})
                </div>
                {opcodes.map((opcode, idx) => (
                  <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid #1a1a1a' }}>
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
                <div style={{ color: '#18a018', fontWeight: 'bold', marginBottom: '4px' }}>
                  AMDGPU Operations ({opcodes.length})
                </div>
                {opcodes.map((opcode, idx) => (
                  <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid #1a1a1a' }}>
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
                <div style={{ color: '#18a018', fontWeight: 'bold', marginBottom: '4px' }}>
                  Physical Registers ({regs.physical.length})
                </div>
                {regs.physical.map((reg, idx) => (
                  <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid #1a1a1a' }}>
                    {reg}
                  </div>
                ))}
                <div style={{ color: '#18a018', fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>
                  Virtual Registers ({regs.virtual.length})
                </div>
                {regs.virtual.map((reg, idx) => (
                  <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid #1a1a1a' }}>
                    {reg}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
