import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { studioApi } from '../lib/studioApi'
import { BatchPanel } from './BatchPanel'
import { ExportPanel } from './ExportPanel'
import { GlyphBrowser } from './GlyphBrowser'
import { OutlineEditor } from './OutlineEditor'
import { PrincipleSidebar } from './PrincipleSidebar'
import { StudioProvider, useStudio } from './StudioContext'
import { TextPreview } from './TextPreview'
import './studio.css'

const PRINCIPLES = [
  { title: 'Distinct at 13px', gloss: 'Stay differentiable at small sizes against confusables.' },
  { title: 'Warmth is detail', gloss: 'Personality lives in precise details, not global wobble.' },
  { title: 'Rhythm before letterforms', gloss: 'Spacing and advance rhythm matter more than ornament.' },
] as const

const TABS = [
  { id: 'browser', label: 'Glyphs' },
  { id: 'editor', label: 'Editor' },
  { id: 'preview', label: 'Preview' },
  { id: 'batch', label: 'Batch' },
  { id: 'export', label: 'Export' },
] as const

function StudioShell() {
  const studio = useStudio()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'discard' | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      await studio.refreshStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load font status')
    }
  }, [studio])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleSave = async () => {
    setBusy('save')
    setMessage(null)
    setError(null)
    try {
      const result = await studioApi.save()
      setMessage(`Saved. Backup at ${result.historyPath}`)
      studio.bumpFontRevision()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  const handleDiscard = async () => {
    setBusy('discard')
    setMessage(null)
    setError(null)
    try {
      await studioApi.discardWorking()
      setMessage('Working copy reset from source.')
      studio.bumpFontRevision()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discard failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div className="studio-header__start">
          <Link to="/survey" className="studio-wordmark">
            Seb Sans Studio
          </Link>
          <p className="studio-tagline muted">Inter fork · local variable font editor</p>
        </div>
        <nav className="studio-tabs" aria-label="Studio sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={studio.tab === tab.id ? 'is-active' : undefined}
              onClick={() => studio.setTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="studio-header__actions">
          <button
            type="button"
            className="secondary-button"
            disabled={busy !== null}
            onClick={() => void handleDiscard()}
          >
            {busy === 'discard' ? 'Discarding…' : 'Discard working'}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={busy !== null || studio.status?.workingMatchesSource}
            onClick={() => void handleSave()}
          >
            {busy === 'save' ? 'Saving…' : 'Save to source'}
          </button>
        </div>
      </header>

      <div className="studio-body">
        <div className="studio-content">
          {error && <p className="studio-alert studio-alert--error">{error}</p>}
          {message && <p className="studio-alert studio-alert--ok">{message}</p>}
          {studio.tab === 'browser' && <GlyphBrowser />}
          {studio.tab === 'editor' && <OutlineEditor />}
          {studio.tab === 'preview' && <TextPreview />}
          {studio.tab === 'batch' && <BatchPanel />}
          {studio.tab === 'export' && <ExportPanel />}
        </div>
        <PrincipleSidebar />
      </div>

      <footer className="studio-principles" aria-label="Design principles">
        {PRINCIPLES.map((principle) => (
          <article key={principle.title} className="studio-principle">
            <h2>{principle.title}</h2>
            <p>{principle.gloss}</p>
          </article>
        ))}
      </footer>
    </div>
  )
}

export function StudioPage() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  )
}
