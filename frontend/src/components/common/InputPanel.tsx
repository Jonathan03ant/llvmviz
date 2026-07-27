import { CodeEditor } from './CodeEditor'
import { TerminalOutput } from './TerminalOutput'
import type { TerminalLine } from './TerminalOutput'

interface InputPanelProps {
  value: string
  onChange: (value: string) => void
  terminalOutput: TerminalLine[]
  isRunning: boolean
  layout?: 'vertical' | 'horizontal'
}

export function InputPanel({ value, onChange, terminalOutput, isRunning, layout = 'vertical' }: InputPanelProps) {
  if (layout === 'horizontal') {
    // Side by side: IR left (40%), Terminal right (60%)
    return (
      <div className="flex h-full">
        <div className="overflow-hidden border-r border-[#1a1a1a]" style={{ width: '40%' }}>
          <CodeEditor value={value} onChange={onChange} />
        </div>
        <div className="overflow-hidden" style={{ width: '60%' }}>
          <TerminalOutput output={terminalOutput} isRunning={isRunning} alwaysExpanded={true} />
        </div>
      </div>
    )
  }

  // Vertical: IR top, Terminal bottom (default)
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <CodeEditor value={value} onChange={onChange} />
      </div>
      <TerminalOutput output={terminalOutput} isRunning={isRunning} />
    </div>
  )
}
