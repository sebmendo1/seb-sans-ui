import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ACTIVE_EXPERIMENT } from '../config/experiment'
import { FontTuner } from '../components/FontTuner'
import { Rating } from '../components/Rating'
import {
  appendStoredSubmission,
  browserFamily,
  buildSubmissionExport,
  clearSavedSession,
  createCompletionCode,
  downloadSubmissionExport,
  initialSurveyState,
  loadSavedSession,
  saveSession,
  type SavedSurveySession,
} from '../lib/surveyStorage'
import type { ControlName, FontConfig, Role, SurveyState, TuningEvent } from '../types'

const TOTAL_STEPS = 5

export function SurveyPage() {
  const experiment = ACTIVE_EXPERIMENT
  const [state, setState] = useState<SurveyState | null>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completionCode, setCompletionCode] = useState('')
  const [sessionActive, setSessionActive] = useState(false)
  const eventsRef = useRef<TuningEvent[]>([])
  const startedAtRef = useRef(new Date().toISOString())
  const viewportRef = useRef({ width: window.innerWidth, height: window.innerHeight })
  const browserRef = useRef(browserFamily())
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const saved = loadSavedSession()
    if (saved) {
      setState(saved.state)
      setStep(saved.step)
      eventsRef.current = saved.events
      startedAtRef.current = saved.startedAt
      viewportRef.current = saved.viewport
      browserRef.current = saved.browserFamily
      setSessionActive(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!sessionActive || !state || completionCode || step === 1) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      const payload: SavedSurveySession = {
        step,
        state,
        events: eventsRef.current,
        startedAt: startedAtRef.current,
        viewport: viewportRef.current,
        browserFamily: browserRef.current,
      }
      saveSession(payload)
    }, 1000)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [sessionActive, state, step, completionCode])

  function start() {
    setError('')
    setState(initialSurveyState(experiment))
    startedAtRef.current = new Date().toISOString()
    viewportRef.current = { width: window.innerWidth, height: window.innerHeight }
    browserRef.current = browserFamily()
    eventsRef.current = []
    setSessionActive(true)
    setStep(2)
    saveSession({
      step: 2,
      state: initialSurveyState(experiment),
      events: [],
      startedAt: startedAtRef.current,
      viewport: viewportRef.current,
      browserFamily: browserRef.current,
    })
  }

  function changeConfig(role: Role, config: FontConfig, control: ControlName, value: number) {
    setState((current) => (current ? { ...current, [role]: config } : current))
    eventsRef.current.push({
      role,
      control,
      value,
      elapsed_ms: Date.now() - Date.parse(startedAtRef.current),
    })
  }

  function resetConfig(role: Role, defaults: FontConfig) {
    setState((current) => (current ? { ...current, [role]: defaults } : current))
    const elapsed_ms = Date.now() - Date.parse(startedAtRef.current)
    for (const control of ['weight', 'opsz', 'tracking', 'leading', 'xheight'] as ControlName[]) {
      eventsRef.current.push({ role, control, value: defaults[control], elapsed_ms })
    }
  }

  function submit() {
    if (!state) return
    if (!state.likes.trim() || !state.dislikes.trim()) {
      setError('Please share what works and what you would change before submitting.')
      return
    }
    setLoading(true)
    setError('')
    const session: SavedSurveySession = {
      step: 5,
      state,
      events: eventsRef.current,
      startedAt: startedAtRef.current,
      viewport: viewportRef.current,
      browserFamily: browserRef.current,
    }
    const code = createCompletionCode()
    const payload = buildSubmissionExport(session, code, experiment)
    appendStoredSubmission(payload)
    downloadSubmissionExport(payload)
    clearSavedSession()
    setCompletionCode(code)
    setSessionActive(false)
    setLoading(false)
  }

  if (loading && !state && !completionCode) {
    return <main className="centered-page">Loading the test…</main>
  }

  if (completionCode) {
    return (
      <main className="centered-page completion-page">
        <p className="eyebrow">Complete</p>
        <h1>Thank you for shaping Seb Sans.</h1>
        <p>Your anonymous completion code is</p>
        <strong className="completion-code">{completionCode}</strong>
        <p className="muted">
          A JSON file with your response was downloaded. Share that file with the researcher if asked.
        </p>
      </main>
    )
  }

  return (
    <main className="survey-page">
      <style>{`@font-face{font-family:"Seb Sans Survey";src:url("${experiment.font.url}") format("woff2");font-weight:100 900;font-display:swap}`}</style>
      <header className="survey-header">
        <Link to="/survey" className="wordmark">Seb Sans</Link>
        <div className="progress-wrap">
          <span>{step} / {TOTAL_STEPS}</span>
          <div
            className="progress"
            role="progressbar"
            aria-label="Survey progress"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={step}
          >
            <i style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>
        <span className="save-state" aria-live="polite">{sessionActive ? 'Saved locally' : ''}</span>
      </header>

      <section className="survey-stage">
        {step === 1 ? (
          <div className="welcome step-content">
            <p className="eyebrow">A five-minute reading test</p>
            <h1>Help make Seb Sans easier to read.</h1>
            <p className="lede">
              You’ll tune one display sample and one body sample until each feels right to you.
              There are no correct settings—your perception is the point.
            </p>
            <div className="privacy-note">
              <strong>Anonymous by design.</strong>
              <span>We record your settings and written feedback in a local file, not your name, email, or IP address.</span>
            </div>
            <button className="primary-button" type="button" onClick={start}>
              Start the test <span aria-hidden="true">→</span>
            </button>
            <Link className="admin-link" to="/dashboard">Research dashboard</Link>
          </div>
        ) : null}

        {step === 2 && state ? (
          <div className="step-content wide">
            <p className="eyebrow">01 — Display text</p>
            <h1>Make the headline feel clear.</h1>
            <p className="step-intro">Move each control until the display text feels most legible to you.</p>
            <FontTuner
              role="display"
              config={state.display}
              defaults={experiment.displayDefaults}
              text={state.display_text}
              defaultText={experiment.displaySample}
              rating={state.display_rating}
              onConfigChange={(config, control, value) => changeConfig('display', config, control, value)}
              onResetSettings={(defaults) => resetConfig('display', defaults)}
              onTextChange={(display_text) => setState({ ...state, display_text })}
              onRatingChange={(display_rating) => setState({ ...state, display_rating })}
            />
          </div>
        ) : null}

        {step === 3 && state ? (
          <div className="step-content wide">
            <p className="eyebrow">02 — Body text</p>
            <h1>Settle into a reading rhythm.</h1>
            <p className="step-intro">Tune the paragraph for sustained, comfortable reading.</p>
            <FontTuner
              role="body"
              config={state.body}
              defaults={experiment.bodyDefaults}
              text={state.body_text}
              defaultText={experiment.bodySample}
              rating={state.body_rating}
              onConfigChange={(config, control, value) => changeConfig('body', config, control, value)}
              onResetSettings={(defaults) => resetConfig('body', defaults)}
              onTextChange={(body_text) => setState({ ...state, body_text })}
              onRatingChange={(body_rating) => setState({ ...state, body_rating })}
            />
          </div>
        ) : null}

        {step === 4 && state ? (
          <div className="step-content wide feedback-step">
            <p className="eyebrow">03 — Your final proof</p>
            <h1>Look at the two roles together.</h1>
            <CombinedProof state={state} />
            <div className="feedback-grid">
              <label>
                <span>What works well?</span>
                <textarea value={state.likes} onChange={(event) => setState({ ...state, likes: event.target.value })} rows={5} />
              </label>
              <label>
                <span>What would you change?</span>
                <textarea value={state.dislikes} onChange={(event) => setState({ ...state, dislikes: event.target.value })} rows={5} />
              </label>
            </div>
            <Rating
              label="Overall, how readable does Seb Sans feel?"
              value={state.overall_rating}
              onChange={(overall_rating) => setState({ ...state, overall_rating })}
            />
          </div>
        ) : null}

        {step === 5 && state ? (
          <div className="step-content final-step">
            <p className="eyebrow">04 — Last impression</p>
            <h1>What does this typeface make you feel?</h1>
            <p className="step-intro">A word, a mood, a comparison—anything is useful.</p>
            <textarea
              className="open-response"
              value={state.feelings}
              onChange={(event) => setState({ ...state, feelings: event.target.value })}
              rows={7}
              placeholder="Seb Sans feels…"
              autoFocus
            />
            <SettingsReview state={state} />
          </div>
        ) : null}
      </section>

      {step > 1 ? (
        <footer className="survey-nav">
          <button className="secondary-button" type="button" onClick={() => setStep((value) => Math.max(1, value - 1))}>
            Back
          </button>
          {step < 5 ? (
            <button
              className="primary-button"
              type="button"
              disabled={step === 4 && (!state?.likes.trim() || !state?.dislikes.trim())}
              onClick={() => setStep((value) => Math.min(5, value + 1))}
            >
              Continue <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={submit} disabled={loading}>
              {loading ? 'Submitting…' : 'Submit feedback'} <span aria-hidden="true">✓</span>
            </button>
          )}
        </footer>
      ) : null}
      {error ? <div className="error-toast" role="alert">{error}</div> : null}
    </main>
  )
}

