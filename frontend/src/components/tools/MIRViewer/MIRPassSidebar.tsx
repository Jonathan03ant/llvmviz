import { useState } from 'react'
import type { MIRPipeline, MIRSection } from './MIRViewer'

interface MIRPassSidebarProps {
  pipeline: MIRPipeline | null
  selectedPass: string | null
  onPassSelect: (passId: string) => void
}

export function MIRPassSidebar({
  pipeline,
  selectedPass,
  onPassSelect
}: MIRPassSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all-passes']))
  const [searchQuery, setSearchQuery] = useState('')

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Show empty structure if no pipeline
  const displayPipeline = pipeline || {
    total_passes: 0,
    viewable_count: 0,
    all_passes: [],
    viewable_passes: [],
    sections: []
  }

  // Filter all passes by search query
  const filteredAllPasses = displayPipeline.all_passes.filter(pass =>
    pass.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pass.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRight: '1px solid #1a1a1a',
      backgroundColor: '#000000',
      overflowY: 'auto',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '6px 10px',
        borderBottom: '1px solid #1a1a1a',
        position: 'sticky',
        top: 0,
        backgroundColor: '#000000',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          color: '#18a018',
          fontSize: '10px',
          fontWeight: 600,
          fontFamily: 'JetBrains Mono, monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <span>MIR Pipeline</span>
          <span style={{ color: '#60c060', fontWeight: 400 }}>
            {displayPipeline.total_passes} passes
          </span>
        </div>
      </div>

      {/* All Passes Section - Searchable flat list with ALL passes */}
      <Section
        title={
          searchQuery
            ? `All Passes (${filteredAllPasses.length}/${displayPipeline.all_passes?.length || 0})`
            : `All Passes (${displayPipeline.all_passes?.length || 0})`
        }
        isExpanded={expandedSections.has('all-passes')}
        onToggle={() => toggleSection('all-passes')}
      >
        {displayPipeline.all_passes && displayPipeline.all_passes.length > 0 ? (
          <>
            {/* Search box */}
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #1a1a1a', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search passes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  paddingRight: searchQuery ? '24px' : '6px',
                  backgroundColor: '#0a0a0a',
                  border: searchQuery ? '1px solid #18a018' : '1px solid #1a1a1a',
                  borderRadius: '2px',
                  color: '#c8c8c8',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#808080',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px 4px',
                    lineHeight: 1
                  }}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            {/* Pass list */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {filteredAllPasses.length > 0 ? (
                filteredAllPasses.map((pass, index) => (
                  <PassItem
                    key={`${pass.id}-${index}`}
                    name={pass.name}
                    passId={pass.id}
                    isActive={selectedPass === pass.id}
                    onClick={() => pass.viewable && onPassSelect(pass.id)}
                    supportsStopAfter={pass.viewable || false}
                    isDisabled={!pass.viewable}
                    color={pass.color}
                    importance={pass.importance}
                    reason={pass.reason}
                  />
                ))
              ) : (
                <div style={{ padding: '16px', color: '#606060', fontSize: '11px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                  No passes match "{searchQuery}"
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: '16px', color: '#606060', fontSize: '11px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
            Click "Discover Passes" to populate
          </div>
        )}
      </Section>

      {/* Grouped by Pipeline Stage - hide when searching */}
      {!searchQuery && displayPipeline.sections && displayPipeline.sections.length > 0 && (
        displayPipeline.sections.map((section: MIRSection) => (
          <Section
            key={section.stage_id}
            title={`${section.name} (${section.passes.filter(p => p.viewable).length}/${section.count})`}
            isExpanded={expandedSections.has(section.stage_id)}
            onToggle={() => toggleSection(section.stage_id)}
          >
            {section.passes.map((pass, index) => (
              <PassItem
                key={`${section.stage_id}-${pass.id}-${index}`}
                name={pass.name}
                passId={pass.id}
                isActive={selectedPass === pass.id}
                onClick={() => pass.viewable && onPassSelect(pass.id)}
                supportsStopAfter={pass.viewable || false}
                isDisabled={!pass.viewable}
                color={pass.color}
                importance={pass.importance}
                reason={pass.reason}
                isNested
              />
            ))}
          </Section>
        ))
      )}
    </div>
  )
}

interface SectionProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Section({ title, isExpanded, onToggle, children }: SectionProps) {
  return (
    <div style={{ borderBottom: '1px solid #1a1a1a' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '6px 10px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#d0d0d0',
          fontSize: '10px',
          fontWeight: 500,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'JetBrains Mono, monospace',
          transition: 'all 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#d0d0d0'}
      >
        <span>{title}</span>
        <span style={{ fontSize: '8px', color: '#909090' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>
      {isExpanded && (
        <div style={{ backgroundColor: '#0a0a0a' }}>
          {children}
        </div>
      )}
    </div>
  )
}

interface PassItemProps {
  name: string
  passId: string | null
  isActive: boolean
  onClick: () => void
  isNested?: boolean
  isDisabled?: boolean
  supportsStopAfter?: boolean
  color?: string
  importance?: string
  reason?: string
}

function PassItem({
  name,
  passId: _passId,
  isActive,
  onClick,
  isNested = false,
  isDisabled = false,
  supportsStopAfter = true,
  color = 'default',
  importance = 'normal',
  reason = ''
}: PassItemProps) {
  const icon = supportsStopAfter ? '●' : '○'

  // Map colors to actual CSS colors
  const colorMap: Record<string, string> = {
    'purple': '#b968c7',   // Register allocation
    'orange': '#ff9933',   // Stack frame
    'blue': '#5ba3d0',     // Scheduling
    'green': '#18a018',    // Stage transition
    'yellow': '#ffcc00',   // Significant change
    'default': '#18a018'   // Default green
  }

  const iconColor = colorMap[color] || colorMap['default']
  const tooltipText = reason || (supportsStopAfter ? 'Click to view MIR' : 'Analysis pass - no MIR output')

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={tooltipText}
      style={{
        width: '100%',
        padding: isNested ? '4px 22px' : '4px 10px',
        backgroundColor: isActive ? 'rgba(24, 160, 24, 0.15)' : 'transparent',
        border: 'none',
        borderLeft: isActive ? `2px solid ${iconColor}` : '2px solid transparent',
        color: isDisabled ? '#808080' : (isActive ? iconColor : '#b0b0b0'),
        fontSize: '10px',
        textAlign: 'left',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: 'JetBrains Mono, monospace',
        transition: 'all 0.1s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        opacity: 1
      }}
      onMouseEnter={(e) => {
        if (!isActive && !isDisabled) {
          e.currentTarget.style.backgroundColor = 'rgba(24, 160, 24, 0.08)'
          e.currentTarget.style.color = '#e0e0e0'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && !isDisabled) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = '#b0b0b0'
        }
      }}
    >
      <span style={{
        opacity: 0.9,
        color: supportsStopAfter ? iconColor : '#303030',
        fontSize: '10px',
        fontWeight: importance === 'critical' ? 'bold' : 'normal',
        lineHeight: 1
      }}>
        {icon}
      </span>
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1
      }} title={`${name} - ${tooltipText}`}>
        {name.length > 40 ? name.substring(0, 40) + '...' : name}
      </span>
    </button>
  )
}
