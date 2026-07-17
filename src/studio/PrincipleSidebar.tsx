import { useEffect, useState } from 'react'
import { studioApi, type PrincipleChecks } from '../lib/studioApi'
import { useStudio } from './StudioContext'

export function PrincipleSidebar() {
  const studio = useStudio()
  const [checks, setChecks] = useState<PrincipleChecks | null>(null)

  useEffect(() => {
    let cancelled = false
    studioApi
      .principles(studio.selectedGlyph ?? undefined, studio.selectedGlyphs.length || undefined)
      .then((result) => {
        if (!cancelled) setChecks(result)
      })
      .catch(() => {
        if (!cancelled) setChecks(null)
      })
    return () => {
      cancelled = true
    }
  }, [studio.selectedGlyph, studio.selectedGlyphs.length, studio.fontRevision])

  if (!checks) {
    return (
      <aside className="principle-sidebar">
        <p className="eyebrow">F05 Advisory</p>
        <p className="muted">Principle checks load while you edit.</p>
      </aside>
    )
  }

  const allFlags = [
    ...checks.distinctAt13px.flags,
    ...checks.warmthIsDetail.flags,
    ...checks.rhythmBeforeLetterforms.flags,
  ]

  return (
    <aside className="principle-sidebar">
      <p className="eyebrow">F05 Advisory</p>
      <h2>Principle checks</h2>
      <p className="muted">Advisory only — never blocks Save or Export.</p>

      <section>
        <h3>Distinct at 13px</h3>
        {checks.distinctAt13px.confusables.length ? (
          <ul>
            {checks.distinctAt13px.confusables.map((item) => (
              <li key={item.glyph} className={item.suspicious ? 'is-flagged' : undefined}>
                {item.glyph}: advance {item.advanceWidth.toFixed(0)}, bbox {item.bboxWidth.toFixed(0)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Select l, I, one, zero, O, o, or G for confusable compare.</p>
        )}
      </section>

      <section>
        <h3>Warmth is detail</h3>
        <p>
          Selection {checks.warmthIsDetail.selectionCount} / {checks.warmthIsDetail.totalGlyphs}
          {checks.warmthIsDetail.coverageRatio !== undefined &&
            ` (${Math.round(checks.warmthIsDetail.coverageRatio * 100)}%)`}
        </p>
      </section>

      <section>
        <h3>Rhythm before letterforms</h3>
        {checks.rhythmBeforeLetterforms.deltas.length ? (
          <ul>
            {checks.rhythmBeforeLetterforms.deltas.map((item) => (
              <li key={item.glyph}>
                {item.glyph}: {item.advanceDelta > 0 ? '+' : ''}
                {item.advanceDelta.toFixed(0)} units vs published source
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Advance deltas appear for the selected glyph.</p>
        )}
      </section>

      {allFlags.length > 0 && (
        <section className="principle-flags">
          {allFlags.map((flag) => (
            <p key={flag}>{flag}</p>
          ))}
        </section>
      )}
    </aside>
  )
}
