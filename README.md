<div align="center">
  <img src="frontend/public/llvm-readme.png" alt="LLVMViz Logo" width="400"/>

  # LLVMViz

  **Interactive LLVM Compiler Visualization Platform**

  [![Live Demo](https://img.shields.io/badge/demo-llvmviz.org-blue.svg)](https://llvmviz.org)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
  [![GitHub release](https://img.shields.io/github/v/release/jonathan03ant/llvmviz.svg)](https://github.com/jonathan03ant/llvmviz/releases)

  [Live Demo](https://llvmviz.org) • [Documentation](https://github.com/jonathan03ant/llvmviz) • [Report Bug](https://github.com/jonathan03ant/llvmviz/issues)
</div>

---

## What is LLVMViz?

LLVMViz is an interactive web-based platform for visualizing LLVM compiler internals. It helps developers, students, and compiler engineers understand how LLVM transforms code through its compilation pipeline.

**Perfect for:**
- **Learning** - Understand LLVM's SelectionDAG and MIR transformations visually
- **Debugging** - Compare DAG/MIR states before and after optimizations
- **Research** - Analyze how different passes affect code generation
- **Teaching** - Demonstrate compiler concepts with real-time visualization

---

## Features

### SelectionDAG Viewer
- **Interactive DAG visualization** with zoom, pan, and node inspection
- **Stage-by-stage viewing** (dag-combine1, legalize, isel, sched, etc.)
- **Compare mode** for before/after analysis
- **Node highlighting** with connection tracing
- Support for 50+ LLVM target architectures

### MIR Viewer
- **Full MIR pipeline visualization** with automatic pass discovery
- **Syntax highlighting** for virtual/physical registers, basic blocks, opcodes
- **Multi-tab interface** for viewing multiple passes simultaneously
- **Side-by-side comparison** with line-level and word-level diff highlighting
- **Smart filtering** - separates viewable passes from analysis-only passes
- **Quick navigation** - jump to registers, frame info, or basic blocks instantly

### Modern UI
- Dark theme optimized for code readability
- Collapsible panels to maximize viewing area
- Resizable sidebars
- Copy/Download MIR output
- Real-time MIR generation

---

## Quick Start

### Try it Live
Visit **[llvmviz.org](https://llvmviz.org)** - no installation needed!

### Run Locally

```bash
# Clone the repository
git clone https://github.com/jonathan03ant/llvmviz.git
cd llvmviz

# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Use with Your LLVM Code

**SelectionDAG Visualization:**
```bash
# Generate DAG from LLVM IR
llc -march=amdgcn -mcpu=gfx1101 -view-isel-dags input.ll

# Or use llc with -debug flag
llc -march=amdgcn -debug input.ll 2>&1 | grep SelectionDAG
```

**MIR Visualization:**
```bash
# Generate MIR for a specific pass
llc -march=amdgcn -mcpu=gfx1101 -stop-after=regbankselect input.ll -o output.mir

# Paste the output into LLVMViz MIR Viewer
```

---

## Screenshots

### SelectionDAG Viewer
Interactive visualization of LLVM's SelectionDAG with stage-by-stage views and compare mode.

### MIR Viewer
Full pipeline visualization with syntax highlighting, tabs, and side-by-side comparison.

*(Screenshots to be added)*

---

```

**Tech Stack:**
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Python Flask
- **Compiler:** LLVM (debug build with `-view-isel-dags`)
- **Deployment:** Automated via GitHub Actions

---

## How It Works

### SelectionDAG
1. Paste LLVM IR or upload a file
2. Select architecture and CPU (AMDGPU, X86, ARM, etc.)
3. Choose compilation stage (legalize, isel, sched, etc.)
4. View interactive DAG with zoom/pan
5. Compare different stages side-by-side

### MIR Pipeline
1. Click "Discover Passes" to analyze the entire pipeline
2. Browse passes categorized by stage (regbankselect, instruction-select, etc.)
3. Click any pass to view MIR output with syntax highlighting
4. Open multiple passes in tabs
5. Compare two passes side-by-side with diff highlighting

---

## Development

### Prerequisites
- Node.js 20+
- Python 3.8+

### Building from Source

```bash
# Install frontend dependencies
cd frontend
npm install

# Build frontend
npm run build

# Run backend
cd ../backend
python3 app.py
```

### Running Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
pytest
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## Roadmap

- [ ] ScheduleDAG visualization
- [ ] Register allocation visualization
- [ ] Live editing and compilation
- [ ] Export DAG/MIR as images
- [ ] Custom pass filtering and search
- [ ] More architecture support
- [ ] Collaborative sharing (save/load sessions)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- LLVM Project for the incredible compiler infrastructure
- The LLVM community for documentation and support
- Inspired by existing LLVM visualization tools

---

## Contact

**Jonathan** - [@jonathan03ant](https://github.com/jonathan03ant)

**Project Link:** [https://github.com/jonathan03ant/llvmviz](https://github.com/jonathan03ant/llvmviz)

**Live Demo:** [https://llvmviz.org](https://llvmviz.org)

---

<div align="center">
  Made with ❤️ for the LLVM community
</div>
