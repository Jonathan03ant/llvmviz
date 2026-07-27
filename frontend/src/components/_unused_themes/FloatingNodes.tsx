import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

export function FloatingNodes() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Create floating nodes with varied sizes
    const nodeCount = 25
    const nodes: Node[] = []
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, // Slow, gentle drift
        vy: (Math.random() - 0.5) * 0.3,
        radius: 2 + Math.random() * 3, // Varied sizes
      })
    }

    let animationId: number

    function draw() {
      if (!ctx || !canvas) return

      // Clear with fade effect for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const maxConnectionDistance = 150

      // Draw connections first (so they appear behind nodes)
      nodes.forEach((nodeA, i) => {
        nodes.forEach((nodeB, j) => {
          if (i >= j) return // Avoid duplicate connections

          const dx = nodeA.x - nodeB.x
          const dy = nodeA.y - nodeB.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxConnectionDistance) {
            // Opacity based on distance (closer = brighter)
            const opacity = 1 - distance / maxConnectionDistance

            ctx.strokeStyle = `rgba(57, 255, 20, ${opacity * 0.2})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(nodeA.x, nodeA.y)
            ctx.lineTo(nodeB.x, nodeB.y)
            ctx.stroke()
          }
        })
      })

      // Draw nodes
      nodes.forEach((node) => {
        // Outer glow
        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          node.radius * 4
        )
        gradient.addColorStop(0, 'rgba(57, 255, 20, 0.6)')
        gradient.addColorStop(0.5, 'rgba(57, 255, 20, 0.3)')
        gradient.addColorStop(1, 'rgba(57, 255, 20, 0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2)
        ctx.fill()

        // Node core
        ctx.fillStyle = '#39ff14'
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()

        // Update position (gentle floating)
        node.x += node.vx
        node.y += node.vy

        // Bounce off edges with smooth reversal
        if (node.x < 0 || node.x > canvas.width) {
          node.vx *= -1
          node.x = Math.max(0, Math.min(canvas.width, node.x))
        }
        if (node.y < 0 || node.y > canvas.height) {
          node.vy *= -1
          node.y = Math.max(0, Math.min(canvas.height, node.y))
        }

        // Add slight random drift for organic movement
        node.vx += (Math.random() - 0.5) * 0.02
        node.vy += (Math.random() - 0.5) * 0.02

        // Limit speed
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
        if (speed > 0.5) {
          node.vx = (node.vx / speed) * 0.5
          node.vy = (node.vy / speed) * 0.5
        }
      })

      animationId = requestAnimationFrame(draw)
    }

    draw()

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
