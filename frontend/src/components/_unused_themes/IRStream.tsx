import { useEffect, useRef } from 'react'

interface CodeLine {
  text: string
  x: number
  y: number
  opacity: number
  speed: number
}

export function IRStream() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // LLVM IR snippets
    const irSnippets = [
      '%1 = add i32 %a, %b',
      '%2 = load i32, ptr %x',
      'store i32 %val, ptr %p',
      'br label %bb1',
      '%3 = call i32 @foo(i32 %x)',
      'ret i32 %result',
      '%4 = phi i32 [%a, %bb1], [%b, %bb2]',
      '%5 = icmp eq i32 %x, 0',
      '%6 = select i1 %cond, i32 %a, i32 %b',
      '%7 = getelementptr i32, ptr %p, i64 %idx',
      '%8 = mul i32 %x, %y',
      '%9 = and i32 %a, %b',
      'define i32 @main() {',
      '}',
      '%10 = sext i32 %x to i64',
    ]

    const lines: CodeLine[] = []

    // Create initial code lines
    for (let i = 0; i < 15; i++) {
      lines.push({
        text: irSnippets[Math.floor(Math.random() * irSnippets.length)],
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        opacity: 0.2 + Math.random() * 0.3,
        speed: 0.1 + Math.random() * 0.2,
      })
    }

    let animationId: number

    function draw() {
      if (!ctx || !canvas) return

      // Dark fade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = '11px JetBrains Mono, monospace'

      lines.forEach((line) => {
        // Fade in/out effect based on position
        let displayOpacity = line.opacity
        if (line.y < 20) {
          displayOpacity *= line.y / 20
        } else if (line.y > canvas.height - 20) {
          displayOpacity *= (canvas.height - line.y) / 20
        }

        // Draw code line
        ctx.fillStyle = `rgba(57, 255, 20, ${displayOpacity})`
        ctx.fillText(line.text, line.x, line.y)

        // Occasional highlight on specific keywords
        if (line.text.includes('add') || line.text.includes('mul') || line.text.includes('call')) {
          ctx.fillStyle = `rgba(57, 255, 20, ${displayOpacity * 0.3})`
          ctx.fillRect(line.x - 2, line.y - 12, ctx.measureText(line.text).width + 4, 14)
          // Redraw text on top
          ctx.fillStyle = `rgba(57, 255, 20, ${displayOpacity})`
          ctx.fillText(line.text, line.x, line.y)
        }

        // Move slowly downward
        line.y += line.speed

        // Reset if off bottom
        if (line.y > canvas.height + 20) {
          line.y = -20
          line.x = Math.random() * (canvas.width - 200)
          line.text = irSnippets[Math.floor(Math.random() * irSnippets.length)]
          line.opacity = 0.2 + Math.random() * 0.3
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
      className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
