# LLVMViz Frontend - The Only Guide You Need

**Last Updated:** 2026-07-16

---

## Directory Structure

```
src/components/
├── common/          # Shared UI (Header, StatusBar, CodeEditor, etc.)
├── graph/           # Graph visualization (GraphCanvas, NodeDetailsPanel, layoutDag)
├── tools/           # Tool implementations (SelectionDAGViewer, IRPassViewer, etc.)
└── _unused_themes/  # Old background components (ignore these)
```

**Rule of thumb:**
- **common/** = Used by 2+ tools (Header, InputPanel, etc.)
- **graph/** = Graph rendering logic (reusable for DAG/MIR)
- **tools/** = Self-contained tools (one per tab)

---

## Component Map

```
App.tsx
  ├─→ Header (common)
  ├─→ InputPanel (common) → CodeEditor (common)
  ├─→ SelectionDAGViewer (tools)
  │     ├─→ GraphCanvas (graph)
  │     ├─→ NodeDetailsPanel (graph)
  │     └─→ layoutDag() (graph)
  └─→ StatusBar (common) → CustomSelect (common)
```

---

## Adding a New Tool (e.g., IR Pass Visualizer)

**1. Create component:**
```bash
touch src/components/tools/IRPassViewer.tsx
```

**2. Write it:**
```typescript
import { useState } from 'react'
import { InputPanel } from '../common'

export function IRPassViewer() {
  const [irCode, setIrCode] = useState('')

  return (
    <div>
      <InputPanel value={irCode} onChange={setIrCode} />
      {/* Your tool UI here */}
    </div>
  )
}
```

**3. Export it:**
```typescript
// src/components/tools/index.ts
export { IRPassViewer } from './IRPassViewer'
```

**4. Route it in App.tsx:**
```typescript
import { SelectionDAGViewer, IRPassViewer } from './components/tools'

{activeTab === 'irpasses' && <IRPassViewer ... />}
```

**5. Enable tab in Header.tsx:**
```typescript
// src/components/common/Header.tsx
{ id: 'irpasses', label: 'IR Passes', disabled: false }
```

---

## Common Tasks

### Change Graph Colors
```typescript
// src/components/graph/nodeStyles.ts
export const NODE_STYLES = {
  color: '#18a018',  // ← Change this
}

export const EDGE_COLORS = {
  data: '#8b5cf6',   // ← Or these
  chain: '#3b82f6',
  glue: '#ef4444',
}
```

### Change Layout Spacing
```typescript
// src/components/graph/nodeStyles.ts
export const LAYOUT_CONFIG = {
  nodesep: 100,   // ← Horizontal spacing
  ranksep: 150,   // ← Vertical spacing
}
```

### Modify Node Details Panel
```typescript
// src/components/graph/NodeDetailsPanel.tsx
// Just edit the JSX/styling
```

### Add New DAG Stage
```typescript
// src/components/common/StatusBar.tsx
const DAG_STAGES = [
  { value: 'isel', label: 'isel' },
  { value: 'your-stage', label: 'your-stage' },  // ← Add here
]
```

---

## Style Guide

**Colors:**
- Primary: `#18a018` (muted green)
- Background: `#0a0a0a` (dark gray)
- Black: `#000000` (header)
- Border: `#1a1a1a`

**Fonts:**
- Code: `'JetBrains Mono, monospace'`
- UI: `'Inter, sans-serif'`

---

## What Each Component Does

### common/
- **Header** - Tab navigation (SelectionDAG | IR Passes | MIR | Assembly)
- **StatusBar** - Settings bar (llc path, arch, CPU, stage, RUN button)
- **InputPanel** - Wrapper for CodeEditor
- **CodeEditor** - Text editor with line numbers, tab support
- **CustomSelect** - Styled dropdown matching color scheme

### graph/
- **GraphCanvas** - ReactFlow wrapper (background, controls, empty state)
- **NodeDetailsPanel** - Floating draggable panel showing node details
- **DagLayout.ts** - Pure function: applies Dagre layout algorithm
- **nodeStyles.ts** - Constants (colors, sizes, spacing)

### tools/
- **SelectionDAGViewer** - Orchestrates graph components, handles clicks/selection

---

## Imports

```typescript
// Clean barrel imports
import { Header, StatusBar, InputPanel } from './components/common'
import { GraphCanvas, NodeDetailsPanel, layoutDag } from './components/graph'
import { SelectionDAGViewer } from './components/tools'
```

---

## File Sizes (guideline: keep under 200 lines)

```
SelectionDAGViewer: 150 lines ✅
NodeDetailsPanel:   120 lines ✅
CodeEditor:         113 lines ✅
GraphCanvas:         70 lines ✅
DagLayout:           70 lines ✅
```

---

## Why This Structure?

**Before refactoring:** GraphViewer.tsx (340 lines, everything in one file)

**After refactoring:** Modular structure

**Benefits:**
1. **Reusability** - MIR viewer reuses 80% of graph components
2. **Maintainability** - Fix bug once, all tools benefit
3. **AI-friendly** - Clear structure = better AI modifications

**Example:** Adding MIR viewer = write 50 lines (layoutMir), reuse GraphCanvas/NodeDetailsPanel/InputPanel

---

## That's It!

Three directories, clean imports, easy to extend. When in doubt:
- Shared UI → `common/`
- Graph rendering → `graph/`
- New tool → `tools/`

**Next:** Add IR Pass Visualizer (Tool #2)
