import { useEffect, useRef } from 'react'

interface CircuitLine {
  x1: number
  y1: number
  x2: number
  y2: number
  isHorizontal: boolean
  pulse: number // 0-1, position of traveling signal
  hasPulse: boolean
}

export function CircuitBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Create grid-like circuit traces
    const lines: CircuitLine[] = []
    const gridSpacing = 80

    // Horizontal lines
    for (let y = gridSpacing / 2; y < canvas.height; y += gridSpacing) {
      const segments = Math.floor(canvas.width / gridSpacing)
      for (let i = 0; i < segments; i++) {
        const x1 = i * gridSpacing
        const x2 = x1 + gridSpacing * (Math.random() > 0.3 ? 1 : 2) // Vary length

        if (x2 < canvas.width) {
          lines.push({
            x1,
            y1: y,
            x2: Math.min(x2, canvas.width),
            y2: y,
            isHorizontal: true,
            pulse: Math.random(),
            hasPulse: Math.random() > 0.7, // Only some lines have pulses
          })
        }
      }
    }

    // Vertical lines
    for (let x = gridSpacing / 2; x < canvas.width; x += gridSpacing) {
      const segments = Math.floor(canvas.height / gridSpacing)
      for (let i = 0; i < segments; i++) {
        const y1 = i * gridSpacing
        const y2 = y1 + gridSpacing * (Math.random() > 0.3 ? 1 : 2) // Vary length

        if (y2 < canvas.height) {
          lines.push({
            x1: x,
            y1,
            x2: x,
            y2: Math.min(y2, canvas.height),
            isHorizontal: false,
            pulse: Math.random(),
            hasPulse: Math.random() > 0.7, // Only some lines have pulses
          })
        }
      }
    }

    // Add connection pads at intersections
    const pads: { x: number; y: number }[] = []
    for (let y = gridSpacing / 2; y < canvas.height; y += gridSpacing) {
      for (let x = gridSpacing / 2; x < canvas.width; x += gridSpacing) {
        if (Math.random() > 0.5) {
          pads.push({ x, y })
        }
      }
    }

    let animationId: number

    function draw() {
      if (!ctx || !canvas) return

      // Clear with very slight fade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw circuit traces
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.2)'
      ctx.lineWidth = 2
      ctx.lineCap = 'square'

      lines.forEach((line) => {
        // Draw trace
        ctx.beginPath()
        ctx.moveTo(line.x1, line.y1)
        ctx.lineTo(line.x2, line.y2)
        ctx.stroke()

        // Draw pulse if this line has one
        if (line.hasPulse) {
          const length = Math.sqrt(
            Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)
          )
          const pulseX = line.x1 + (line.x2 - line.x1) * line.pulse
          const pulseY = line.y1 + (line.y2 - line.y1) * line.pulse

          // Draw pulse with glow
          const gradient = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 8)
          gradient.addColorStop(0, '#39ff14')
          gradient.addColorStop(0.5, 'rgba(57, 255, 20, 0.5)')
          gradient.addColorStop(1, 'rgba(57, 255, 20, 0)')

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(pulseX, pulseY, 8, 0, Math.PI * 2)
          ctx.fill()

          // Bright center
          ctx.fillStyle = '#39ff14'
          ctx.beginPath()
          ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2)
          ctx.fill()

          // Update pulse position (very slow)
          line.pulse += 0.003
          if (line.pulse > 1) {
            line.pulse = 0
            // Sometimes disable pulse after completion
            if (Math.random() > 0.7) {
              line.hasPulse = false
              // Re-enable another random line
              const randomLine = lines[Math.floor(Math.random() * lines.length)]
              randomLine.hasPulse = true
              randomLine.pulse = 0
            }
          }
        }
      })

      // Draw connection pads
      pads.forEach((pad) => {
        ctx.fillStyle = 'rgba(57, 255, 20, 0.4)'
        ctx.beginPath()
        ctx.arc(pad.x, pad.y, 3, 0, Math.PI * 2)
        ctx.fill()

        // Outer ring
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.3)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(pad.x, pad.y, 5, 0, Math.PI * 2)
        ctx.stroke()
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
      className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
