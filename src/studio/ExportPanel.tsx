import { useState } from 'react'
import { studioApi, type ExportStatus } from '../lib/studioApi'

export function ExportPanel() {
  const [version, setVersion] = useState('0.6.0')
  const [changelog, setChangelog] = useState('Studio export from working copy.')
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<ExportStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runExport = async () => {
    setBusy(true)
    setError(null)
    try {
      const started = await studioApi.exportRun(version, changelog)
      setJobId(started.jobId)
      setStatus(await studioApi.exportStatus(started.jobId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed to start')
    } finally {
      setBusy(false)
    }
  }

  const refreshStatus = async () => {
    if (!jobId) return
    setStatus(await studioApi.exportStatus(jobId))
  }

  return (
    <section className="studio-panel">
      <div className="studio-panel__head">
        <div>
          <p className="eyebrow">F06 / F07</p>
          <h2>Export & publish checklist</h2>
        </div>
      </div>

      {error && <p className="studio-alert studio-alert--error">{error}</p>}

      <div className="export-form">
        <label>
          Version
          <input
            className="studio-input"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
          />
        </label>
        <label>
          Changelog
          <textarea
            className="studio-textarea"
            rows={4}
            value={changelog}
            onChange={(event) => setChangelog(event.target.value)}
          />
        </label>
        <div className="editor-actions">
          <button type="button" className="primary-button" disabled={busy} onClick={() => void runExport()}>
            {busy ? 'Running export…' : 'Run export'}
          </button>
          {jobId && (
            <button type="button" className="secondary-button" onClick={() => void refreshStatus()}>
              Refresh status
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className="export-status">
          <p>
            Status: <strong>{status.status}</strong>
          </p>
          {status.error && <p className="studio-alert studio-alert--error">{status.error}</p>}

          <div className="export-gates">
            {Object.entries(status.gates).map(([name, gate]) => (
              <article key={name} className={gate.ok ? 'gate-ok' : 'gate-fail'}>
                <h3>{name}</h3>
                <p>{gate.ok ? 'Passed' : 'Failed'}</p>
                {gate.failures?.map((failure) => (
                  <p key={failure} className="muted">
                    {failure}
                  </p>
                ))}
                {gate.warnings?.map((warning) => (
                  <p key={warning} className="muted">
                    Warning: {warning}
                  </p>
                ))}
              </article>
            ))}
          </div>

          {status.steps.length > 0 && (
            <ul className="export-steps">
              {status.steps.map((step, index) => (
                <li key={`${step.step}-${index}`}>
                  {String(step.step)}
                  {step.skipped ? ' (skipped)' : ''}
                </li>
              ))}
            </ul>
          )}

          {status.zipPath && status.status === 'complete' && (
            <p>
              Zip ready: <code>{status.zipPath}</code>
            </p>
          )}

          {status.checklist.length > 0 && (
            <div className="publish-checklist">
              <h3>Publish checklist</h3>
              <ul>
                {status.checklist.map((item) => (
                  <li key={item.id}>
                    <label className="studio-checkbox">
                      <input type="checkbox" />
                      {item.required ? '[Required] ' : '[Optional] '}
                      {item.text}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
