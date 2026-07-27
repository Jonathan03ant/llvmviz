import { useEffect, useRef } from 'react'

interface DAGNode {
  x: number
  y: number
  vx: number
  label: string
  connections: number[] // indices of nodes this connects to
  opacity: number
}

export function DAGFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // LLVM IR opcodes for authentic feel
    const opcodes = ['add', 'load', 'store', 'br', 'call', 'ret', 'phi', 'select', 'mul', 'and', 'or']

    const nodes: DAGNode[] = []
    const lanes = 4 // Number of horizontal lanes

    // Create initial nodes
    for (let i = 0; i < 12; i++) {
      const lane = Math.floor(Math.random() * lanes)
      nodes.push({
        x: -50 - Math.random() * 100, // Start off-screen left
        y: (canvas.height / (lanes + 1)) * (lane + 1),
        vx: 0.3 + Math.random() * 0.3, // Flow speed
        label: opcodes[Math.floor(Math.random() * opcodes.length)],
        connections: [],
        opacity: 0.3 + Math.random() * 0.4,
      })
    }

    // Create some connections (DAG edges)
    nodes.forEach((node, i) => {
      if (i > 0 && Math.random() > 0.5) {
        // Connect to 1-2 previous nodes
        const numConnections = Math.random() > 0.7 ? 2 : 1
        for (let j = 0; j < numConnections; j++) {
          const targetIdx = Math.floor(Math.random() * i)
          if (!node.connections.includes(targetIdx)) {
            node.connections.push(targetIdx)
          }
        }
      }
    })

    let animationId: number

    function draw() {
      if (!ctx || !canvas) return

      // Fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw connections (edges)
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.15)'
      ctx.lineWidth = 1

      nodes.forEach((node) => {
        node.connections.forEach((targetIdx) => {
          const target = nodes[targetIdx]
          if (!target) return

          // Only draw if both nodes are visible
          if (node.x > 0 && target.x > 0 && node.x < canvas.width && target.x < canvas.width) {
            ctx.beginPath()
            ctx.moveTo(target.x, target.y)
            ctx.lineTo(node.x, node.y)
            ctx.stroke()

            // Draw arrow head
            const angle = Math.atan2(node.y - target.y, node.x - target.x)
            const arrowSize = 5
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(
              node.x - arrowSize * Math.cos(angle - Math.PI / 6),
              node.y - arrowSize * Math.sin(angle - Math.PI / 6)
            )
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(
              node.x - arrowSize * Math.cos(angle + Math.PI / 6),
              node.y - arrowSize * Math.sin(angle + Math.PI / 6)
            )
            ctx.stroke()
          }
        })
      })

      // Draw nodes
      ctx.font = '10px JetBrains Mono, monospace'

      nodes.forEach((node, i) => {
        // Node circle
        ctx.fillStyle = `rgba(57, 255, 20, ${node.opacity})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2)
        ctx.fill()

        // Node glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 15)
        gradient.addColorStop(0, `rgba(57, 255, 20, ${node.opacity * 0.3})`)
        gradient.addColorStop(1, 'rgba(57, 255, 20, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, 15, 0, Math.PI * 2)
        ctx.fill()

        // Label
        ctx.fillStyle = `rgba(57, 255, 20, ${node.opacity * 0.8})`
        ctx.fillText(node.label, node.x - 12, node.y - 12)

        // Move node (flow left to right)
        node.x += node.vx

        // Reset if off-screen right
        if (node.x > canvas.width + 50) {
          node.x = -50
          node.label = opcodes[Math.floor(Math.random() * opcodes.length)]
          node.opacity = 0.3 + Math.random() * 0.4
        }
      })

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
