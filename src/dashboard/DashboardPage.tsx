import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { ApiError, api } from '../lib/api'
import type { ControlName, Experiment, FontConfig, Submission, Summary } from '../types'

const CONTROL_LABELS: Record<string, string> = {
  weight: 'Weight',
  opsz: 'Optical',
  tracking: 'Tracking',
  leading: 'Leading',
  xheight: 'X-height',
}

export default function DashboardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [experimentFilter, setExperimentFilter] = useState<number | undefined>()
  const [search, setSearch] = useState('')
  const [copyFilter, setCopyFilter] = useState<'all' | 'original' | 'edited'>('all')
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'desktop'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | '7' | '30'>('all')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [summaryData, submissionData, experimentData] = await Promise.all([
        api.summary(experimentFilter),
        api.submissions(experimentFilter),
        api.experiments(),
      ])
      setSummary(summaryData)
      setSubmissions(submissionData.items)
      setExperiments(experimentData.items)
      setError('')
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setAuthenticated(false)
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Dashboard could not load.')
      }
    }
  }, [experimentFilter])

  useEffect(() => {
    api.adminMe()
      .then(() => {
        setAuthenticated(true)
        void loadData()
      })
      .catch(() => setAuthenticated(false))
  }, [loadData])

  useEffect(() => {
    if (!authenticated) return
    const events = new EventSource('/api/admin/events', { withCredentials: true })
    events.addEventListener('update', () => void loadData())
    return () => events.close()
  }, [authenticated, loadData])

  async function login(event: React.FormEvent) {
    event.preventDefault()
    try {
      await api.adminLogin(pin)
      setAuthenticated(true)
      setError('')
      await loadData()
    } catch {
      setError('That PIN is not correct.')
    }
  }

  async function createFromMedians() {
    if (!summary?.activeExperiment) return
    const source = summary.activeExperiment
    const derive = (role: 'display' | 'body', defaults: FontConfig): FontConfig => {
      const next = { ...defaults }
      for (const control of Object.keys(CONTROL_LABELS) as ControlName[]) {
        const value = summary.distributions[role][control]?.median
        if (value !== null && value !== undefined) next[control] = value
      }
      return next
    }
    try {
      const created = await api.createExperiment({
        display_defaults: derive('display', source.displayDefaults),
        body_defaults: derive('body', source.bodyDefaults),
        display_sample: source.displaySample,
        body_sample: source.bodySample,
      })
      setNotice(`${created.version} created as a draft. Review it below before activation.`)
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create experiment.')
    }
  }

  async function activate(id: number) {
    try {
      const activated = await api.activateExperiment(id)
      setNotice(`${activated.version} is active for future participants.`)
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not activate experiment.')
    }
  }

  async function backup() {
    try {
      const result = await api.backup()
      setNotice(`Backup saved to ${result.path}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Backup failed.')
    }
  }

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cutoff =
      dateFilter === 'all'
        ? null
        : Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000
    return submissions.filter((item) => {
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
  }, [copyFilter, dateFilter, deviceFilter, search, submissions])

  if (authenticated === null) return <main className="centered-page">Opening dashboard…</main>
  if (!authenticated) {
    return (
      <main className="centered-page admin-login">
        <p className="eyebrow">Research access</p>
        <h1>Seb Sans dashboard</h1>
        <form onSubmit={(event) => void login(event)}>
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
          <p className="eyebrow">Live legibility research</p>
          <h1>Seb Sans dashboard</h1>
        </div>
        <div className="dashboard-actions">
          <Link className="secondary-button" to="/survey">Open survey</Link>
          <a className="secondary-button" href="/api/admin/export.csv">CSV</a>
          <a className="secondary-button" href="/api/admin/export.json">JSON</a>
          <a className="secondary-button" href="/api/admin/recommendations.json">Recommendations</a>
          <button className="secondary-button" type="button" onClick={() => void backup()}>Back up</button>
        </div>
      </header>

      <div className="dashboard-filter">
        <label>
          Experiment
          <select
            value={experimentFilter ?? ''}
            onChange={(event) => setExperimentFilter(event.target.value ? Number(event.target.value) : undefined)}
          >
            <option value="">All experiments</option>
            {experiments.map((experiment) => (
              <option value={experiment.id} key={experiment.id}>{experiment.version} · {experiment.status}</option>
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
        <span className="live-indicator"><i /> Live</span>
      </div>

      {error ? <div className="dashboard-alert error" role="alert">{error}</div> : null}
      {notice ? <div className="dashboard-alert">{notice}</div> : null}

      {summary ? (
        <>
          <section className="metric-grid" aria-label="Survey metrics">
            <Metric label="Completed" value={summary.completed} />
            <Metric label="Active now" value={summary.activeSessions} />
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
                onClick={() => void createFromMedians()}
              >
                {summary.recommendationsReady
                  ? 'Create next test from medians'
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

          <Relationships submissions={submissions} />
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
          <div><p className="eyebrow">Experiment versions</p><h2>Future sessions only</h2></div>
        </div>
        <div className="experiment-list">
          {experiments.map((experiment) => (
            <article key={experiment.id}>
              <div>
                <strong>{experiment.version}</strong>
                <span className={`status ${experiment.status}`}>{experiment.status}</span>
              </div>
              <p>Display {formatConfig(experiment.displayDefaults)}</p>
              <p>Body {formatConfig(experiment.bodyDefaults)}</p>
              {experiment.status !== 'active' ? (
                <button className="secondary-button" type="button" onClick={() => void activate(experiment.id)}>
                  Activate for new sessions
                </button>
              ) : null}
            </article>
          ))}
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
