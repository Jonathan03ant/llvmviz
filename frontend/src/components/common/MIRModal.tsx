import { useState, useEffect, useRef } from 'react'

interface MIRModalProps {
  isOpen: boolean
  onClose: () => void
  mirContent: string
  filename?: string
}

export function MIRModal({ isOpen, onClose, mirContent, filename = 'output.mir' }: MIRModalProps) {
  const [copied, setCopied] = useState(false)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (lineNumbersRef.current && mirContent) {
      const lines = mirContent.split('\n').length
      lineNumbersRef.current.innerHTML = Array.from(
        { length: lines },
        (_, i) => `<div style="padding: 0 8px; text-align: right;">${i + 1}</div>`
      ).join('')
    }
  }, [mirContent])

  const handleScroll = () => {
    if (codeRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = codeRef.current.scrollTop
    }
  }

  const handleCopyToClipboard = () => {
    try {
      // Fallback method that works without clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = mirContent
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)

      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([mirContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#0a0a0a',
          border: '2px solid #18a018',
          borderRadius: '8px',
          width: '80%',
          maxWidth: '1000px',
          height: '70%',
          maxHeight: '700px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #1a1a1a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#18a018',
              fontSize: '13px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: '600',
              textAlign: 'left',
            }}
          >
            Machine IR Output
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Code Viewer */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            backgroundColor: '#0a0a0a',
          }}
        >
          {/* Line Numbers */}
          <div
            ref={lineNumbersRef}
            style={{
              backgroundColor: '#0a0a0a',
              color: '#505050',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              overflowY: 'hidden',
              borderRight: '1px solid #333',
              minWidth: '50px',
              userSelect: 'none',
            }}
          />

          {/* Code Content */}
          <pre
            ref={codeRef}
            onScroll={handleScroll}
            style={{
              flex: 1,
              margin: 0,
              padding: '16px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              backgroundColor: '#0a0a0a',
              color: '#e0e0e0',
              overflow: 'auto',
              whiteSpace: 'pre',
              textAlign: 'left',
            }}
          >
            {mirContent}
          </pre>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '6px 12px',
            borderTop: '1px solid #1a1a1a',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleCopyToClipboard}
            onMouseEnter={(e) => e.currentTarget.style.color = '#18a018'}
            onMouseLeave={(e) => e.currentTarget.style.color = copied ? '#18a018' : '#4a9eff'}
            style={{
              padding: 0,
              backgroundColor: 'transparent',
              color: copied ? '#18a018' : '#4a9eff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '11px',
              fontWeight: 'normal',
            }}
          >
            {copied ? '✓ Copied' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={handleDownload}
            onMouseEnter={(e) => e.currentTarget.style.color = '#18a018'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#4a9eff'}
            style={{
              padding: 0,
              backgroundColor: 'transparent',
              color: '#4a9eff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '11px',
              fontWeight: 'normal',
            }}
          >
            Download
          </button>
          <button
            onClick={onClose}
            onMouseEnter={(e) => e.currentTarget.style.color = '#18a018'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#4a9eff'}
            style={{
              padding: 0,
              backgroundColor: 'transparent',
              color: '#4a9eff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '11px',
              fontWeight: 'normal',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
