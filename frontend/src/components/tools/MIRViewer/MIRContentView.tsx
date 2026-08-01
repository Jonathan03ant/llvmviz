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

function CompareMIRView({ tab1, tab2 }: { tab1: MIRTab, tab2: MIRTab }) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  const lines1 = useMemo(() => tab1.content?.split('\n') || [], [tab1.content])
  const lines2 = useMemo(() => tab2.content?.split('\n') || [], [tab2.content])

  const maxLines = Math.max(lines1.length, lines2.length)

  const syncScroll = (source: 'left' | 'right') => {
    if (source === 'left' && leftRef.current && rightRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop
    } else if (source === 'right' && leftRef.current && rightRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop
    }
  }

  const getLineStyle = (line1: string | undefined, line2: string | undefined) => {
    if (!line1 && line2) {
      return { backgroundColor: 'rgba(16, 185, 129, 0.15)' }
    }
    if (line1 && !line2) {
      return { backgroundColor: 'rgba(239, 68, 68, 0.15)' }
    }
    if (line1 !== line2) {
      return { backgroundColor: 'rgba(251, 191, 36, 0.15)' }
    }
    return {}
  }

  const highlightDiff = (text1: string, text2: string, side: 'left' | 'right') => {
    const words1 = text1.split(/(\s+)/)
    const words2 = text2.split(/(\s+)/)

    const result: React.ReactNode[] = []
    const maxWords = Math.max(words1.length, words2.length)

    for (let i = 0; i < maxWords; i++) {
      const word1 = words1[i] || ''
      const word2 = words2[i] || ''

      if (word1 === word2) {
        result.push(<span key={i}>{side === 'left' ? word1 : word2}</span>)
      } else {
        if (side === 'left') {
          if (word1 && !word2) {
            result.push(<span key={i} style={{ backgroundColor: '#ef4444', color: '#fff', padding: '0 2px' }}>{word1}</span>)
          } else if (word1) {
            result.push(<span key={i} style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '0 2px' }}>{word1}</span>)
          }
        } else {
          if (word2 && !word1) {
            result.push(<span key={i} style={{ backgroundColor: '#10b981', color: '#fff', padding: '0 2px' }}>{word2}</span>)
          } else if (word2) {
            result.push(<span key={i} style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '0 2px' }}>{word2}</span>)
          }
        }
      }
    }

    return <>{result}</>
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #1a1a1a',
        backgroundColor: '#0a0a0a',
        padding: '8px 12px',
        gap: '8px'
      }}>
        <div style={{ flex: 1, color: '#18a018', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {tab1.passName}
        </div>
        <div style={{ flex: 1, color: '#18a018', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {tab2.passName}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          ref={leftRef}
          onScroll={() => syncScroll('left')}
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
            textAlign: 'left',
            borderRight: '1px solid #1a1a1a'
          }}
        >
          {Array.from({ length: maxLines }).map((_, idx) => {
            const line1 = lines1[idx] || ''
            const line2 = lines2[idx] || ''
            return (
              <div key={idx} style={getLineStyle(line1, line2)}>
                {line1 && line2 && line1 !== line2 ? highlightDiff(line1, line2, 'left') : (line1 || ' ')}
              </div>
            )
          })}
        </div>

        <div
          ref={rightRef}
          onScroll={() => syncScroll('right')}
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
          {Array.from({ length: maxLines }).map((_, idx) => {
            const line1 = lines1[idx] || ''
            const line2 = lines2[idx] || ''
            return (
              <div key={idx} style={getLineStyle(line1, line2)}>
                {line1 && line2 && line1 !== line2 ? highlightDiff(line1, line2, 'right') : (line2 || ' ')}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function MIRContentView({
  tabs,
  activeTabIndex,
  onTabChange,
  onTabClose
}: MIRContentViewProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareTab1, setCompareTab1] = useState<number>(-1)
  const [compareTab2, setCompareTab2] = useState<number>(-1)
  const [showGoToDropdown, setShowGoToDropdown] = useState(false)
  const [showCompareTab1Dropdown, setShowCompareTab1Dropdown] = useState(false)
  const [showCompareTab2Dropdown, setShowCompareTab2Dropdown] = useState(false)
  const goToRef = useRef<HTMLDivElement>(null)
  const compareTab1Ref = useRef<HTMLDivElement>(null)
  const compareTab2Ref = useRef<HTMLDivElement>(null)

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (goToRef.current && !goToRef.current.contains(event.target as Node)) {
        setShowGoToDropdown(false)
      }
      if (compareTab1Ref.current && !compareTab1Ref.current.contains(event.target as Node)) {
        setShowCompareTab1Dropdown(false)
      }
      if (compareTab2Ref.current && !compareTab2Ref.current.contains(event.target as Node)) {
        setShowCompareTab2Dropdown(false)
      }
    }

    if (showGoToDropdown || showCompareTab1Dropdown || showCompareTab2Dropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showGoToDropdown, showCompareTab1Dropdown, showCompareTab2Dropdown])
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
    if (mirContent && activeTab) {
      const blob = new Blob([mirContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeTab.passName || 'output'}.mir`
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
        padding: '6px 10px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          color: '#18a018',
          margin: 0,
          fontSize: '10px',
          fontWeight: '600',
          fontFamily: 'JetBrains Mono, monospace',
          lineHeight: '1',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          MIR Output
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {compareMode ? (
            <>
              <div ref={compareTab1Ref} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setShowCompareTab1Dropdown(!showCompareTab1Dropdown)}
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#000000',
                    border: '1px solid #1a1a1a',
                    borderRadius: '2px',
                    color: '#18a018',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                    width: '150px',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{compareTab1 >= 0 ? tabs[compareTab1]?.passName : 'Select tab 1...'}</span>
                  <span style={{ fontSize: '8px' }}>▼</span>
                </button>
                {showCompareTab1Dropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '2px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    borderRadius: '2px',
                    width: '150px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}>
                    {tabs.map((tab, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setCompareTab1(idx)
                          setShowCompareTab1Dropdown(false)
                        }}
                        style={{
                          padding: '2px 8px',
                          color: '#18a018',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                          lineHeight: '1.4',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#111111'
                          e.currentTarget.style.color = '#c8c8c8'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = '#18a018'
                        }}
                      >
                        {tab.passName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ color: '#606060', fontSize: '11px', fontWeight: 600 }}>vs</span>
              <div ref={compareTab2Ref} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setShowCompareTab2Dropdown(!showCompareTab2Dropdown)}
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#000000',
                    border: '1px solid #1a1a1a',
                    borderRadius: '2px',
                    color: '#18a018',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                    width: '150px',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{compareTab2 >= 0 ? tabs[compareTab2]?.passName : 'Select tab 2...'}</span>
                  <span style={{ fontSize: '8px' }}>▼</span>
                </button>
                {showCompareTab2Dropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '2px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    borderRadius: '2px',
                    width: '150px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}>
                    {tabs.map((tab, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setCompareTab2(idx)
                          setShowCompareTab2Dropdown(false)
                        }}
                        style={{
                          padding: '2px 8px',
                          color: '#18a018',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                          lineHeight: '1.4',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#111111'
                          e.currentTarget.style.color = '#c8c8c8'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = '#18a018'
                        }}
                      >
                        {tab.passName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div
                onClick={() => {
                  setCompareMode(false)
                  setCompareTab1(-1)
                  setCompareTab2(-1)
                }}
                style={{
                  padding: '0 10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#c8c8c8',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  transition: 'color 0.15s',
                  userSelect: 'none',
                  lineHeight: '1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#c8c8c8'}
              >
                Exit
              </div>
            </>
          ) : (
            <>
              <div
                onClick={() => tabs.length >= 2 && setCompareMode(true)}
                style={{
                  padding: '0 10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: tabs.length >= 2 ? '#c8c8c8' : '#404040',
                  cursor: tabs.length >= 2 ? 'pointer' : 'not-allowed',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  transition: 'color 0.15s',
                  userSelect: 'none',
                  lineHeight: '1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  if (tabs.length >= 2) {
                    e.currentTarget.style.color = '#ffffff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (tabs.length >= 2) {
                    e.currentTarget.style.color = '#c8c8c8'
                  }
                }}
              >
                Compare
              </div>
              <div ref={goToRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setShowGoToDropdown(!showGoToDropdown)}
                  style={{
                    padding: '0 10px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#c8c8c8',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    outline: 'none',
                    lineHeight: '1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#c8c8c8'}
                >
                  Go To... ▼
                </button>
                {showGoToDropdown && sections.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '2px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    borderRadius: '2px',
                    minWidth: '150px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}>
                    {sections.map((section, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          scrollToLine(section.line)
                          setShowGoToDropdown(false)
                        }}
                        style={{
                          padding: '2px 8px',
                          color: '#18a018',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                          lineHeight: '1.4'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#111111'
                          e.currentTarget.style.color = '#c8c8c8'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = '#18a018'
                        }}
                      >
                        {section.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <div style={{ width: '1px', height: '20px', backgroundColor: '#333' }} />
          <button
            onClick={handleCopy}
            title="Copy MIR"
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#c8c8c8',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff'
              e.currentTarget.style.backgroundColor = '#1a1a1a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#c8c8c8'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button
            onClick={handleDownload}
            title="Download MIR"
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#c8c8c8',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff'
              e.currentTarget.style.backgroundColor = '#1a1a1a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#c8c8c8'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
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

      {/* Compare Mode View */}
      {compareMode && compareTab1 !== -1 && compareTab2 !== -1 ? (
        <CompareMIRView
          tab1={tabs[compareTab1]}
          tab2={tabs[compareTab2]}
        />
      ) : (
      <>
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
      </>
      )}
    </div>
  )
}
