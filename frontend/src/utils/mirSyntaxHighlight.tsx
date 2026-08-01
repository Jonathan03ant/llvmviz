import React from 'react'

const COLORS = {
  'virtual-reg': '#3b82f6',
  'physical-reg': '#10b981',
  'reg-class': '#8b5cf6',
  'basic-block': '#f97316',
  'keyword': '#60a5fa',
  'comment': '#606060',
  'field': '#ec4899',
  'boolean-true': '#10b981',
  'boolean-false': '#ef4444',
  'number': '#f59e0b',
  'string': '#fbbf24',
}

export function highlightMIRLine(line: string, lineNumber: number): React.ReactNode {
  if (line.trim().startsWith(';')) {
    return <span key={lineNumber} style={{ color: COLORS['comment'] }}>{line}</span>
  }

  const bbMatch = line.match(/^(\s*)(bb\.\d+(?:\s*\([^)]*\))?:?)(.*)$/)
  if (bbMatch) {
    const [, leading, bb, rest] = bbMatch
    return (
      <React.Fragment key={lineNumber}>
        <span>{leading}</span>
        <span style={{
          color: COLORS['basic-block'],
          fontWeight: 'bold',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          padding: '1px 3px',
          borderRadius: '2px'
        }}>{bb}</span>
        {highlightText(rest)}
      </React.Fragment>
    )
  }

  const fieldMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*):(.*)$/)
  if (fieldMatch && !line.includes('{')) {
    const [, leading, field, rest] = fieldMatch
    return (
      <React.Fragment key={lineNumber}>
        <span>{leading}</span>
        <span style={{ color: COLORS['field'], fontWeight: '600' }}>{field}:</span>
        {highlightText(rest)}
      </React.Fragment>
    )
  }

  return <React.Fragment key={lineNumber}>{highlightText(line)}</React.Fragment>
}

function highlightText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  const regex = /(%\d+|%[a-zA-Z_][a-zA-Z0-9_]*)|(\$[a-zA-Z_][a-zA-Z0-9_]*)|(::[a-zA-Z_][a-zA-Z0-9_]*|:[a-zA-Z_][a-zA-Z0-9_]*)|(\b(?:define|declare|ret|br|switch|call|i1|i8|i16|i32|i64|i128|float|double|void|ptr)\b)|(\b[A-Z][A-Z0-9_]{2,}\b)|(\btrue\b)|(\bfalse\b)|(\b\d+\b)|("(?:[^"\\]|\\.)*")/g

  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>)
    }

    const [fullMatch, virtualReg, physicalReg, regClass, keyword, opcode, boolTrue, boolFalse, number, string] = match

    if (virtualReg) {
      parts.push(<span key={`vr-${match.index}`} style={{ color: COLORS['virtual-reg'] }}>{virtualReg}</span>)
    } else if (physicalReg) {
      parts.push(<span key={`pr-${match.index}`} style={{ color: COLORS['physical-reg'] }}>{physicalReg}</span>)
    } else if (regClass) {
      parts.push(<span key={`rc-${match.index}`} style={{ color: COLORS['reg-class'] }}>{regClass}</span>)
    } else if (keyword) {
      parts.push(<span key={`kw-${match.index}`} style={{ color: COLORS['keyword'], fontWeight: '500' }}>{keyword}</span>)
    } else if (opcode) {
      parts.push(<span key={`op-${match.index}`} style={{ fontWeight: 'bold' }}>{opcode}</span>)
    } else if (boolTrue) {
      parts.push(<span key={`bt-${match.index}`} style={{ color: COLORS['boolean-true'] }}>{boolTrue}</span>)
    } else if (boolFalse) {
      parts.push(<span key={`bf-${match.index}`} style={{ color: COLORS['boolean-false'] }}>{boolFalse}</span>)
    } else if (number) {
      parts.push(<span key={`n-${match.index}`} style={{ color: COLORS['number'] }}>{number}</span>)
    } else if (string) {
      parts.push(<span key={`s-${match.index}`} style={{ color: COLORS['string'] }}>{string}</span>)
    }

    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>)
  }

  return <>{parts}</>
}

export function highlightMIR(mirText: string): React.ReactNode[] {
  if (!mirText) return []
  const lines = mirText.split('\n')
  return lines.map((line, index) => highlightMIRLine(line, index))
}
