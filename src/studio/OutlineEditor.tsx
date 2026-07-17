import { useCallback, useEffect, useRef, useState } from 'react'
import { studioApi, type GlyphOutline, type OutlinePoint } from '../lib/studioApi'
import { useStudio } from './StudioContext'

type DragState = {
  contourIndex: number
  pointIndex: number
} | null

function drawOutline(
  ctx: CanvasRenderingContext2D,
  outline: GlyphOutline,
  scale: number,
  offsetX: number,
  offsetY: number,
  stroke: string,
) {
  ctx.save()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.fillStyle = 'rgba(29, 43, 255, 0.06)'

  for (const contour of outline.contours) {
    const points = contour.points
    if (!points.length) continue
    ctx.beginPath()
    points.forEach((point, index) => {
      const x = point.x * scale + offsetX
      const y = offsetY - point.y * scale
      if (index === 0) ctx.moveTo(x, y)
      else if (point.onCurve) ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  for (const contour of outline.contours) {
    contour.points.forEach((point) => {
      const x = point.x * scale + offsetX
      const y = offsetY - point.y * scale
      ctx.beginPath()
      ctx.fillStyle = point.onCurve ? '#0b0b0c' : '#1d2bff'
      ctx.arc(x, y, point.onCurve ? 4 : 3, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  ctx.restore()
}

function compareOutline(name: string, wght: number, opsz: number) {
  return studioApi.outline(name, wght, opsz)
}

export function OutlineEditor() {
  const studio = useStudio()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [outline, setOutline] = useState<GlyphOutline | null>(null)
  const [extremes, setExtremes] = useState<Record<string, GlyphOutline>>({})
  const [drag, setDrag] = useState<DragState>(null)
  const [localPoints, setLocalPoints] = useState<OutlinePoint[][]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [advancedMode, setAdvancedMode] = useState(false)

  const glyph = studio.selectedGlyph

  const loadOutline = useCallback(async () => {
    if (!glyph) return
    setError(null)
    try {
      const current = await studioApi.outline(glyph, studio.wght, studio.opsz)
      const [w100, w900, o14, o32] = await Promise.all([
        compareOutline(glyph, 100, studio.opsz),
        compareOutline(glyph, 900, studio.opsz),
        compareOutline(glyph, studio.wght, 14),
        compareOutline(glyph, studio.wght, 32),
      ])
      setOutline(current)
      setLocalPoints(current.contours.map((contour) => [...contour.points]))
      setExtremes({ w100, w900, o14, o32 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load outline')
    }
  }, [glyph, studio.opsz, studio.wght])

  useEffect(() => {
    void loadOutline()
  }, [loadOutline, studio.fontRevision])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !outline) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const draft: GlyphOutline = {
      ...outline,
      contours: localPoints.map((points) => ({ points })),
    }
    drawOutline(ctx, draft, 0.08, 40, canvas.height - 40, '#0b0b0c')
  }, [outline, localPoints])

  const commitPoints = async () => {
    if (!glyph || !outline) return
    setMessage(null)
    setError(null)
    const updates: Array<{ index: number; x: number; y: number }> = []
    localPoints.forEach((contour, contourIndex) => {
      contour.forEach((point, pointIndex) => {
        const original = outline.contours[contourIndex]?.points[pointIndex]
        if (!original) return
        if (original.x !== point.x || original.y !== point.y) {
          updates.push({
            index: outline.contours
              .slice(0, contourIndex)
              .reduce((sum, item) => sum + item.points.length, 0) + pointIndex,
            x: point.x,
            y: point.y,
          })
        }
      })
    })
    try {
      await studioApi.applyEdit({
        intent: 'points',
        glyphs: [glyph],
        payload: { updates, wght: studio.wght, opsz: studio.opsz },
        confirmAdvanced: advancedMode,
      })
      studio.bumpFontRevision()
      setMessage('Committed point edits to working copy.')
      await loadOutline()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed')
    }
  }

  const resetToInter = async () => {
    if (!glyph) return
    try {
      await studioApi.applyEdit({
        intent: 'reset_inter',
        glyphs: [glyph],
        payload: {},
      })
      studio.bumpFontRevision()
      setMessage(`Reset ${glyph} from Inter baseline.`)
      await loadOutline()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!outline) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left - 40) / 0.08
    const y = (canvas.height - 40 - (event.clientY - rect.top)) / 0.08
    let closest: DragState = null
    let closestDistance = Infinity
    localPoints.forEach((contour, contourIndex) => {
      contour.forEach((point, pointIndex) => {
        const distance = Math.hypot(point.x - x, point.y - y)
        if (distance < closestDistance && distance < 80) {
          closestDistance = distance
          closest = { contourIndex, pointIndex }
        }
      })
    })
    setDrag(closest)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left - 40) / 0.08
    const y = (canvas.height - 40 - (event.clientY - rect.top)) / 0.08
    setLocalPoints((current) =>
      current.map((contour, contourIndex) =>
        contourIndex === drag.contourIndex
          ? contour.map((point, pointIndex) =>
              pointIndex === drag.pointIndex ? { ...point, x, y } : point,
            )
          : contour,
      ),
    )
  }

  if (!glyph) {
    return (
      <section className="studio-panel studio-panel--placeholder">
        <p className="eyebrow">F02</p>
        <h2>Outline editor</h2>
        <p className="muted">Select a glyph in the browser to edit its outline.</p>
      </section>
    )
  }

  return (
    <section className="studio-panel">
      <div className="studio-panel__head">
        <div>
          <p className="eyebrow">F02</p>
          <h2>{glyph}</h2>
        </div>
        <div className="studio-inline-controls">
          <label>
            wght
            <input
              type="range"
              min={100}
              max={900}
              value={studio.wght}
              onChange={(event) => studio.setWght(Number(event.target.value))}
            />
            <span>{studio.wght}</span>
          </label>
          <label>
            opsz
            <input
              type="range"
              min={14}
              max={32}
              value={studio.opsz}
              onChange={(event) => studio.setOpsz(Number(event.target.value))}
            />
            <span>{studio.opsz}</span>
          </label>
        </div>
      </div>

      {error && <p className="studio-alert studio-alert--error">{error}</p>}
      {message && <p className="studio-alert studio-alert--ok">{message}</p>}

      <div className="editor-layout">
        <canvas
          ref={canvasRef}
          width={640}
          height={420}
          className="editor-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        />
        <div className="editor-side">
          <label className="studio-checkbox">
            <input
              type="checkbox"
              checked={advancedMode}
              onChange={(event) => setAdvancedMode(event.target.checked)}
            />
            Advanced mode (allows point-count changes with confirmation)
          </label>
          <div className="editor-actions">
            <button type="button" className="primary-button" onClick={() => void commitPoints()}>
              Commit to working
            </button>
            <button type="button" className="secondary-button" onClick={() => void resetToInter()}>
              Reset to Inter
            </button>
            <button type="button" className="secondary-button" onClick={() => void studioApi.undo().then(() => { studio.bumpFontRevision(); void loadOutline() })}>
              Undo
            </button>
            <button type="button" className="secondary-button" onClick={() => void studioApi.redo().then(() => { studio.bumpFontRevision(); void loadOutline() })}>
              Redo
            </button>
          </div>
          <div className="compare-grid">
            {Object.entries(extremes).map(([key, item]) => (
              <CompareMini key={key} label={key} outline={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CompareMini({ label, outline }: { label: string; outline: GlyphOutline }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawOutline(ctx, outline, 0.05, 20, canvas.height - 20, '#62625e')
  }, [outline])
  return (
    <div className="compare-mini">
      <span>{label}</span>
      <canvas ref={canvasRef} width={160} height={100} />
    </div>
  )
}
