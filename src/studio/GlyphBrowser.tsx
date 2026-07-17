import { useEffect, useMemo, useState } from 'react'
import { studioApi, type GlyphEntry } from '../lib/studioApi'
import { openGlyphEditor, useStudio } from './StudioContext'

const GROUP_LABELS: Record<string, string> = {
  caps: 'Uppercase',
  lowercase: 'Lowercase',
  figures: 'Figures',
  punctuation: 'Punctuation',
  accents: 'Accents',
  math_arrows: 'Math & arrows',
  other: 'Other',
}

export function GlyphBrowser() {
  const studio = useStudio()
  const [glyphs, setGlyphs] = useState<GlyphEntry[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    studioApi
      .glyphs()
      .then((catalog) => {
        if (cancelled) return
        setGlyphs(catalog.glyphs)
        setGroups(catalog.groups)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load glyphs')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studio.fontRevision])

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return glyphs
    return glyphs.filter(
      (glyph) =>
        glyph.name.toLowerCase().includes(query) ||
        (glyph.unicode ?? '').toLowerCase().includes(query),
    )
  }, [filter, glyphs])

  const grouped = useMemo(() => {
    const map = new Map<string, GlyphEntry[]>()
    for (const group of groups) map.set(group, [])
    for (const glyph of filtered) {
      map.get(glyph.group)?.push(glyph)
    }
    return map
  }, [filtered, groups])

  if (loading) return <p className="muted">Loading glyph catalog…</p>
  if (error) return <p className="studio-alert studio-alert--error">{error}</p>

  return (
    <section className="studio-panel">
      <div className="studio-panel__head">
        <div>
          <p className="eyebrow">F01</p>
          <h2>Glyph browser</h2>
        </div>
        <input
          className="studio-input"
          placeholder="Filter by name or unicode"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>

      {groups.map((group) => {
        const items = grouped.get(group) ?? []
        if (!items.length) return null
        return (
          <div key={group} className="glyph-group">
            <h3>{GROUP_LABELS[group] ?? group}</h3>
            <div className="glyph-grid">
              {items.map((glyph) => {
                const selected = studio.selectedGlyphs.includes(glyph.name)
                return (
                  <button
                    key={glyph.name}
                    type="button"
                    className={`glyph-cell${selected ? ' is-selected' : ''}`}
                    onClick={() => openGlyphEditor(glyph, studio)}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      studio.toggleGlyphSelection(glyph.name)
                    }}
                  >
                    <span className="glyph-cell__char" aria-hidden>
                      {glyph.unicode ? String.fromCodePoint(parseInt(glyph.unicode.slice(2), 16)) : '?'}
                    </span>
                    <span className="glyph-cell__name">{glyph.name}</span>
                    {glyph.unicode && <span className="glyph-cell__unicode">{glyph.unicode}</span>}
                    {glyph.dna && <span className="glyph-cell__dna">DNA</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <p className="muted studio-hint">Right-click toggles multi-select for batch operations.</p>
    </section>
  )
}
