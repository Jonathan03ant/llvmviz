import { useEffect, useRef } from 'react'

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Matrix characters - binary + some symbols
    const chars = '01アイウエオカキクケコサシスセソタチツテト'
    const fontSize = 14
    const columnWidth = fontSize * 2 // Wider columns = fewer drops
    const columns = Math.floor(canvas.width / columnWidth)

    // Array to track Y position of each column
    const drops: number[] = []
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100 // Start at random positions
    }

    let animationId: number

    function draw() {
      if (!ctx || !canvas) return

      // Semi-transparent black to create fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Matrix green text
      ctx.fillStyle = '#39ff14'
      ctx.font = `${fontSize}px monospace`

      // Draw characters
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        const x = i * columnWidth
        const y = drops[i] * fontSize

        ctx.fillText(char, x, y)

        // Reset drop to top randomly
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }

        // Slower drop speed (increment by 0.5 instead of 1)
        drops[i] += 0.5
      }

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
      className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
