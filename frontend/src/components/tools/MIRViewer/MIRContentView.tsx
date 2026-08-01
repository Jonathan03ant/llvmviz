import { useRef, useEffect, useMemo, useState } from 'react'
import { highlightMIR } from '../../../utils/mirSyntaxHighlight.tsx'

interface MIRTab {
  passId: string
  passName: string
  content: string | null
  loading: boolean
}

interface MIRContentViewProps {
  tabs: MIRTab[]
  activeTabIndex: number
  onTabChange: (index: number) => void
  onTabClose: (index: number) => void
}

interface MIRSection {
  name: string
  line: number
}

export function MIRContentView({
  tabs,
  activeTabIndex,
  onTabChange,
  onTabClose
}: MIRContentViewProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  const activeTab = tabs[activeTabIndex]
  const mirContent = activeTab?.content || null
  const loading = activeTab?.loading || false

  const highlightedMIR = useMemo(() => {
    if (!mirContent) return []
    return highlightMIR(mirContent)
  }, [mirContent])

  const sections = useMemo(() => {
    if (!mirContent) return []

    const lines = mirContent.split('\n')
    const sectionList: MIRSection[] = []

    lines.forEach((line, idx) => {
      const trimmed = line.trim()

      if (trimmed === '--- |') {
        sectionList.push({ name: 'LLVM IR & Target', line: idx + 1 })
      } else if (trimmed === '---' && idx > 0) {
        sectionList.push({ name: 'Function Metadata', line: idx + 1 })
      } else if (line.match(/^registers:/)) {
        sectionList.push({ name: 'Registers & Live-ins', line: idx + 1 })
      } else if (line.match(/^frameInfo:/)) {
        sectionList.push({ name: 'Stack & Frame Info', line: idx + 1 })
      } else if (line.match(/^\s+bb\.\d+/)) {
        const bbMatch = line.match(/bb\.(\d+)/)
        if (bbMatch) {
          sectionList.push({ name: `bb.${bbMatch[1]}`, line: idx + 1 })
        }
      }
    })

    return sectionList
  }, [mirContent])

  const scrollToLine = (lineNumber: number) => {
    if (!contentRef.current) return

    const lineHeight = 20.8
    const scrollPosition = (lineNumber - 1) * lineHeight

    contentRef.current.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    })
  }

  const lineNumbers = useMemo(() => {
    if (!mirContent) return []
    const lines = mirContent.split('\n').length
    return Array.from({ length: lines }, (_, i) => i + 1)
  }, [mirContent])

  // Sync scroll between line numbers and content
  const handleScroll = () => {
    if (contentRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = contentRef.current.scrollTop
    }
  }
  const handleCopy = () => {
    if (mirContent) {
      navigator.clipboard.writeText(mirContent).then(() => {
        alert('MIR copied to clipboard!')
      }).catch(() => {
        // Fallback for non-HTTPS
        const textarea = document.createElement('textarea')
        textarea.value = mirContent
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        alert('MIR copied to clipboard!')
      })
    }
  }

  const handleDownload = () => {
    if (mirContent) {
      const blob = new Blob([mirContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedPass || 'output'}.mir`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (tabs.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a'
      }}>
        <div style={{
          color: '#808080',
          fontSize: '14px',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          Select a pass from the sidebar to view MIR
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000000'
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h2 style={{
          color: '#18a018',
          margin: 0,
          fontSize: '10px',
          fontWeight: '600',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          MIR Output
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            onChange={(e) => {
              const lineNumber = parseInt(e.target.value)
              if (lineNumber > 0) {
                scrollToLine(lineNumber)
                e.target.value = ''
              }
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#808080',
              cursor: 'pointer',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              outline: 'none'
            }}
          >
            <option value="">Go To...</option>
            {sections.map((section, idx) => (
              <option key={idx} value={section.line}>
                {section.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCopy}
            style={{
              padding: 0,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#808080',
              cursor: 'pointer',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#18a018'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#808080'
            }}
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: 0,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#808080',
              cursor: 'pointer',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#18a018'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#808080'
            }}
          >
            Download
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px 8px',
        borderBottom: '1px solid #1a1a1a',
        backgroundColor: '#0a0a0a',
        overflowX: 'auto'
      }}>
        {tabs.map((tab, index) => (
          <div
            key={`${tab.passId}-${index}`}
            onClick={() => onTabChange(index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              backgroundColor: activeTabIndex === index ? '#1a1a1a' : 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (activeTabIndex !== index) {
                e.currentTarget.style.backgroundColor = '#141414'
              }
            }}
            onMouseLeave={(e) => {
              if (activeTabIndex !== index) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <span style={{
              color: activeTabIndex === index ? '#18a018' : '#808080',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600
            }}>
              {tab.passName}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(index)
              }}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#606060',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '0 2px',
                lineHeight: '1',
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#606060'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* MIR Content with Line Numbers */}
      {loading ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a'
        }}>
          <div style={{
            color: '#18a018',
            fontSize: '14px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            Generating MIR...
          </div>
        </div>
      ) : (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          style={{
            backgroundColor: '#0a0a0a',
            color: '#505050',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            padding: '20px 2px',
            textAlign: 'right',
            borderRight: '1px solid #1a1a1a',
            minWidth: '18px',
            overflow: 'hidden',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          {lineNumbers.map(num => (
            <div key={num}>{num}</div>
          ))}
        </div>

        {/* MIR Content - Scrollable with Syntax Highlighting */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#e0e0e0',
            backgroundColor: '#000000',
            whiteSpace: 'pre',
            textAlign: 'left'
          }}
        >
          {highlightedMIR.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      </div>
      )}
    </div>
  )
}