function fontStyle(config: FontConfig) {
  return {
    fontFamily: '"Seb Sans Survey", sans-serif',
    fontSize: `${config.size}px`,
    fontVariationSettings: `'wght' ${config.weight}, 'opsz' ${config.opsz}, 'XHGT' ${config.xheight}`,
    letterSpacing: `${config.tracking}em`,
    lineHeight: config.leading,
  }
}

function CombinedProof({ state }: { state: SurveyState }) {
  return (
    <div className="combined-proof">
      <div style={fontStyle(state.display)}>{state.display_text}</div>
      <p style={fontStyle(state.body)}>{state.body_text}</p>
    </div>
  )
}

function SettingsReview({ state }: { state: SurveyState }) {
  const labels: [keyof FontConfig, string][] = [
    ['size', 'Size'],
    ['weight', 'Weight'],
    ['opsz', 'Optical'],
    ['tracking', 'Tracking'],
    ['leading', 'Leading'],
    ['xheight', 'X-height'],
  ]
  return (
    <div className="settings-review">
      {(['display', 'body'] as const).map((role) => (
        <div key={role}>
          <strong>{role}</strong>
          <dl>
            {labels.map(([key, label]) => (
              <div key={key}><dt>{label}</dt><dd>{state[role][key]}</dd></div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
