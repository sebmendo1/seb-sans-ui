import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ACTIVE_EXPERIMENT } from '../config/experiment'
import { buildSummary } from '../lib/analytics'
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from '../lib/adminAuth'
import {
  downloadCsv,
  downloadJson,
  loadSeedSubmissions,
  loadStoredSubmissions,
  mergeSubmissionExports,
  parseSubmissionExport,
  seedStoredSubmissions,
  submissionExportsToRows,
} from '../lib/surveyStorage'
import type { FontConfig, Submission, SubmissionExport, Summary } from '../types'

const CONTROL_LABELS: Record<string, string> = {
  weight: 'Weight',
  opsz: 'Optical',
  tracking: 'Tracking',
  leading: 'Leading',
  xheight: 'X-height',
}

export default function DashboardPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [authenticated, setAuthenticated] = useState(isAdminAuthenticated())
  const [pin, setPin] = useState('')
  const [imports, setImports] = useState<SubmissionExport[]>(() => [
    ...loadStoredSubmissions(),
  ])
  const [experimentFilter, setExperimentFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [copyFilter, setCopyFilter] = useState<'all' | 'original' | 'edited'>('all')
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'desktop'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | '7' | '30'>('all')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [seedLoaded, setSeedLoaded] = useState(false)

  useEffect(() => {
    if (!authenticated || seedLoaded) return
    void loadSeedSubmissions().then((seed) => {
      if (!seed.length) {
        setSeedLoaded(true)
        return
      }
      const stored = seedStoredSubmissions(seed)
      setImports((current) => mergeSubmissionExports(current, seed))
      setNotice(
        stored.length === seed.length
          ? `Loaded ${seed.length} archived submission${seed.length === 1 ? '' : 's'} from production.`
          : `Merged ${seed.length} archived submission${seed.length === 1 ? '' : 's'} with this browser.`,
      )
      setSeedLoaded(true)
    })
  }, [authenticated, seedLoaded])

  const submissions = useMemo(
    () => submissionExportsToRows(imports),
    [imports],
  )

  const filteredSubmissions = useMemo(() => {
    const scoped = experimentFilter
      ? submissions.filter((item) => item.experimentVersion === experimentFilter)
      : submissions
    const query = search.trim().toLowerCase()
    const cutoff =
      dateFilter === 'all'
        ? null
        : Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000
    return scoped.filter((item) => {
      const edited = item.display.sampleEdited || item.body.sampleEdited
      const isMobile = (item.viewport.width ?? 1000) < 700
      if (copyFilter === 'edited' && !edited) return false
      if (copyFilter === 'original' && edited) return false
      if (deviceFilter === 'mobile' && !isMobile) return false
      if (deviceFilter === 'desktop' && isMobile) return false
      if (cutoff && new Date(item.completedAt).getTime() < cutoff) return false
      if (!query) return true
      return [
        item.completionCode,
        item.feedback.likes,
        item.feedback.dislikes,
        item.feedback.feelings,
      ].some((value) => value.toLowerCase().includes(query))
    })
  }, [copyFilter, dateFilter, deviceFilter, experimentFilter, search, submissions])

  const summary = useMemo<Summary | null>(() => {
    if (!submissions.length) return null
    return buildSummary(
      experimentFilter
        ? submissions.filter((item) => item.experimentVersion === experimentFilter)
        : submissions,
    )
  }, [experimentFilter, submissions])

  const experimentVersions = useMemo(
    () => [...new Set(submissions.map((item) => item.experimentVersion))],
    [submissions],
  )

  function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    if (loginAdmin(pin)) {
      setAuthenticated(true)
      setError('')
      return
    }
    setError('That PIN is not correct.')
  }

  function handleImportFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files?.length) return
    void Promise.all(
      [...files].map(async (file) => {
        const text = await file.text()
        return parseSubmissionExport(JSON.parse(text))
      }),
    )
      .then((parsed) => {
        const valid = parsed.filter((item): item is SubmissionExport => item !== null)
        if (!valid.length) {
          setError('No valid submission JSON files were found.')
          return
        }
        setImports((current) => mergeSubmissionExports(current, valid))
        seedStoredSubmissions(valid)
        setNotice(`Imported ${valid.length} submission file${valid.length === 1 ? '' : 's'}.`)
        setError('')
      })
      .catch(() => setError('Could not read one or more JSON files.'))
      .finally(() => {
        if (fileInputRef.current) fileInputRef.current.value = ''
      })
  }

  function loadBrowserSubmissions() {
    const stored = loadStoredSubmissions()
    if (!stored.length) {
      setNotice('No completed submissions saved in this browser yet.')
      return
    }
    setImports((current) => mergeSubmissionExports(current, stored))
    setNotice(`Loaded ${stored.length} submission${stored.length === 1 ? '' : 's'} from this browser.`)
  }

  function exportMergedJson() {
    downloadJson('seb-sans-submissions.json', imports)
  }

  function exportMergedCsv() {
    downloadCsv('seb-sans-submissions.csv', filteredSubmissions)
  }

  function copyRecommendedDefaults() {
    if (!summary) return
    const next = {
      displayDefaults: { ...ACTIVE_EXPERIMENT.displayDefaults },
      bodyDefaults: { ...ACTIVE_EXPERIMENT.bodyDefaults },
    }
    for (const role of ['display', 'body'] as const) {
      for (const control of ['weight', 'opsz', 'tracking', 'leading', 'xheight'] as const) {
        const value = summary.distributions[role][control]?.median
        if (value !== null && value !== undefined) {
          next[`${role}Defaults`][control] = value
        }
      }
    }
    void navigator.clipboard.writeText(JSON.stringify(next, null, 2))
    setNotice('Median-based defaults copied to clipboard. Paste into src/config/experiment.ts to start a new test.')
  }

  if (!authenticated) {
    return (
      <main className="centered-page admin-login">
        <p className="eyebrow">Research access</p>
        <h1>Seb Sans dashboard</h1>
        <form onSubmit={handleLogin}>
          <label>
            Admin PIN
            <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" autoFocus />
          </label>
          <button className="primary-button" type="submit">Open dashboard</button>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Link to="/survey">Return to survey</Link>
      </main>
    )
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Legibility research</p>
          <h1>Seb Sans dashboard</h1>
        </div>
        <div className="dashboard-actions">
          <Link className="secondary-button" to="/survey">Open survey</Link>
          <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}>
            Import JSON
          </button>
          <button className="secondary-button" type="button" onClick={loadBrowserSubmissions}>
            Load this browser
          </button>
          <button className="secondary-button" type="button" onClick={exportMergedJson} disabled={!imports.length}>
            Export JSON
          </button>
          <button className="secondary-button" type="button" onClick={exportMergedCsv} disabled={!filteredSubmissions.length}>
            Export CSV
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              logoutAdmin()
              setAuthenticated(false)
            }}
          >
            Sign out
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            multiple
            hidden
            onChange={handleImportFiles}
          />
        </div>
      </header>

      <div className="dashboard-filter">
        <label>
          Experiment
          <select value={experimentFilter} onChange={(event) => setExperimentFilter(event.target.value)}>
            <option value="">All experiments</option>
            {experimentVersions.map((version) => (
              <option value={version} key={version}>{version}</option>
            ))}
          </select>
        </label>
        <label>
          Copy
          <select value={copyFilter} onChange={(event) => setCopyFilter(event.target.value as typeof copyFilter)}>
            <option value="all">All copy</option>
            <option value="original">Original sample</option>
            <option value="edited">Edited sample</option>
          </select>
        </label>
        <label>
          Device
          <select value={deviceFilter} onChange={(event) => setDeviceFilter(event.target.value as typeof deviceFilter)}>
            <option value="all">All devices</option>
            <option value="mobile">Mobile</option>
            <option value="desktop">Desktop</option>
          </select>
        </label>
        <label>
          Date
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}>
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <span className="live-indicator"><i /> {imports.length} imported</span>
      </div>

      {error ? <div className="dashboard-alert error" role="alert">{error}</div> : null}
      {notice ? <div className="dashboard-alert">{notice}</div> : null}

      {!imports.length ? (
        <section className="dashboard-section">
          <p className="empty-state">
            Import submission JSON files downloaded from the survey, load this browser, or review archived production responses loaded automatically on sign-in.
          </p>
        </section>
      ) : null}

      {summary ? (
        <>
          <section className="metric-grid" aria-label="Survey metrics">
            <Metric label="Completed" value={summary.completed} />
            <Metric label="Imported" value={imports.length} />
            <Metric label="Completion" value={`${Math.round(summary.completionRate * 100)}%`} />
            <Metric
              label="Median time"
              value={summary.medianDurationSeconds ? `${Math.round(summary.medianDurationSeconds / 60)}m` : '—'}
            />
            <Metric label="Active test" value={summary.activeExperiment?.version ?? '—'} />
          </section>

          {summary.smallSample ? (
            <div className="sample-warning">
              Fewer than 10 completed responses. Treat suggested settings as directional, not conclusive.
            </div>
          ) : null}

          <section className="dashboard-section">
            <div className="section-heading">
              <div><p className="eyebrow">Chosen settings</p><h2>Where readers settle</h2></div>
              <button
                className="primary-button"
                type="button"
                disabled={!summary.recommendationsReady}
                onClick={copyRecommendedDefaults}
              >
                {summary.recommendationsReady
                  ? 'Copy medians for next test'
                  : `Needs ${summary.recommendationMinimum} responses`}
              </button>
            </div>
            <div className="role-distributions">
              {(['display', 'body'] as const).map((role) => (
                <div className="distribution-panel" key={role}>
                  <h3>{role}</h3>
                  {Object.entries(summary.distributions[role])
                    .filter(([name]) => name !== 'rating')
                    .map(([name, distribution]) => (
                      <DistributionRow key={name} label={CONTROL_LABELS[name]} distribution={distribution} />
                    ))}
                  <DistributionRow label="Legibility" distribution={summary.distributions[role].rating} />
                </div>
              ))}
            </div>
          </section>

          <Relationships submissions={filteredSubmissions} />
        </>
      ) : null}

      <section className="dashboard-section">
        <div className="section-heading">
          <div><p className="eyebrow">Qualitative feedback</p><h2>What people are saying</h2></div>
          <input
            className="search-input"
            type="search"
            placeholder="Search responses"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="response-list">
          {filteredSubmissions.length ? filteredSubmissions.map((item) => (
            <article className="response-card" key={item.id}>
              <div className="response-meta">
                <strong>{item.completionCode}</strong>
                <span>{item.experimentVersion}</span>
                <span>{new Date(item.completedAt).toLocaleString()}</span>
                <span>{(item.viewport.width ?? 1000) < 700 ? 'Mobile' : 'Desktop'} · {item.browserFamily ?? 'Unknown'}</span>
                <span>Overall {item.feedback.overallRating}/7</span>
              </div>
              <div className="response-copy">
                <div><small>Works well</small><p>{item.feedback.likes}</p></div>
                <div><small>Would change</small><p>{item.feedback.dislikes}</p></div>
                <div><small>Feels like</small><p>{item.feedback.feelings || '—'}</p></div>
              </div>
              <details>
                <summary>Final settings</summary>
                <pre>{JSON.stringify({ display: item.display.final, body: item.body.final }, null, 2)}</pre>
                <p>{item.events.length} recorded tuning changes</p>
                <ol className="tuning-timeline">
                  {item.events.slice(-12).map((event, index) => (
                    <li key={`${event.elapsed_ms}-${index}`}>
                      <span>{Math.round(event.elapsed_ms / 1000)}s</span>
                      <strong>{event.role} {event.control}</strong>
                      <span>{event.value}</span>
                    </li>
                  ))}
                </ol>
              </details>
            </article>
          )) : <p className="empty-state">No matching completed responses yet.</p>}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div><p className="eyebrow">Experiment config</p><h2>Static test definition</h2></div>
        </div>
        <div className="experiment-list">
          <article>
            <div>
              <strong>{ACTIVE_EXPERIMENT.version}</strong>
              <span className="status active">{ACTIVE_EXPERIMENT.status}</span>
            </div>
            <p>Display {formatConfig(ACTIVE_EXPERIMENT.displayDefaults)}</p>
            <p>Body {formatConfig(ACTIVE_EXPERIMENT.bodyDefaults)}</p>
            <p className="muted">Edit `src/config/experiment.ts` and redeploy to change defaults for new participants.</p>
          </article>
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong></article>
}

