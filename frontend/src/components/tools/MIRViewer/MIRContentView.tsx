import { useRef, useEffect, useMemo, useState } from 'react'
import { highlightMIR } from '../../../utils/mirSyntaxHighlight.tsx'

interface MIRContentViewProps {
  mirContent: string | null
  selectedPass: string | null
  loading: boolean
}

interface MIRSection {
  name: string
  line: number
}

export function MIRContentView({
  mirContent,
  selectedPass,
  loading
}: MIRContentViewProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

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

  // Update line numbers when content changes
  useEffect(() => {
    if (mirContent && lineNumbersRef.current) {
      const lines = mirContent.split('\n').length
      lineNumbersRef.current.innerHTML = Array.from(
        { length: lines },
        (_, i) => `<div class="line-number">${i + 1}</div>`
      ).join('')
    }
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

  if (loading) {
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
          color: '#18a018',
          fontSize: '16px',
          fontFamily: 'JetBrains Mono, monospace',
          marginBottom: '8px'
        }}>
          ⏳ Generating MIR...
        </div>
        {selectedPass && (
          <div style={{
            color: '#808080',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif'
          }}>
            after {selectedPass}
          </div>
        )}
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
          MIR Output {selectedPass ? `(after ${selectedPass})` : ''}
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

      {/* MIR Content with Line Numbers */}
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
          <div className="line-number">1</div>
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
    </div>
  )
}
