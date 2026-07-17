import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontTuner } from '../components/FontTuner'
import { Rating } from '../components/Rating'
import { ApiError, api } from '../lib/api'
import type {
  ControlName,
  Experiment,
  FontConfig,
  Role,
  SessionCredentials,
  SurveyState,
  TuningEvent,
} from '../types'

const STORAGE_KEY = 'seb-sans-survey-session-v1'
const TOTAL_STEPS = 5

function initialState(experiment: Experiment): SurveyState {
  return {
    display: { ...experiment.displayDefaults },
    body: { ...experiment.bodyDefaults },
    display_text: experiment.displaySample,
    body_text: experiment.bodySample,
    display_rating: 4,
    body_rating: 4,
    likes: '',
    dislikes: '',
    overall_rating: 4,
    feelings: '',
  }
}

function parseCredentials(): SessionCredentials | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as SessionCredentials) : null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function browserFamily() {
  const agent = navigator.userAgent
  if (agent.includes('Firefox')) return 'Firefox'
  if (agent.includes('Edg')) return 'Edge'
  if (agent.includes('Chrome')) return 'Chrome'
  if (agent.includes('Safari')) return 'Safari'
  return 'Other'
}

export function SurveyPage() {
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [credentials, setCredentials] = useState<SessionCredentials | null>(null)
  const [state, setState] = useState<SurveyState | null>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completionCode, setCompletionCode] = useState('')
  const [saving, setSaving] = useState(false)
  const revisionRef = useRef(0)
  const eventsRef = useRef<TuningEvent[]>([])
  const startedAtRef = useRef(Date.now())
  const saveTimerRef = useRef<number | null>(null)
  const saveChainRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let active = true
    async function initialize() {
      const saved = parseCredentials()
      try {
        if (saved) {
          const restored = await api.getSession(saved)
          if (!active) return
          setCredentials(saved)
          setExperiment(restored.experiment)
          revisionRef.current = restored.revision
          setStep(restored.currentStep)
          setState(
            Object.keys(restored.state).length
              ? (restored.state as SurveyState)
              : initialState(restored.experiment),
          )
          if (restored.completed && restored.completionCode) {
            setCompletionCode(restored.completionCode)
          }
        } else {
          const config = await api.getConfig()
          if (active) setExperiment(config)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        const config = await api.getConfig()
        if (active) setExperiment(config)
      } finally {
        if (active) setLoading(false)
      }
    }
    void initialize()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!credentials || !state || completionCode || step === 1) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      const events = eventsRef.current.splice(0)
      saveChainRef.current = saveChainRef.current.then(async () => {
        setSaving(true)
        try {
          const response = await api.saveDraft(credentials, {
            revision: revisionRef.current,
            current_step: step,
            state,
            events,
          })
          revisionRef.current = response.revision
          setError('')
        } catch (requestError) {
          eventsRef.current.unshift(...events)
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : 'Could not save your progress.',
          )
        } finally {
          setSaving(false)
        }
      })
    }, 650)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [credentials, state, step, completionCode])

  async function start() {
    setLoading(true)
    setError('')
    try {
      const response = await api.createSession({
        viewport: { width: window.innerWidth, height: window.innerHeight },
        browser_family: browserFamily(),
        variable_font_supported: CSS.supports('font-variation-settings', '"wght" 400'),
      })
      const nextCredentials = {
        sessionId: response.sessionId,
        sessionToken: response.sessionToken,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCredentials))
      setCredentials(nextCredentials)
      setExperiment(response.experiment)
      setState(initialState(response.experiment))
      revisionRef.current = response.revision
      startedAtRef.current = Date.now()
      setStep(2)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not start the survey.')
    } finally {
      setLoading(false)
    }
  }

  function changeConfig(role: Role, config: FontConfig, control: ControlName, value: number) {
    setState((current) => (current ? { ...current, [role]: config } : current))
    eventsRef.current.push({
      role,
      control,
      value,
      elapsed_ms: Date.now() - startedAtRef.current,
    })
  }

  async function submit() {
    if (!credentials || !state) return
    if (!state.likes.trim() || !state.dislikes.trim()) {
      setError('Please share what works and what you would change before submitting.')
      return
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    setLoading(true)
    setError('')
    try {
      await saveChainRef.current
      const response = await api.submit(credentials, {
        revision: revisionRef.current,
        state,
        events: eventsRef.current.splice(0),
      })
      setCompletionCode(response.completionCode)
      localStorage.removeItem(STORAGE_KEY)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not submit your response.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !experiment) {
    return <main className="centered-page">Loading the test…</main>
  }

  if (completionCode) {
    return (
      <main className="centered-page completion-page">
        <p className="eyebrow">Complete</p>
        <h1>Thank you for shaping Seb Sans.</h1>
        <p>Your anonymous completion code is</p>
        <strong className="completion-code">{completionCode}</strong>
        <p className="muted">Your response has been saved. You can close this page.</p>
      </main>
    )
  }

  return (
    <main className="survey-page">
      {experiment ? (
        <style>{`@font-face{font-family:"Seb Sans Survey";src:url("${experiment.font.url}") format("woff2");font-weight:100 900;font-display:swap}`}</style>
      ) : null}
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
        <span className="save-state" aria-live="polite">{saving ? 'Saving…' : credentials ? 'Saved locally' : ''}</span>
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
              <span>We record your settings and written feedback, not your name, email, or IP address.</span>
            </div>
            <button className="primary-button" type="button" onClick={() => void start()} disabled={loading}>
              {loading ? 'Starting…' : 'Start the test'} <span aria-hidden="true">→</span>
            </button>
            <Link className="admin-link" to="/dashboard">Research dashboard</Link>
          </div>
        ) : null}

        {step === 2 && state && experiment ? (
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
              onTextChange={(display_text) => setState({ ...state, display_text })}
              onRatingChange={(display_rating) => setState({ ...state, display_rating })}
            />
          </div>
        ) : null}

        {step === 3 && state && experiment ? (
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
            <button className="primary-button" type="button" onClick={() => void submit()} disabled={loading}>
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
