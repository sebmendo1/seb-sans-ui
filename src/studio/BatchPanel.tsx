import { useState } from 'react'
import { studioApi } from '../lib/studioApi'
import { useStudio } from './StudioContext'

const OPERATIONS = [
  { id: 'contour_scale', label: 'Enlarge / shrink contour about center', factor: true },
  { id: 'scale_width', label: 'Scale width', factor: true },
  { id: 'shift_vertical', label: 'Shift ascender / descender depth', delta: true },
  { id: 'sidebearings', label: 'Nudge sidebearings', sidebearings: true },
] as const

export function BatchPanel() {
  const studio = useStudio()
  const [operation, setOperation] = useState<(typeof OPERATIONS)[number]['id']>('contour_scale')
  const [factor, setFactor] = useState(1.08)
  const [delta, setDelta] = useState(10)
  const [edge, setEdge] = useState<'ascender' | 'descender'>('descender')
  const [lsbDelta, setLsbDelta] = useState(0)
  const [rsbDelta, setRsbDelta] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  const selection = studio.selectedGlyphs
  const opMeta = OPERATIONS.find((item) => item.id === operation)

  const payload = () => {
    if (operation === 'contour_scale' || operation === 'scale_width') {
      return { operation, factor }
    }
    if (operation === 'shift_vertical') {
      return { operation, delta, edge }
    }
    return { operation, lsbDelta, rsbDelta }
  }

  const preview = async () => {
    if (!selection.length) {
      setError('Select glyphs in the browser first.')
      return
    }
    setError(null)
    setMessage(null)
    try {
      const result = await studioApi.previewBatch({ glyphs: selection, payload: payload() })
      setPreviewCount(result.previewGlyphCount)
      setMessage(`Preview ready for ${result.previewGlyphCount} glyphs.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    }
  }

  const apply = async () => {
    if (!selection.length) {
      setError('Select glyphs in the browser first.')
      return
    }
    setError(null)
    setMessage(null)
    try {
      await studioApi.applyEdit({
        intent: 'batch',
        glyphs: selection,
        payload: payload(),
      })
      studio.bumpFontRevision()
      setMessage(`Applied batch operation to ${selection.length} glyphs.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed')
    }
  }

  const warmthRatio = selection.length ? selection.length : 0

  return (
    <section className="studio-panel">
      <div className="studio-panel__head">
        <div>
          <p className="eyebrow">F03</p>
          <h2>Batch operations</h2>
        </div>
        <p className="muted">{selection.length} glyphs selected</p>
      </div>

      {error && <p className="studio-alert studio-alert--error">{error}</p>}
      {message && <p className="studio-alert studio-alert--ok">{message}</p>}
      {warmthRatio > 0 && (
        <p className="studio-alert">
          Selection size will be checked against the warmth advisory (&gt;40% of glyph set).
        </p>
      )}

      <div className="batch-controls">
        <label>
          Operation
          <select
            className="studio-input"
            value={operation}
            onChange={(event) => setOperation(event.target.value as typeof operation)}
          >
            {OPERATIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {opMeta && 'factor' in opMeta && opMeta.factor && (
          <label>
            Factor {factor.toFixed(2)}
            <input
              type="range"
              min={0.8}
              max={1.3}
              step={0.01}
              value={factor}
              onChange={(event) => setFactor(Number(event.target.value))}
            />
          </label>
        )}

        {operation === 'shift_vertical' && (
          <>
            <label>
              Delta {delta}
              <input
                type="range"
                min={-40}
                max={40}
                value={delta}
                onChange={(event) => setDelta(Number(event.target.value))}
              />
            </label>
            <label>
              Edge
              <select
                className="studio-input"
                value={edge}
                onChange={(event) => setEdge(event.target.value as typeof edge)}
              >
                <option value="ascender">Ascender</option>
                <option value="descender">Descender</option>
              </select>
            </label>
          </>
        )}

        {operation === 'sidebearings' && (
          <>
            <label>
              LSB delta {lsbDelta}
              <input
                type="range"
                min={-40}
                max={40}
                value={lsbDelta}
                onChange={(event) => setLsbDelta(Number(event.target.value))}
              />
            </label>
            <label>
              RSB delta {rsbDelta}
              <input
                type="range"
                min={-40}
                max={40}
                value={rsbDelta}
                onChange={(event) => setRsbDelta(Number(event.target.value))}
              />
            </label>
          </>
        )}
      </div>

      <div className="editor-actions">
        <button type="button" className="secondary-button" onClick={() => void preview()}>
          Preview batch
        </button>
        <button type="button" className="primary-button" onClick={() => void apply()}>
          Apply to working
        </button>
      </div>
      {previewCount !== null && <p className="muted">Last preview covered {previewCount} glyphs.</p>}
    </section>
  )
}
