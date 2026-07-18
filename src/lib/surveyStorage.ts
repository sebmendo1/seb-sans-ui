import { ACTIVE_EXPERIMENT } from '../config/experiment'
import type {
  Experiment,
  FontConfig,
  Submission,
  SubmissionExport,
  SurveyState,
  TuningEvent,
} from '../types'

export const SURVEY_STORAGE_KEY = 'seb-sans-survey-session-v1'
export const SUBMISSIONS_STORAGE_KEY = 'seb-sans-completed-submissions-v1'

export type SavedSurveySession = {
  step: number
  state: SurveyState
  events: TuningEvent[]
  startedAt: string
  viewport: { width: number; height: number }
  browserFamily: string
}

export function browserFamily() {
  const agent = navigator.userAgent
  if (agent.includes('Firefox')) return 'Firefox'
  if (agent.includes('Edg')) return 'Edge'
  if (agent.includes('Chrome')) return 'Chrome'
  if (agent.includes('Safari')) return 'Safari'
  return 'Other'
}

export function initialSurveyState(experiment: Experiment): SurveyState {
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

export function loadSavedSession(): SavedSurveySession | null {
  try {
    const raw = localStorage.getItem(SURVEY_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedSurveySession) : null
  } catch {
    localStorage.removeItem(SURVEY_STORAGE_KEY)
    return null
  }
}

export function saveSession(session: SavedSurveySession) {
  localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(session))
}

export function clearSavedSession() {
  localStorage.removeItem(SURVEY_STORAGE_KEY)
}

export function createCompletionCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(3))
  return `SEB-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function buildSubmissionExport(
  session: SavedSurveySession,
  completionCode: string,
  experiment: Experiment = ACTIVE_EXPERIMENT,
): SubmissionExport {
  const submittedAt = new Date().toISOString()
  const durationSeconds = Math.max(
    0,
    (Date.parse(submittedAt) - Date.parse(session.startedAt)) / 1000,
  )
  return {
    completionCode,
    submittedAt,
    experimentVersion: experiment.version,
    viewport: session.viewport,
    browserFamily: session.browserFamily,
    startedAt: session.startedAt,
    durationSeconds,
    state: session.state,
    tuningEvents: session.events,
    displayDefaults: experiment.displayDefaults,
    bodyDefaults: experiment.bodyDefaults,
    displaySample: experiment.displaySample,
    bodySample: experiment.bodySample,
  }
}

export function downloadSubmissionExport(payload: SubmissionExport) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `submission-${payload.completionCode}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function loadStoredSubmissions(): SubmissionExport[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SubmissionExport[]) : []
  } catch {
    localStorage.removeItem(SUBMISSIONS_STORAGE_KEY)
    return []
  }
}

export function mergeSubmissionExports(
  current: SubmissionExport[],
  incoming: SubmissionExport[],
): SubmissionExport[] {
  const seen = new Set(current.map((item) => item.completionCode))
  const merged = [...current]
  for (const item of incoming) {
    if (seen.has(item.completionCode)) continue
    seen.add(item.completionCode)
    merged.unshift(item)
  }
  return merged
}

export function saveStoredSubmissions(submissions: SubmissionExport[]) {
  localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions.slice(0, 200)))
}

export function seedStoredSubmissions(incoming: SubmissionExport[]) {
  const merged = mergeSubmissionExports(loadStoredSubmissions(), incoming)
  saveStoredSubmissions(merged)
  return merged
}

export async function loadSeedSubmissions(): Promise<SubmissionExport[]> {
  try {
    const response = await fetch('/data/submissions.json', { cache: 'no-store' })
    if (!response.ok) return []
    const raw = await response.json()
    if (!Array.isArray(raw)) return []
    return raw
      .map((item) => parseSubmissionExport(item))
      .filter((item): item is SubmissionExport => item !== null)
  } catch {
    return []
  }
}

export function appendStoredSubmission(payload: SubmissionExport) {
  saveStoredSubmissions(mergeSubmissionExports(loadStoredSubmissions(), [payload]))
}

export function exportToSubmission(payload: SubmissionExport, index: number): Submission {
  return {
    id: `local-${index}-${payload.completionCode}`,
    completionCode: payload.completionCode,
    experimentVersion: payload.experimentVersion,
    completedAt: payload.submittedAt,
    durationSeconds: payload.durationSeconds,
    browserFamily: payload.browserFamily,
    viewport: payload.viewport,
    display: {
      initial: payload.displayDefaults,
      final: payload.state.display,
      text: payload.state.display_text,
      sampleEdited: payload.state.display_text.trim() !== payload.displaySample.trim(),
      legibilityRating: payload.state.display_rating,
    },
    body: {
      initial: payload.bodyDefaults,
      final: payload.state.body,
      text: payload.state.body_text,
      sampleEdited: payload.state.body_text.trim() !== payload.bodySample.trim(),
      legibilityRating: payload.state.body_rating,
    },
    feedback: {
      likes: payload.state.likes,
      dislikes: payload.state.dislikes,
      overallRating: payload.state.overall_rating,
      feelings: payload.state.feelings,
    },
    events: payload.tuningEvents,
  }
}

export function parseSubmissionExport(raw: unknown): SubmissionExport | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Partial<SubmissionExport>
  if (
    typeof candidate.completionCode !== 'string' ||
    typeof candidate.submittedAt !== 'string' ||
    typeof candidate.experimentVersion !== 'string' ||
    !candidate.state ||
    !Array.isArray(candidate.tuningEvents)
  ) {
    return null
  }
  return candidate as SubmissionExport
}

export function submissionExportsToRows(exports: SubmissionExport[]): Submission[] {
  return exports.map((item, index) => exportToSubmission(item, index))
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, submissions: Submission[]) {
  const headers = [
    'completionCode',
    'experimentVersion',
    'completedAt',
    'browserFamily',
    'viewportWidth',
    'overallRating',
    'likes',
    'dislikes',
    'feelings',
  ]
  const rows = submissions.map((item) => [
    item.completionCode,
    item.experimentVersion,
    item.completedAt,
    item.browserFamily ?? '',
    String(item.viewport.width ?? ''),
    String(item.feedback.overallRating),
    item.feedback.likes.replaceAll('"', '""'),
    item.feedback.dislikes.replaceAll('"', '""'),
    item.feedback.feelings.replaceAll('"', '""'),
  ])
  const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