function DistributionRow({
  label,
  distribution,
}: {
  label: string
  distribution: { count: number; median: number | null; q1: number | null; q3: number | null; values?: number[] }
}) {
  const values = distribution.values ?? []
  const minimum = values.length ? Math.min(...values) : 0
  const maximum = values.length ? Math.max(...values) : 1
  return (
    <div className="distribution-row">
      <span>{label}</span>
      <div className="range-line">
        <i />
        {values.slice(0, 40).map((value, index) => (
          <b
            key={`${value}-${index}`}
            style={{ left: `${maximum === minimum ? 50 : ((value - minimum) / (maximum - minimum)) * 100}%` }}
          />
        ))}
      </div>
      <strong>{distribution.median === null ? '—' : Number(distribution.median.toFixed(3))}</strong>
      <small>{distribution.count ? `${distribution.q1}–${distribution.q3}` : 'No data'}</small>
    </div>
  )
}

function Relationships({ submissions }: { submissions: Submission[] }) {
  const displayData = submissions.map((item) => ({
    weight: item.display.final.weight,
    opsz: item.display.final.opsz,
    leading: item.display.final.leading,
    xheight: item.display.final.xheight,
    rating: item.display.legibilityRating,
  }))
  const bodyData = submissions.map((item) => ({
    weight: item.body.final.weight,
    opsz: item.body.final.opsz,
    leading: item.body.final.leading,
    xheight: item.body.final.xheight,
    rating: item.body.legibilityRating,
  }))
  return (
    <section className="dashboard-section">
      <div className="section-heading"><div><p className="eyebrow">Relationships</p><h2>Settings in context</h2></div></div>
      <div className="chart-grid">
        <Chart title="Display optical × weight" data={displayData} x="opsz" y="weight" />
        <Chart title="Body leading × legibility" data={bodyData} x="leading" y="rating" />
        <Chart title="Body X-height × legibility" data={bodyData} x="xheight" y="rating" />
      </div>
    </section>
  )
}

function Chart({ title, data, x, y }: { title: string; data: object[]; x: string; y: string }) {
  return (
    <article className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#e3e3e0" />
          <XAxis type="number" dataKey={x} name={x} tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey={y} name={y} tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill="#1d2bff" />
        </ScatterChart>
      </ResponsiveContainer>
    </article>
  )
}

function formatConfig(config: FontConfig) {
  return `${config.size}px · ${config.weight}w · ${config.opsz}opsz · ${config.xheight}XHGT`
}
